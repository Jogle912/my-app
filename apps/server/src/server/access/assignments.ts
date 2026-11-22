import "server-only";
import { db } from "../db";
import { NotFoundError } from "./errors";
import { assignmentInput, assignmentProgressInput, milestoneInput } from "./schemas";

async function assertCourseOwned(userId: string, courseId: string) {
  const c = await db.course.findFirst({ where: { id: courseId, userId }, select: { id: true } });
  if (!c) throw new NotFoundError("Course");
}

export async function listUpcomingAssignments(userId: string, from: Date) {
  return db.assignment.findMany({
    where: { userId, dueAt: { gte: from }, ignored: false },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    include: { course: { select: { id: true, name: true } } },
  });
}

export async function getAssignment(userId: string, id: string) {
  const a = await db.assignment.findFirst({
    where: { id, userId },
    include: { course: { select: { id: true, name: true } }, milestones: { orderBy: { order: "asc" } } },
  });
  if (!a) throw new NotFoundError("Assignment");
  return a;
}

export async function createAssignment(userId: string, raw: unknown) {
  const input = assignmentInput.parse(raw);
  await assertCourseOwned(userId, input.courseId);
  return db.assignment.create({ data: { ...input, userId, source: "MANUAL" } });
}

export async function updateAssignment(userId: string, id: string, raw: unknown) {
  const input = assignmentInput.parse(raw);
  await assertCourseOwned(userId, input.courseId);
  const { count } = await db.assignment.updateMany({
    where: { id, userId },
    data: { ...input, estimatedMinutes: input.estimatedMinutes ?? null, description: input.description ?? null },
  });
  if (count === 0) throw new NotFoundError("Assignment");
}

export async function updateAssignmentProgress(userId: string, id: string, raw: unknown) {
  const input = assignmentProgressInput.parse(raw);
  const { count } = await db.assignment.updateMany({ where: { id, userId }, data: input });
  if (count === 0) throw new NotFoundError("Assignment");
}

export async function deleteAssignment(userId: string, id: string) {
  const { count } = await db.assignment.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Assignment");
}

export async function addMilestone(userId: string, assignmentId: string, raw: unknown) {
  const input = milestoneInput.parse(raw);
  const a = await getAssignment(userId, assignmentId);
  const order = (a.milestones.at(-1)?.order ?? 0) + 1;
  return db.assignmentMilestone.create({ data: { ...input, userId, assignmentId, order, origin: "STUDENT" } });
}

export async function setMilestoneDone(userId: string, id: string, done: boolean) {
  const { count } = await db.assignmentMilestone.updateMany({ where: { id, userId }, data: { doneAt: done ? new Date() : null } });
  if (count === 0) throw new NotFoundError("Step");
}

export async function deleteMilestone(userId: string, id: string) {
  const { count } = await db.assignmentMilestone.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Step");
}
