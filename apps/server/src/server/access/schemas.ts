import { z } from "zod";

const WALL = /^([01]\d|2[0-3]):[0-5]\d$/;
export const wallTime = z.string().regex(WALL, "Use HH:mm (24-hour)");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const weekdays = z
  .array(z.coerce.number().int().min(1).max(7))
  .min(1, "Pick at least one day")
  .transform((d) => [...new Set(d)].sort());

export const courseInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  code: optionalText(40),
  term: optionalText(40),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
});
export type CourseInput = z.infer<typeof courseInput>;

export const meetingInput = z
  .object({
    days: weekdays,
    startTime: wallTime,
    endTime: wallTime,
    location: optionalText(120),
  })
  .refine((m) => m.endTime > m.startTime, { message: "End must be after start", path: ["endTime"] });
export type MeetingInput = z.infer<typeof meetingInput>;

export const ASSIGNMENT_KINDS = ["HOMEWORK", "PROJECT", "READING", "QUIZ", "EXAM", "DISCUSSION", "OTHER"] as const;

export const assignmentInput = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(5000),
  kind: z.enum(ASSIGNMENT_KINDS).default("HOMEWORK"),
  dueAt: z.date(),
  estimatedMinutes: z.coerce.number().int().min(5).max(6000).optional(),
  priority: z.coerce.number().int().min(1).max(5).default(3),
});
export type AssignmentInput = z.infer<typeof assignmentInput>;

export const assignmentProgressInput = z.object({
  completedMinutes: z.coerce.number().int().min(0).max(6000).optional(),
  studentDone: z.boolean().optional(),
  ignored: z.boolean().optional(),
});

export const milestoneInput = z.object({
  title: z.string().trim().min(1).max(200),
  estimatedMinutes: z.coerce.number().int().min(5).max(3000),
});

export const availabilityInput = z
  .object({
    kind: z.enum(["AVAILABLE", "BLOCKED"]),
    label: optionalText(60),
    days: weekdays,
    startTime: wallTime,
    endTime: wallTime,
  })
  .refine((r) => r.endTime !== r.startTime, { message: "Start and end can't be the same", path: ["endTime"] });
export type AvailabilityInput = z.infer<typeof availabilityInput>;

export const eventInput = z
  .object({
    title: z.string().trim().min(1).max(120),
    startAt: z.date(),
    endAt: z.date(),
  })
  .refine((e) => e.endAt > e.startAt, { message: "End must be after start", path: ["endAt"] });

const isZone = (z: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: z });
    return true;
  } catch {
    return false;
  }
};

export const preferencesInput = z
  .object({
    timeZone: z.string().refine(isZone, "Unknown time zone"),
    sleepStart: wallTime,
    sleepEnd: wallTime,
    maxStudyMinutesPerDay: z.coerce.number().int().min(15).max(960),
    preferredSessionMinutes: z.coerce.number().int().min(15).max(240),
    minSessionMinutes: z.coerce.number().int().min(10).max(120),
    breakMinutes: z.coerce.number().int().min(0).max(60),
    deadlineBufferHours: z.coerce.number().int().min(0).max(168),
    energyMorning: z.coerce.number().int().min(1).max(3),
    energyAfternoon: z.coerce.number().int().min(1).max(3),
    energyEvening: z.coerce.number().int().min(1).max(3),
  })
  .refine((p) => p.minSessionMinutes <= p.preferredSessionMinutes, {
    message: "Minimum session can't be longer than the preferred session",
    path: ["minSessionMinutes"],
  });
export type PreferencesInput = z.infer<typeof preferencesInput>;
