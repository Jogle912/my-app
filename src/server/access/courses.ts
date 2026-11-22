import "server-only";
import { db } from "../db";
import { NotFoundError } from "./errors";
import { courseInput, meetingInput } from "./schemas";

export async function listCourses(userId: string) {
  return db.course.findMany({
    where: { userId, archived: false },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    include: { _count: { select: { assignments: true } } },
  });
}

export async function getCourse(userId: string, id: string) {
  const course = await db.course.findFirst({
    where: { id, userId },
    include: {
      meetings: { orderBy: { startTime: "asc" } },
      assignments: { orderBy: { dueAt: "asc" } },
    },
  });
  if (!course) throw new NotFoundError("Course");
  return course;
}

export async function createCourse(userId: string, raw: unknown) {
  const input = courseInput.parse(raw);
  return db.course.create({ data: { ...input, userId, source: "MANUAL" } });
}

export async function updateCourse(userId: string, id: string, raw: unknown) {
  const input = courseInput.parse(raw);
  const { count } = await db.course.updateMany({ where: { id, userId }, data: input });
  if (count === 0) throw new NotFoundError("Course");
}

export async function deleteCourse(userId: string, id: string) {
  const { count } = await db.course.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Course");
}

export async function addMeeting(userId: string, courseId: string, raw: unknown) {
  const input = meetingInput.parse(raw);
  await getCourse(userId, courseId); // ownership check (the composite FK is the backstop)
  return db.classMeeting.create({ data: { ...input, userId, courseId } });
}

export async function deleteMeeting(userId: string, id: string) {
  const { count } = await db.classMeeting.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Class meeting");
}
