import { expect } from "vitest";
import { normalize } from "../intervals";
import { ALL_DAYS, expandWeekly } from "../time";
import type { PlanInput, PlanResult } from "../types";

const ms = (s: string) => Date.parse(s);

/** Hard constraints every plan must satisfy. */
export function assertHardConstraints(input: PlanInput, result: PlanResult): void {
  const sessions = [...result.sessions].sort((a, b) => ms(a.start) - ms(b.start));
  const from = ms(result.horizon.start) - 2 * 86_400_000;
  const to = ms(result.horizon.end) + 2 * 86_400_000;
  const busy = [
    ...expandWeekly([{ id: "s", days: ALL_DAYS, ...input.preferences.sleep }], input.timeZone, from, to),
    ...expandWeekly(input.classMeetings ?? [], input.timeZone, from, to),
    ...expandWeekly(input.blocked ?? [], input.timeZone, from, to),
    ...(input.events ?? []).map((e) => ({ start: ms(e.start), end: ms(e.end) })),
  ];
  // Adjacent availability windows form one continuous block.
  const avail = normalize(expandWeekly(input.availability, input.timeZone, from, to));
  const items = new Map(input.items.map((i) => [i.id, i]));

  for (let i = 1; i < sessions.length; i++) {
    expect(ms(sessions[i].start), `overlap: ${sessions[i - 1].key} / ${sessions[i].key}`).toBeGreaterThanOrEqual(ms(sessions[i - 1].end));
  }
  for (const s of sessions.filter((x) => !x.locked)) {
    const [a, b] = [ms(s.start), ms(s.end)];
    expect(b - a).toBe(s.minutes * 60_000);
    expect(a).toBeGreaterThanOrEqual(ms(result.generatedAt));
    expect(busy.some((x) => a < x.end && x.start < b), `${s.key} overlaps busy time`).toBe(false);
    expect(avail.some((x) => x.start <= a && b <= x.end), `${s.key} outside availability`).toBe(true);
    const it = items.get(s.itemId)!;
    expect(b, `${s.key} ends after due`).toBeLessThanOrEqual(ms(it.dueAt));
    if (it.availableFrom) expect(a).toBeGreaterThanOrEqual(ms(it.availableFrom));
  }
  // Locked sessions are echoed back untouched.
  for (const l of (input.existingSessions ?? []).filter((x) => x.locked && ms(x.end) > ms(result.generatedAt))) {
    expect(result.sessions.find((s) => s.key === `locked:${l.id}`)).toMatchObject({ start: l.start, end: l.end, locked: true });
  }
  // Accounting: everything demanded is either scheduled or reported as a shortfall.
  const unscheduled = result.shortfalls.reduce((s, x) => s + x.unscheduledMinutes, 0);
  expect(result.capacity.scheduledMinutes + unscheduled).toBe(result.capacity.demandMinutes);
}

export function minutesPerLocalDay(result: PlanResult, zone: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of result.sessions) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(s.start));
    m.set(d, (m.get(d) ?? 0) + s.minutes);
  }
  return m;
}
