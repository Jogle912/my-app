import type { PlanInput, Weekday, WorkItem } from "@/scheduler";

/** Rule-based effort defaults (minutes) until the student or the AI planner (M4) gives an estimate. */
export const DEFAULT_ESTIMATE_MINUTES: Record<string, number> = {
  HOMEWORK: 120,
  PROJECT: 360,
  READING: 60,
  QUIZ: 90,
  EXAM: 240,
  DISCUSSION: 45,
  OTHER: 90,
};

// Minimal structural types so this mapper stays pure and testable without Prisma.
export interface PrefsRecord {
  timeZone: string;
  sleepStart: string;
  sleepEnd: string;
  maxStudyMinutesPerDay: number;
  preferredSessionMinutes: number;
  minSessionMinutes: number;
  breakMinutes: number;
  deadlineBufferHours: number;
  energyMorning: number;
  energyAfternoon: number;
  energyEvening: number;
  maxSameCourseSessionsPerDay: number;
}
export interface RuleRecord {
  id: string;
  kind: "AVAILABLE" | "BLOCKED";
  label: string | null;
  days: number[];
  startTime: string;
  endTime: string;
}
export interface CourseRecord {
  id: string;
  name: string;
  difficulty: number;
}
export interface MeetingRecord {
  id: string;
  courseId: string;
  days: number[];
  startTime: string;
  endTime: string;
}
export interface MilestoneRecord {
  id: string;
  title: string;
  estimatedMinutes: number;
  completedMinutes: number;
  doneAt: Date | null;
}
export interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  kind: string;
  dueAt: Date;
  personalDueAt: Date | null;
  unlockAt: Date | null;
  estimatedMinutes: number | null;
  completedMinutes: number;
  priority: number;
  ignored: boolean;
  studentDone: boolean;
  submissionState: string;
  removedUpstream: boolean;
  milestones: MilestoneRecord[];
}
export interface EventRecord {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  blocksStudy: boolean;
}

export interface StudentRecords {
  prefs: PrefsRecord;
  rules: RuleRecord[];
  courses: CourseRecord[];
  meetings: MeetingRecord[];
  assignments: AssignmentRecord[];
  events: EventRecord[];
}

/** Work that no longer needs planning: done, ignored, submitted/graded/excused, or removed in Canvas. */
export function needsPlanning(a: AssignmentRecord): boolean {
  return !a.ignored && !a.studentDone && !a.removedUpstream && (a.submissionState === "NONE" || a.submissionState === "MISSING");
}

export function toPlanInput(r: StudentRecords, horizonDays = 42): PlanInput {
  const courseIds = new Set(r.courses.map((c) => c.id));
  const items: WorkItem[] = r.assignments
    .filter((a) => needsPlanning(a) && courseIds.has(a.courseId))
    .map((a) => {
      const due = a.personalDueAt && a.personalDueAt < a.dueAt ? a.personalDueAt : a.dueAt;
      const kind: WorkItem["kind"] = a.kind === "EXAM" || a.kind === "QUIZ" ? "exam" : a.kind === "READING" ? "reading" : "assignment";
      const milestones = a.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        estimatedMinutes: m.estimatedMinutes,
        completedMinutes: m.doneAt ? m.estimatedMinutes : m.completedMinutes,
      }));
      return {
        id: a.id,
        courseId: a.courseId,
        title: a.title,
        kind,
        dueAt: due.toISOString(),
        availableFrom: a.unlockAt?.toISOString(),
        estimatedMinutes: a.estimatedMinutes ?? DEFAULT_ESTIMATE_MINUTES[a.kind] ?? 90,
        completedMinutes: a.completedMinutes,
        priority: a.priority,
        milestones: milestones.length ? milestones : undefined,
      };
    });

  const window = (x: { id: string; days: number[]; startTime: string; endTime: string; label?: string | null }) => ({
    id: x.id,
    days: x.days as Weekday[],
    start: x.startTime,
    end: x.endTime,
    label: x.label ?? undefined,
  });

  return {
    timeZone: r.prefs.timeZone,
    horizonDays,
    preferences: {
      sleep: { start: r.prefs.sleepStart, end: r.prefs.sleepEnd },
      maxStudyMinutesPerDay: r.prefs.maxStudyMinutesPerDay,
      preferredSessionMinutes: r.prefs.preferredSessionMinutes,
      minSessionMinutes: r.prefs.minSessionMinutes,
      breakMinutes: r.prefs.breakMinutes,
      deadlineBufferHours: r.prefs.deadlineBufferHours,
      energy: { morning: r.prefs.energyMorning, afternoon: r.prefs.energyAfternoon, evening: r.prefs.energyEvening },
      maxSameCourseSessionsPerDay: r.prefs.maxSameCourseSessionsPerDay,
      examReviewOffsetsDays: [7, 4, 2, 1],
    },
    availability: r.rules.filter((x) => x.kind === "AVAILABLE").map(window),
    blocked: r.rules.filter((x) => x.kind === "BLOCKED").map(window),
    classMeetings: r.meetings.filter((m) => courseIds.has(m.courseId)).map((m) => ({ ...window(m), courseId: m.courseId })),
    events: r.events.filter((e) => e.blocksStudy).map((e) => ({ id: e.id, title: e.title, start: e.startAt.toISOString(), end: e.endAt.toISOString() })),
    courses: r.courses.map((c) => ({ id: c.id, name: c.name, difficulty: c.difficulty })),
    items,
  };
}
