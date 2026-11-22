import { DateTime } from "luxon";

export const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const formatDays = (days: number[]) =>
  days.length === 7 ? "Every day" : [...days].sort().map((d) => DAY_NAMES[d]).join(", ");

export const formatDue = (iso: string, zone: string) => DateTime.fromISO(iso, { zone }).toFormat("ccc LLL d, h:mm a");
export const formatTime = (iso: string, zone: string) => DateTime.fromISO(iso, { zone }).toFormat("h:mm a");

/** "HH:mm" from a Date's local wall-clock time. */
export const toWallTime = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** A Date today at the given "HH:mm" (for seeding time pickers). */
export function fromWallTime(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export const isWallTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** The phone's IANA time zone, e.g. "America/Chicago". */
export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function hours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}
