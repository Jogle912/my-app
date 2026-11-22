import type { PlanInput } from "./types";

/**
 * A realistic mock student used by the demo CLI and (later) the "Try with demo data" path.
 * Times are relative to `now` so the demo always looks current.
 */
export function demoStudent(now: Date, timeZone = "America/Chicago"): PlanInput {
  const at = (days: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    // Approximate local time; precise enough for demo data.
    const local = new Date(d.toLocaleString("en-US", { timeZone }));
    const offset = d.getTime() - local.getTime();
    local.setHours(hour, minute, 0, 0);
    return new Date(local.getTime() + offset).toISOString();
  };
  return {
    timeZone,
    horizonDays: 21,
    preferences: {
      sleep: { start: "23:30", end: "07:30" },
      maxStudyMinutesPerDay: 180,
      preferredSessionMinutes: 50,
      minSessionMinutes: 25,
      breakMinutes: 10,
      deadlineBufferHours: 12,
      energy: { morning: 3, afternoon: 2, evening: 2 },
      maxSameCourseSessionsPerDay: 2,
      examReviewOffsetsDays: [7, 4, 2, 1],
    },
    availability: [
      { id: "mornings", days: [2, 4], start: "08:00", end: "11:00", label: "Free mornings" },
      { id: "afternoons", days: [1, 2, 3, 4, 5], start: "13:00", end: "17:00" },
      { id: "evenings", days: [1, 2, 3, 4, 7], start: "19:00", end: "22:00" },
      { id: "weekend", days: [6, 7], start: "10:00", end: "16:00" },
    ],
    blocked: [{ id: "work", days: [3, 5], start: "16:00", end: "21:00", label: "Campus job" }],
    classMeetings: [
      { id: "bio-lec", courseId: "bio", days: [1, 3, 5], start: "09:00", end: "09:50" },
      { id: "calc-lec", courseId: "calc", days: [1, 3, 5], start: "11:00", end: "11:50" },
      { id: "eng-sem", courseId: "eng", days: [2, 4], start: "14:00", end: "15:15" },
    ],
    events: [{ id: "dentist", title: "Dentist", start: at(2, 15), end: at(2, 16) }],
    courses: [
      { id: "bio", name: "BIOL 1020 Principles of Biology", difficulty: 3 },
      { id: "calc", name: "MATH 1610 Calculus I", difficulty: 5 },
      { id: "eng", name: "ENGL 1100 English Composition", difficulty: 2 },
    ],
    items: [
      { id: "calc-ps7", courseId: "calc", title: "Problem Set 7", kind: "assignment", dueAt: at(3, 23, 59), estimatedMinutes: 150, priority: 4 },
      { id: "bio-lab5", courseId: "bio", title: "Lab Report 5", kind: "assignment", dueAt: at(3, 23, 0), estimatedMinutes: 120, priority: 3 },
      { id: "bio-ch8", courseId: "bio", title: "Read Chapter 8", kind: "reading", dueAt: at(5, 9, 0), estimatedMinutes: 60, priority: 2 },
      {
        id: "eng-essay2",
        courseId: "eng",
        title: "Argument Essay",
        kind: "assignment",
        dueAt: at(10, 23, 59),
        estimatedMinutes: 0,
        priority: 4,
        milestones: [
          { id: "sources", title: "Find sources", estimatedMinutes: 45 },
          { id: "outline", title: "Outline", estimatedMinutes: 40 },
          { id: "draft", title: "Draft", estimatedMinutes: 150 },
          { id: "revise", title: "Revise", estimatedMinutes: 60 },
        ],
      },
      { id: "calc-midterm", courseId: "calc", title: "Calculus Midterm 2", kind: "exam", dueAt: at(9, 11, 0), estimatedMinutes: 240, priority: 5 },
    ],
  };
}
