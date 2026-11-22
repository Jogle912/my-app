import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { fixedClock, plan, SimulatedClock, splitMinutes } from "../index";
import type { ExistingSession, PlanResult } from "../types";
import { assertHardConstraints, minutesPerLocalDay } from "./invariants";
import { input, item, local, MONDAY_8AM, prefs, ZONE } from "./fixtures";

const clock = fixedClock(MONDAY_8AM);
const total = (r: PlanResult, itemId?: string) =>
  r.sessions.filter((s) => !itemId || s.itemId === itemId).reduce((a, s) => a + s.minutes, 0);
const asExisting = (r: PlanResult): ExistingSession[] =>
  r.sessions.map((s) => ({ id: s.key, itemId: s.itemId, start: s.start, end: s.end, locked: s.locked }));

describe("splitMinutes", () => {
  it("splits into near-equal chunks no longer than the preferred length", () => {
    expect(splitMinutes(130, 50, 25)).toEqual([45, 45, 40]);
    expect(splitMinutes(40, 50, 25)).toEqual([40]);
    expect(splitMinutes(0, 50, 25)).toEqual([]);
  });
  it("never produces a chunk shorter than the minimum unless the whole task is that small", () => {
    for (let t = 30; t <= 600; t += 5) for (const c of splitMinutes(t, 50, 25)) expect(c).toBeGreaterThanOrEqual(25);
    expect(splitMinutes(10, 50, 25)).toEqual([10]);
  });
});

describe("basic planning", () => {
  it("schedules all work before the buffered deadline without breaking hard constraints", () => {
    const i = input({ items: [item({ id: "lab", estimatedMinutes: 150 })] });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    expect(total(r, "lab")).toBe(150);
    expect(r.shortfalls).toEqual([]);
    const bufferedDeadline = Date.parse(i.items[0].dueAt) - 12 * 3600_000;
    for (const s of r.sessions) expect(Date.parse(s.end)).toBeLessThanOrEqual(bufferedDeadline);
  });

  it("is deterministic for identical input and clock", () => {
    const i = input({
      items: [item({ id: "a", estimatedMinutes: 200 }), item({ id: "b", courseId: "calc", estimatedMinutes: 90, dueAt: local("2026-11-25T09:00") })],
    });
    expect(plan(i, clock)).toEqual(plan(structuredClone(i), clock));
  });

  it("respects the daily maximum", () => {
    const i = input({
      preferences: prefs({ maxStudyMinutesPerDay: 90 }),
      items: [item({ id: "big", estimatedMinutes: 400, dueAt: local("2026-12-04T23:59") })],
    });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    for (const mins of minutesPerLocalDay(r, ZONE).values()) expect(mins).toBeLessThanOrEqual(90);
  });

  it("subtracts already-completed work", () => {
    const r = plan(input({ items: [item({ id: "lab", estimatedMinutes: 150, completedMinutes: 100 })] }), clock);
    expect(total(r, "lab")).toBe(50);
  });

  it("schedules milestones in order", () => {
    const i = input({
      items: [
        item({
          id: "essay",
          dueAt: local("2026-12-04T23:59"),
          milestones: [
            { id: "outline", title: "Outline", estimatedMinutes: 40 },
            { id: "draft", title: "Draft", estimatedMinutes: 120 },
            { id: "edit", title: "Edit", estimatedMinutes: 45 },
          ],
        }),
      ],
    });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    const order = r.sessions.map((s) => s.milestoneId);
    expect(order.indexOf("outline")).toBeLessThan(order.indexOf("draft"));
    expect(order.lastIndexOf("draft")).toBeLessThan(order.indexOf("edit"));
  });

  it("warns about overdue items and items beyond the horizon instead of scheduling them", () => {
    const r = plan(
      input({ items: [item({ id: "late", dueAt: local("2026-11-22T23:59") }), item({ id: "far", dueAt: local("2027-03-01T12:00") })] }),
      clock,
    );
    expect(r.sessions).toEqual([]);
    expect(r.warnings.map((w) => w.code).sort()).toEqual(["DEFERRED_BEYOND_HORIZON", "OVERDUE"]);
  });

  it("rejects invalid configuration", () => {
    expect(() => plan(input({ timeZone: "Mars/Olympus" }), clock)).toThrow(/time zone/);
    expect(() => plan(input({ preferences: prefs({ minSessionMinutes: 90 }) }), clock)).toThrow();
  });
});

describe("required scenarios", () => {
  it("two assignments due at nearly the same time are both fully scheduled", () => {
    const i = input({
      items: [
        item({ id: "bio-hw", estimatedMinutes: 150, dueAt: local("2026-11-26T23:59") }),
        item({ id: "calc-hw", courseId: "calc", estimatedMinutes: 150, dueAt: local("2026-11-26T23:00") }),
      ],
    });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    expect(total(r, "bio-hw")).toBe(150);
    expect(total(r, "calc-hw")).toBe(150);
    expect(r.shortfalls).toEqual([]);
  });

  it("a student with no available study time gets an explicit shortfall and no sessions", () => {
    const i = input({ availability: [], items: [item({ id: "lab", estimatedMinutes: 120 })] });
    const r = plan(i, clock);
    expect(r.sessions).toEqual([]);
    expect(r.capacity.availableMinutes).toBe(0);
    expect(r.shortfalls).toHaveLength(1);
    expect(r.shortfalls[0]).toMatchObject({ itemId: "lab", unscheduledMinutes: 120, remainingMinutes: 120 });
    expect(r.shortfalls[0].explanation).toMatch(/Not enough free time/);
  });

  it("limited time before an exam: never claims it all fits, and nothing lands after the exam", () => {
    const exam = local("2026-11-25T09:00"); // Wednesday morning
    const i = input({
      availability: [{ id: "eve", days: [1, 2], start: "19:00", end: "21:00" }],
      items: [item({ id: "midterm", courseId: "calc", kind: "exam", dueAt: exam, estimatedMinutes: 360 })],
    });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    expect(total(r)).toBeLessThan(360);
    expect(r.shortfalls[0].itemId).toBe("midterm");
    expect(r.shortfalls[0].unscheduledMinutes).toBe(360 - total(r));
    for (const s of r.sessions) expect(Date.parse(s.end)).toBeLessThanOrEqual(Date.parse(exam));
  });

  it("spaces exam review across the days before the exam", () => {
    const exam = local("2026-12-08T09:00");
    const i = input({ items: [item({ id: "final", courseId: "calc", kind: "exam", dueAt: exam, estimatedMinutes: 200 })] });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    const days = new Set(r.sessions.map((s) => DateTime.fromISO(s.start, { zone: ZONE }).toISODate()));
    expect(days.size).toBe(4); // D-7, D-4, D-2, D-1
    expect(r.sessions[0].title).toBe("Review for final");
  });

  it("a manually locked session is never moved and its time counts toward the assignment", () => {
    const locked: ExistingSession = { id: "pin", itemId: "lab", start: local("2026-11-23T18:00"), end: local("2026-11-23T19:00"), locked: true };
    const i = input({ items: [item({ id: "lab", estimatedMinutes: 150 })], existingSessions: [locked] });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    expect(r.sessions.find((s) => s.locked)).toMatchObject({ start: locked.start, end: locked.end });
    expect(total(r, "lab")).toBe(150); // 60 locked + 90 planned
  });

  it("a missed session is redistributed, explained, and other sessions stay put", () => {
    const sim = new SimulatedClock(MONDAY_8AM);
    const i = input({ items: [item({ id: "lab", estimatedMinutes: 150, dueAt: local("2026-11-27T23:59") })] });
    const first = plan(i, sim);
    const missed = first.sessions[0];
    // The student skips the first session; time moves on to just after it.
    sim.set(new Date(Date.parse(missed.end) + 60_000).toISOString());
    const second = plan({ ...i, existingSessions: asExisting(first) }, sim);
    assertHardConstraints(i, second);

    expect(total(second, "lab")).toBe(150);
    const moved = second.changes.filter((c) => c.kind === "moved");
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({ reason: "PREVIOUS_TIME_PASSED", previous: { id: missed.key } });
    expect(moved[0].explanation).toMatch(/missed/);
    // Untouched future sessions keep their times.
    for (const s of first.sessions.slice(1)) expect(second.sessions.some((n) => n.start === s.start && n.end === s.end)).toBe(true);
    expect(second.strategy).toBe("stable");
  });

  it("missing multiple sessions eventually reports insufficient capacity", () => {
    const sim = new SimulatedClock(MONDAY_8AM);
    const i = input({
      availability: [{ id: "eve", days: [1, 2, 3, 4, 5, 6, 7], start: "19:00", end: "21:00" }],
      items: [item({ id: "paper", estimatedMinutes: 300, dueAt: local("2026-11-27T12:00") })],
    });
    let r = plan(i, sim);
    expect(r.shortfalls).toEqual([]);
    for (let day = 0; day < 3; day++) {
      sim.set(local(`2026-11-${23 + day}T22:00`)); // each evening's sessions pass without being done
      r = plan({ ...i, existingSessions: asExisting(r) }, sim);
      assertHardConstraints(i, r);
    }
    expect(r.shortfalls[0]).toMatchObject({ itemId: "paper", remainingMinutes: 300 });
    expect(r.shortfalls[0].unscheduledMinutes).toBe(300 - total(r));
    expect(r.shortfalls[0].unscheduledMinutes).toBeGreaterThan(0);
  });

  it("an assignment added after the initial plan is fitted in with minimal churn", () => {
    const base = input({ items: [item({ id: "lab", estimatedMinutes: 100, dueAt: local("2026-12-02T23:59") })] });
    const first = plan(base, clock);
    const withNew = { ...base, items: [...base.items, item({ id: "quiz-prep", courseId: "calc", estimatedMinutes: 50, dueAt: local("2026-11-30T12:00") })] };
    const second = plan({ ...withNew, existingSessions: asExisting(first) }, clock);
    assertHardConstraints(withNew, second);
    expect(second.changes.filter((c) => c.kind === "added").every((c) => c.itemId === "quiz-prep")).toBe(true);
    expect(second.changes.filter((c) => c.itemId === "lab")).toEqual([]);
  });

  it("a professor moving a deadline earlier pulls affected sessions forward", () => {
    const base = input({ items: [item({ id: "lab", estimatedMinutes: 150, dueAt: local("2026-12-04T23:59") })] });
    const first = plan(base, clock);
    const newDue = local("2026-11-25T23:59");
    const moved = { ...base, items: [{ ...base.items[0], dueAt: newDue }] };
    const second = plan({ ...moved, existingSessions: asExisting(first) }, clock);
    assertHardConstraints(moved, second);
    expect(total(second, "lab")).toBe(150);
    for (const s of second.sessions) expect(Date.parse(s.end)).toBeLessThanOrEqual(Date.parse(newDue));
  });

  it("removed items cause their future sessions to be removed with an explanation", () => {
    const base = input({ items: [item({ id: "lab", estimatedMinutes: 100 })] });
    const first = plan(base, clock);
    const r = plan({ ...base, items: [], existingSessions: asExisting(first) }, clock);
    expect(r.sessions).toEqual([]);
    expect(r.changes.every((c) => c.kind === "removed" && c.reason === "ITEM_REMOVED")).toBe(true);
    expect(r.changes).toHaveLength(first.sessions.length);
  });

  it("uses the deadline buffer only when needed, and says so", () => {
    // Only Thursday evening is free before a Friday 06:00 deadline; a 12h buffer would exclude it.
    const i = input({
      availability: [{ id: "thu", days: [4], start: "18:00", end: "20:00" }],
      items: [item({ id: "lab", estimatedMinutes: 60, dueAt: local("2026-11-27T06:00") })],
    });
    const r = plan(i, clock);
    assertHardConstraints(i, r);
    expect(total(r)).toBe(60);
    expect(r.sessions[0].bufferReduced).toBe(true);
    expect(r.warnings.some((w) => w.code === "BUFFER_REDUCED")).toBe(true);
  });
});

describe("time zones and daylight saving", () => {
  const evening = { id: "eve", days: [1, 2, 3, 4, 5, 6, 7] as const, start: "19:00", end: "21:00" };
  const startHours = (r: PlanResult, zone: string) => r.sessions.map((s) => DateTime.fromISO(s.start, { zone }).toFormat("HH:mm"));

  it.each([
    ["US spring forward", "America/Chicago", "2027-03-05T12:00", "2027-03-12T23:59"],
    ["US fall back", "America/Chicago", "2026-10-29T12:00", "2026-11-05T23:59"],
    ["EU fall back", "Europe/Berlin", "2026-10-22T12:00", "2026-10-29T23:59"],
    ["half-hour offset, no DST", "Asia/Kolkata", "2026-11-23T12:00", "2026-11-30T23:59"],
  ])("%s: sessions keep their local wall-clock times", (_name, zone, nowLocal, dueLocal) => {
    const i = input({
      timeZone: zone,
      classMeetings: [],
      availability: [{ ...evening, days: [...evening.days] }],
      preferences: prefs({ maxStudyMinutesPerDay: 50, deadlineBufferHours: 0 }),
      items: [item({ id: "reading", kind: "reading", estimatedMinutes: 350, dueAt: local(dueLocal, zone) })],
    });
    const r = plan(i, fixedClock(local(nowLocal, zone)));
    assertHardConstraints(i, r);
    expect(r.sessions.length).toBe(7);
    expect(new Set(startHours(r, zone))).toEqual(new Set(["19:00"]));
  });

  it("sleep that wraps past midnight is respected on the DST night", () => {
    const zone = "America/Chicago";
    const i = input({
      timeZone: zone,
      classMeetings: [],
      availability: [{ id: "late", days: [6, 7], start: "00:00", end: "24:00" }],
      preferences: prefs({ sleep: { start: "22:00", end: "09:00" } }),
      items: [item({ id: "x", estimatedMinutes: 600, dueAt: local("2027-03-15T12:00", zone) })],
    });
    const r = plan(i, fixedClock(local("2027-03-06T08:00", zone)));
    assertHardConstraints(i, r);
    for (const s of r.sessions) {
      const h = DateTime.fromISO(s.start, { zone }).hour;
      expect(h >= 9 && h < 22).toBe(true);
    }
  });
});
