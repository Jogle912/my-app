/** Half-open intervals [start, end) in epoch milliseconds. Lists are kept sorted and disjoint. */
export interface Interval {
  start: number;
  end: number;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export function normalize(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** a minus b. Both inputs may be unsorted. */
export function subtract(a: Interval[], b: Interval[]): Interval[] {
  const base = normalize(a);
  const cut = normalize(b);
  const out: Interval[] = [];
  for (const iv of base) {
    let cursor = iv.start;
    for (const c of cut) {
      if (c.end <= cursor) continue;
      if (c.start >= iv.end) break;
      if (c.start > cursor) out.push({ start: cursor, end: Math.min(c.start, iv.end) });
      cursor = Math.max(cursor, c.end);
      if (cursor >= iv.end) break;
    }
    if (cursor < iv.end) out.push({ start: cursor, end: iv.end });
  }
  return out;
}

export function clip(list: Interval[], bounds: Interval): Interval[] {
  return list
    .map((i) => ({ start: Math.max(i.start, bounds.start), end: Math.min(i.end, bounds.end) }))
    .filter((i) => i.end > i.start);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function totalMinutes(list: Interval[]): number {
  return list.reduce((s, i) => s + (i.end - i.start), 0) / MINUTE;
}

const GRID = 5 * MINUTE;
export const ceilToGrid = (t: number) => Math.ceil(t / GRID) * GRID;
export const floorToGrid = (t: number) => Math.floor(t / GRID) * GRID;
