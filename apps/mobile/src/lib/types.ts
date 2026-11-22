// Shapes returned by /api/v1 (dates arrive as ISO strings).

export type AssignmentKind = "HOMEWORK" | "PROJECT" | "READING" | "QUIZ" | "EXAM" | "DISCUSSION" | "OTHER";

export interface Course {
  id: string;
  name: string;
  code: string | null;
  term: string | null;
  difficulty: number;
  _count?: { assignments: number };
}

export interface Meeting {
  id: string;
  days: number[];
  startTime: string;
  endTime: string;
  location: string | null;
}

export interface Milestone {
  id: string;
  order: number;
  title: string;
  estimatedMinutes: number;
  doneAt: string | null;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  kind: AssignmentKind;
  dueAt: string;
  estimatedMinutes: number | null;
  completedMinutes: number;
  priority: number;
  studentDone: boolean;
  course?: { id: string; name: string };
  milestones?: Milestone[];
}

export interface CourseDetail extends Course {
  meetings: Meeting[];
  assignments: Assignment[];
}

export interface AvailabilityRule {
  id: string;
  kind: "AVAILABLE" | "BLOCKED";
  label: string | null;
  days: number[];
  startTime: string;
  endTime: string;
}

export interface Preferences {
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
}
