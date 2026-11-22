import { DateTime } from "luxon";
import type { Interval } from "./intervals";
import type { WallTime, WeeklyWindow } from "./types";

function parseWall(w: WallTime): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(w);
  if (!m) throw new Error(`Invalid wall time "${w}" (expected HH:mm)`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) throw new Error(`Invalid wall time "${w}"`);
  return { hour, minute };
}

export function assertZone(zone: string): void {
  if (!DateTime.local().setZone(zone).isValid) throw new Error(`Unknown IANA time zone "${zone}"`);
}

/** Local instant for a wall time on a given local date. Nonexistent times (DST gap) shift forward. */
function at(date: DateTime, w: WallTime): DateTime {
  const { hour, minute } = parseWall(w);
  if (hour === 24) return date.plus({ days: 1 }).startOf("day");
  return date.set({ hour, minute, second: 0, millisecond: 0 });
}

/**
 * Expands weekly wall-clock windows into concrete UTC intervals between `from` and `to`,
 * correctly across DST transitions. Windows whose end is not after their start wrap to the next day.
 */
export function expandWeekly(windows: WeeklyWindow[], zone: string, from: number, to: number): Interval[] {
  const out: Interval[] = [];
  // Start a day early so windows that wrap past midnight from the previous day are included.
  let day = DateTime.fromMillis(from, { zone }).startOf("day").minus({ days: 1 });
  const last = DateTime.fromMillis(to, { zone }).startOf("day");
  while (day <= last) {
    for (const w of windows) {
      if (!w.days.includes(day.weekday as WeeklyWindow["days"][number])) continue;
      const s = at(day, w.start);
      let e = at(day, w.end);
      if (e <= s) e = at(day.plus({ days: 1 }), w.end);
      const start = Math.max(s.toMillis(), from);
      const end = Math.min(e.toMillis(), to);
      if (end > start) out.push({ start, end });
    }
    day = day.plus({ days: 1 });
  }
  return out;
}

export const ALL_DAYS: WeeklyWindow["days"] = [1, 2, 3, 4, 5, 6, 7];

export function localDateKey(t: number, zone: string): string {
  return DateTime.fromMillis(t, { zone }).toISODate()!;
}

export function localHour(t: number, zone: string): number {
  return DateTime.fromMillis(t, { zone }).hour;
}

export function toISO(t: number): string {
  return new Date(t).toISOString();
}

export function fromISO(s: string, what = "instant"): number {
  const t = Date.parse(s);
  if (Number.isNaN(t)) throw new Error(`Invalid ${what}: "${s}"`);
  return t;
}

export function formatLocal(t: number, zone: string): string {
  return DateTime.fromMillis(t, { zone }).toFormat("ccc LLL d, h:mm a");
}
