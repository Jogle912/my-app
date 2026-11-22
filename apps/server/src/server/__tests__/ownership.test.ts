import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { fixedClock } from "@studypilot/scheduler";
import { db } from "@/server/db";
import * as A from "@/server/access/assignments";
import * as C from "@/server/access/courses";
import { NotFoundError } from "@/server/access/errors";
import { loadStudentRecords, planForStudent } from "@/server/access/planning";
import * as S from "@/server/access/schedule";
import { makeUser, resetDb } from "@/test/db";

const NOW = new Date("2026-11-23T14:00:00Z"); // Mon 08:00 Chicago
const due = (days: number) => new Date(NOW.getTime() + days * 86_400_000);

let alice: string;
let bob: string;
let aliceCourse: string;
let aliceAssignment: string;
let aliceMilestone: string;

beforeEach(async () => {
  await resetDb();
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
  aliceCourse = (await C.createCourse(alice, { name: "Calculus I", difficulty: 5 })).id;
  await C.createCourse(bob, { name: "History" });
  aliceAssignment = (await A.createAssignment(alice, { courseId: aliceCourse, title: "PS 7", dueAt: due(3), estimatedMinutes: 120 })).id;
  aliceMilestone = (await A.addMilestone(alice, aliceAssignment, { title: "Part A", estimatedMinutes: 60 })).id;
});

describe("cross-student isolation (fails closed)", () => {
  it("lists only the caller's own courses", async () => {
    expect((await C.listCourses(bob)).map((c) => c.name)).toEqual(["History"]);
    expect((await C.listCourses(alice)).map((c) => c.name)).toEqual(["Calculus I"]);
  });

  it("can't read, update or delete another student's course", async () => {
    await expect(C.getCourse(bob, aliceCourse)).rejects.toBeInstanceOf(NotFoundError);
    await expect(C.updateCourse(bob, aliceCourse, { name: "Hacked" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(C.deleteCourse(bob, aliceCourse)).rejects.toBeInstanceOf(NotFoundError);
    expect((await C.getCourse(alice, aliceCourse)).name).toBe("Calculus I");
  });

  it("can't attach meetings or assignments to another student's course", async () => {
    await expect(C.addMeeting(bob, aliceCourse, { days: [1], startTime: "09:00", endTime: "10:00" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.createAssignment(bob, { courseId: aliceCourse, title: "x", dueAt: due(2) })).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.assignment.count({ where: { userId: bob } })).toBe(0);
    expect(await db.classMeeting.count()).toBe(0);
  });

  it("can't read, change or delete another student's assignment or its steps", async () => {
    await expect(A.getAssignment(bob, aliceAssignment)).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.updateAssignmentProgress(bob, aliceAssignment, { studentDone: true })).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.deleteAssignment(bob, aliceAssignment)).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.addMilestone(bob, aliceAssignment, { title: "x", estimatedMinutes: 10 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.setMilestoneDone(bob, aliceMilestone, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(A.deleteMilestone(bob, aliceMilestone)).rejects.toBeInstanceOf(NotFoundError);
    const a = await A.getAssignment(alice, aliceAssignment);
    expect(a.studentDone).toBe(false);
    expect(a.milestones).toHaveLength(1);
  });

  it("can't move another student's course into your own assignment", async () => {
    const bobCourse = (await C.listCourses(bob))[0].id;
    const bobA = await A.createAssignment(bob, { courseId: bobCourse, title: "Essay", dueAt: due(4) });
    await expect(A.updateAssignment(bob, bobA.id, { courseId: aliceCourse, title: "Essay", dueAt: due(4) })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("can't delete another student's availability or events", async () => {
    const rule = await S.addAvailability(alice, { kind: "AVAILABLE", days: [1, 2], startTime: "18:00", endTime: "21:00" });
    const ev = await S.addEvent(alice, { title: "Dentist", startAt: due(1), endAt: new Date(due(1).getTime() + 3600_000) });
    await expect(S.deleteAvailability(bob, rule.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(S.deleteEvent(bob, ev.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await S.listAvailability(bob)).toEqual([]);
    expect(await S.listEvents(bob, NOW)).toEqual([]);
  });

  it("the database itself rejects cross-student links even if app code is bypassed", async () => {
    await expect(
      db.assignment.create({ data: { userId: bob, courseId: aliceCourse, title: "sneaky", dueAt: due(1) } }),
    ).rejects.toThrow();
    await expect(
      db.assignmentMilestone.create({ data: { userId: bob, assignmentId: aliceAssignment, order: 9, title: "x", estimatedMinutes: 5 } }),
    ).rejects.toThrow();
  });

  it("planning input for one student never contains another student's records", async () => {
    const records = await loadStudentRecords(bob, NOW);
    const ids = JSON.stringify(records);
    expect(ids).not.toContain(aliceCourse);
    expect(ids).not.toContain(aliceAssignment);
    expect(ids).not.toContain("Calculus");
  });

  it("deleting a student removes all of their data", async () => {
    await db.user.delete({ where: { id: alice } });
    expect(await db.course.count({ where: { userId: alice } })).toBe(0);
    expect(await db.assignment.count({ where: { userId: alice } })).toBe(0);
    expect(await db.assignmentMilestone.count({ where: { userId: alice } })).toBe(0);
    expect(await db.course.count({ where: { userId: bob } })).toBe(1);
  });
});

describe("validation", () => {
  it("rejects bad input before it reaches the database", async () => {
    await expect(C.createCourse(alice, { name: "  " })).rejects.toBeInstanceOf(ZodError);
    await expect(C.addMeeting(alice, aliceCourse, { days: [1], startTime: "10:00", endTime: "09:00" })).rejects.toBeInstanceOf(ZodError);
    await expect(C.addMeeting(alice, aliceCourse, { days: [], startTime: "09:00", endTime: "10:00" })).rejects.toBeInstanceOf(ZodError);
    await expect(S.addAvailability(alice, { kind: "AVAILABLE", days: [1], startTime: "25:00", endTime: "10:00" })).rejects.toBeInstanceOf(ZodError);
    await expect(S.updatePreferences(alice, { ...(await S.getPreferences(alice)), timeZone: "Mars/Base" })).rejects.toBeInstanceOf(ZodError);
  });
});

describe("planning from saved data", () => {
  it("builds a plan for the student's own assignments within their availability", async () => {
    await S.addAvailability(alice, { kind: "AVAILABLE", days: [1, 2, 3, 4, 5, 6, 7], startTime: "18:00", endTime: "22:00" });
    const { result } = await planForStudent(alice, fixedClock(NOW.toISOString()));
    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.sessions.every((s) => s.itemId === aliceAssignment)).toBe(true);
    expect(result.capacity.demandMinutes).toBe(60); // only the milestone's 60 min; milestones replace the whole estimate
    expect(result.shortfalls).toEqual([]);
  });

  it("a student with no availability gets an honest shortfall", async () => {
    const { result, hasAvailability } = await planForStudent(alice, fixedClock(NOW.toISOString()));
    expect(hasAvailability).toBe(false);
    expect(result.sessions).toEqual([]);
    expect(result.shortfalls[0]?.itemId).toBe(aliceAssignment);
  });
});
