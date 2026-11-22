import { DateTime } from "luxon";

/** `<input type="datetime-local">` value (wall time in `zone`) → UTC Date. */
export function localInputToDate(value: string, zone: string): Date | undefined {
  if (!value) return undefined;
  const dt = DateTime.fromISO(value, { zone });
  return dt.isValid ? dt.toJSDate() : undefined;
}

/** UTC Date → value for `<input type="datetime-local">` in `zone`. */
export function dateToLocalInput(date: Date, zone: string): string {
  return DateTime.fromJSDate(date, { zone }).toFormat("yyyy-LL-dd'T'HH:mm");
}

export function formatLocal(date: Date | string, zone: string, fmt = "ccc LLL d, h:mm a"): string {
  const dt = typeof date === "string" ? DateTime.fromISO(date, { zone }) : DateTime.fromJSDate(date, { zone });
  return dt.toFormat(fmt);
}

export const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const formatDays = (days: number[]) => days.map((d) => DAY_NAMES[d]).join(", ");
