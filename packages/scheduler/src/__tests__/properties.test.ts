import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fixedClock, plan } from "../index";
import type { ExistingSession, PlanInput, Weekday } from "../types";
import { assertHardConstraints, minutesPerLocalDay } from "./invariants";
import { input, item, MONDAY_8AM, prefs, ZONE } from "./fixtures";

const NOW = Date.parse(MONDAY_8AM);
const HOUR = 3600_000;
const hhmm = (h: number, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const windowArb = fc
  .record({
    days: fc.uniqueArray(fc.integer({ min: 1, max: 7 }), { minLength: 1, maxLength: 7 }),
    start: fc.integer({ min: 7, max: 20 }),
    len: fc.integer({ min: 1, max: 5 }),
  })
  .map((w) => ({ days: w.days as Weekday[], start: hhmm(w.start), end: hhmm(Math.min(23, w.start + w.len)) }));

const itemArb = fc.record({
  dueInHours: fc.integer({ min: 2, max: 20 * 24 }),
  minutes: fc.integer({ min: 10, max: 600 }),
  done: fc.integer({ min: 0, max: 100 }),
  priority: fc.integer({ min: 1, max: 5 }),
  exam: fc.boolean(),
  course: fc.constantFrom("bio", "calc"),
});

const scenarioArb = fc.record({
  windows: fc.array(windowArb, { maxLength: 4 }).map((ws) => ws.map((w, i) => ({ id: `w${i}`, ...w }))),
  items: fc.array(itemArb, { maxLength: 6 }),
  dailyMax: fc.integer({ min: 30, max: 480 }),
  preferred: fc.constantFrom(25, 45, 50, 90),
  buffer: fc.integer({ min: 0, max: 48 }),
  lockedAt: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
});

type Scenario = typeof scenarioArb extends fc.Arbitrary<infer T> ? T : never;

function build(s: Scenario): PlanInput {
  const items = s.items.map((it, i) =>
    item({
      id: `i${i}`,
      courseId: it.course,
      kind: it.exam ? "exam" : "assignment",
      dueAt: new Date(NOW + it.dueInHours * HOUR).toISOString(),
      estimatedMinutes: it.minutes,
      completedMinutes: Math.min(it.done, it.minutes),
      priority: it.priority,
    }),
  );
  const locked: ExistingSession[] =
    s.lockedAt === undefined
      ? []
      : [{ id: "L", itemId: items[0]?.id, start: new Date(NOW + s.lockedAt * HOUR).toISOString(), end: new Date(NOW + (s.lockedAt + 1) * HOUR).toISOString(), locked: true }];
  return input({
    availability: s.windows,
    preferences: prefs({ maxStudyMinutesPerDay: s.dailyMax, preferredSessionMinutes: s.preferred, minSessionMinutes: 25, deadlineBufferHours: s.buffer }),
    items,
    existingSessions: locked,
  });
}

describe("scheduler invariants (property-based)", () => {
  it("never violates hard constraints, never double-counts, and is deterministic", () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const i = build(s);
        const r = plan(i, fixedClock(MONDAY_8AM));
        assertHardConstraints(i, r);
        // The daily cap may only be exceeded by sessions the student locked themselves.
        const lockedMins = new Map<string, number>();
        for (const x of r.sessions.filter((x) => x.locked)) {
          const d = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date(x.start));
          lockedMins.set(d, (lockedMins.get(d) ?? 0) + x.minutes);
        }
        for (const [d, m] of minutesPerLocalDay(r, ZONE)) expect(m).toBeLessThanOrEqual(Math.max(s.dailyMax, lockedMins.get(d) ?? 0));
        expect(r.capacity.scheduledMinutes).toBeLessThanOrEqual(r.capacity.availableMinutes);
        expect(plan(structuredClone(i), fixedClock(MONDAY_8AM))).toEqual(r);
      }),
      { numRuns: Number(process.env.FC_RUNS ?? 300) },
    );
  }, 600_000);

  it("re-planning an unchanged plan changes nothing", () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const i = build(s);
        const first = plan(i, fixedClock(MONDAY_8AM));
        const existing = first.sessions.map((x) => ({ id: x.key, itemId: x.itemId, start: x.start, end: x.end, locked: x.locked }));
        const again = plan({ ...i, existingSessions: existing }, fixedClock(MONDAY_8AM));
        expect(again.changes).toEqual([]);
      }),
      { numRuns: Number(process.env.FC_RUNS ?? 200) },
    );
  }, 600_000);
});
