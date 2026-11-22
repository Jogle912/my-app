import "server-only";
import { plan, type Clock, type PlanResult } from "@studypilot/scheduler";
import { db } from "../db";
import { toPlanInput, type StudentRecords } from "../planning/toPlanInput";
import { getPreferences } from "./schedule";

const HORIZON_DAYS = 42;

/** Loads one student's records (and only theirs) for planning. */
export async function loadStudentRecords(userId: string, now: Date): Promise<StudentRecords> {
  const horizonEnd = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const [prefs, rules, courses, meetings, assignments, events] = await Promise.all([
    getPreferences(userId),
    db.availabilityRule.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.course.findMany({ where: { userId, archived: false }, orderBy: { id: "asc" } }),
    db.classMeeting.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    db.assignment.findMany({
      where: { userId, dueAt: { gt: new Date(now.getTime() - 30 * 86_400_000) } },
      include: { milestones: { orderBy: { order: "asc" } } },
      orderBy: { id: "asc" },
    }),
    db.calendarEvent.findMany({ where: { userId, endAt: { gte: now }, startAt: { lte: horizonEnd } }, orderBy: { id: "asc" } }),
  ]);
  return { prefs, rules, courses, meetings, assignments, events };
}

export interface StudentPlan {
  result: PlanResult;
  timeZone: string;
  courseNames: Map<string, string>;
  hasAvailability: boolean;
}

export async function planForStudent(userId: string, clock: Clock): Promise<StudentPlan> {
  const records = await loadStudentRecords(userId, clock.now());
  const input = toPlanInput(records, HORIZON_DAYS);
  return {
    result: plan(input, clock),
    timeZone: input.timeZone,
    courseNames: new Map(records.courses.map((c) => [c.id, c.name])),
    hasAvailability: input.availability.length > 0,
  };
}
