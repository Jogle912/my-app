import { DateTime } from "luxon";
import type { PlanInput, Preferences, WeeklyWindow, WorkItem } from "../types";

export const ZONE = "America/Chicago";
/** Monday 23 Nov 2026, 08:00 in Chicago (14:00 UTC). */
export const MONDAY_8AM = "2026-11-23T14:00:00.000Z";

export const prefs = (over: Partial<Preferences> = {}): Preferences => ({
  sleep: { start: "23:00", end: "07:00" },
  maxStudyMinutesPerDay: 240,
  preferredSessionMinutes: 50,
  minSessionMinutes: 25,
  breakMinutes: 10,
  deadlineBufferHours: 12,
  energy: { morning: 2, afternoon: 2, evening: 2 },
  maxSameCourseSessionsPerDay: 2,
  examReviewOffsetsDays: [7, 4, 2, 1],
  ...over,
});

export const everyEvening: WeeklyWindow = { id: "eve", days: [1, 2, 3, 4, 5, 6, 7], start: "18:00", end: "22:00" };
export const weekdayAfternoons: WeeklyWindow = { id: "aft", days: [1, 2, 3, 4, 5], start: "13:00", end: "17:00" };

/** Local Chicago wall time → UTC ISO. */
export const local = (s: string, zone = ZONE) => DateTime.fromISO(s, { zone }).toUTC().toISO()!;

export const item = (over: Partial<WorkItem> & Pick<WorkItem, "id">): WorkItem => ({
  courseId: "bio",
  title: over.id,
  kind: "assignment",
  dueAt: local("2026-11-27T23:59"),
  estimatedMinutes: 120,
  ...over,
});

export const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  timeZone: ZONE,
  horizonDays: 21,
  preferences: prefs(),
  availability: [everyEvening, weekdayAfternoons],
  classMeetings: [{ id: "bio-lec", courseId: "bio", days: [1, 3, 5], start: "14:00", end: "15:15" }],
  courses: [
    { id: "bio", name: "Biology 1010", difficulty: 3 },
    { id: "calc", name: "Calculus I", difficulty: 5 },
  ],
  items: [],
  ...over,
});
