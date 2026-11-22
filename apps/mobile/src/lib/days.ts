import type { PlannedSession, PlanResult } from "@studypilot/scheduler";
import { DateTime } from "luxon";

export interface DaySection {
  key: string;
  title: string;
  data: PlannedSession[];
}

/** Groups sessions by the student's local day, labelling today and tomorrow. */
export function groupByDay(result: PlanResult, zone: string, now: Date = new Date()): DaySection[] {
  const today = DateTime.fromJSDate(now, { zone }).startOf("day");
  const sections = new Map<string, DaySection>();
  for (const s of result.sessions) {
    const day = DateTime.fromISO(s.start, { zone }).startOf("day");
    const key = day.toISODate()!;
    const diff = Math.round(day.diff(today, "days").days);
    const title = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : day.toFormat("cccc, LLL d");
    if (!sections.has(key)) sections.set(key, { key, title, data: [] });
    sections.get(key)!.data.push(s);
  }
  return [...sections.values()];
}
