/**
 * Public types for the StudyPilot scheduling engine.
 *
 * The engine is a pure function: it never reads the system clock, the database or the network.
 * All instants are ISO-8601 strings in UTC at the boundary and epoch milliseconds internally.
 * All wall-clock times ("HH:mm") are interpreted in `PlanInput.timeZone` (IANA name).
 */

export type ISODateTime = string;
/** "HH:mm", 24-hour wall-clock time in the student's time zone. */
export type WallTime = string;
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WeeklyWindow {
  id: string;
  days: Weekday[];
  start: WallTime;
  /** May be earlier than `start`, meaning the window ends the next day. */
  end: WallTime;
  label?: string;
}

export interface ClassMeeting extends WeeklyWindow {
  courseId: string;
}

export interface BusyEvent {
  id: string;
  title?: string;
  start: ISODateTime;
  end: ISODateTime;
}

export interface Course {
  id: string;
  name: string;
  /** 1 (easy) … 5 (hard). Defaults to 3. */
  difficulty?: number;
}

export interface Milestone {
  id: string;
  title: string;
  estimatedMinutes: number;
  completedMinutes?: number;
}

export type WorkKind = "assignment" | "exam" | "reading";

export interface WorkItem {
  id: string;
  courseId: string;
  title: string;
  kind: WorkKind;
  /** For exams: the exam start time. */
  dueAt: ISODateTime;
  availableFrom?: ISODateTime;
  /** Total effort; for exams the total review time wanted. Ignored when milestones are given. */
  estimatedMinutes: number;
  completedMinutes?: number;
  /** 1 (low) … 5 (high). Defaults to 3. */
  priority?: number;
  /** Ordered steps. Each milestone must be scheduled after the previous one. */
  milestones?: Milestone[];
}

export interface ExistingSession {
  id: string;
  itemId?: string;
  start: ISODateTime;
  end: ISODateTime;
  locked?: boolean;
}

export interface EnergyProfile {
  /** 05:00–12:00 */
  morning: number;
  /** 12:00–17:00 */
  afternoon: number;
  /** 17:00–05:00 */
  evening: number;
}

export interface Preferences {
  sleep: { start: WallTime; end: WallTime };
  maxStudyMinutesPerDay: number;
  preferredSessionMinutes: number;
  minSessionMinutes: number;
  breakMinutes: number;
  deadlineBufferHours: number;
  /** Relative energy per part of day, 1 (low) … 3 (high). */
  energy: EnergyProfile;
  /** Soft limit on sessions of the same course per day. */
  maxSameCourseSessionsPerDay: number;
  /** Days before an exam at which spaced review sessions open, farthest first. */
  examReviewOffsetsDays: number[];
}

export interface PlanInput {
  timeZone: string;
  /** How far ahead to plan, in days. Items due later are reported as deferred. */
  horizonDays?: number;
  preferences: Preferences;
  availability: WeeklyWindow[];
  blocked?: WeeklyWindow[];
  classMeetings?: ClassMeeting[];
  events?: BusyEvent[];
  courses: Course[];
  items: WorkItem[];
  /**
   * The student's current plan (future sessions). Locked sessions are never moved; unlocked
   * ones are kept in place where still valid, to minimise calendar churn.
   */
  existingSessions?: ExistingSession[];
}

export interface PlannedSession {
  key: string;
  itemId: string;
  milestoneId?: string;
  courseId: string;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  minutes: number;
  locked: boolean;
  /** True when the deadline buffer had to be eaten into to fit this session. */
  bufferReduced: boolean;
}

export type ChangeKind = "moved" | "added" | "removed";

export type ChangeReason =
  | "PREVIOUS_TIME_PASSED"
  | "PREVIOUS_TIME_UNAVAILABLE"
  | "REBALANCED"
  | "NEW_WORK"
  | "WORK_DONE_OR_REDUCED"
  | "ITEM_REMOVED";

export interface SessionChange {
  kind: ChangeKind;
  reason: ChangeReason;
  itemId: string;
  previous?: { id: string; start: ISODateTime; end: ISODateTime };
  next?: { key: string; start: ISODateTime; end: ISODateTime };
  explanation: string;
}

export interface Shortfall {
  itemId: string;
  title: string;
  dueAt: ISODateTime;
  remainingMinutes: number;
  unscheduledMinutes: number;
  explanation: string;
}

export type WarningCode = "OVERDUE" | "DEFERRED_BEYOND_HORIZON" | "BUFFER_REDUCED" | "FALLBACK_STRATEGY";

export interface PlanWarning {
  code: WarningCode;
  itemId?: string;
  message: string;
}

export interface PlanResult {
  engineVersion: string;
  generatedAt: ISODateTime;
  horizon: { start: ISODateTime; end: ISODateTime };
  sessions: PlannedSession[];
  /** Changes compared with `existingSessions`; sessions that stayed put are not listed. */
  changes: SessionChange[];
  shortfalls: Shortfall[];
  warnings: PlanWarning[];
  capacity: {
    /** Upper bound of study minutes available in the horizon (after sleep, classes, events, daily max). */
    availableMinutes: number;
    demandMinutes: number;
    scheduledMinutes: number;
  };
  /** Which placement pass produced the result. */
  strategy: "stable" | "fresh" | "earliest-deadline";
}
