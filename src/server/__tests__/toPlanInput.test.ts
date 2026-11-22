import { describe, expect, it } from "vitest";
import { type AssignmentRecord, needsPlanning, type StudentRecords, toPlanInput } from "@/server/planning/toPlanInput";

const base = (over: Partial<AssignmentRecord> = {}): AssignmentRecord => ({
  id: "a1",
  courseId: "c1",
  title: "PS",
  kind: "HOMEWORK",
  dueAt: new Date("2026-11-27T05:59:00Z"),
  personalDueAt: null,
  unlockAt: null,
  estimatedMinutes: null,
  completedMinutes: 0,
  priority: 3,
  ignored: false,
  studentDone: false,
  submissionState: "NONE",
  removedUpstream: false,
  milestones: [],
  ...over,
});

const records = (assignments: AssignmentRecord[]): StudentRecords => ({
  prefs: {
    timeZone: "America/Chicago", sleepStart: "23:30", sleepEnd: "07:30", maxStudyMinutesPerDay: 240, preferredSessionMinutes: 50,
    minSessionMinutes: 25, breakMinutes: 10, deadlineBufferHours: 24, energyMorning: 2, energyAfternoon: 2, energyEvening: 2,
    maxSameCourseSessionsPerDay: 2,
  },
  rules: [
    { id: "r1", kind: "AVAILABLE", label: null, days: [1, 2], startTime: "18:00", endTime: "21:00" },
    { id: "r2", kind: "BLOCKED", label: "Job", days: [3], startTime: "16:00", endTime: "21:00" },
  ],
  courses: [{ id: "c1", name: "Calc", difficulty: 4 }],
  meetings: [{ id: "m1", courseId: "c1", days: [1, 3, 5], startTime: "09:00", endTime: "09:50" }],
  assignments,
  events: [
    { id: "e1", title: "Dentist", startAt: new Date("2026-11-24T21:00:00Z"), endAt: new Date("2026-11-24T22:00:00Z"), blocksStudy: true },
    { id: "e2", title: "Reminder", startAt: new Date("2026-11-24T21:00:00Z"), endAt: new Date("2026-11-24T22:00:00Z"), blocksStudy: false },
  ],
});

describe("toPlanInput", () => {
  it("excludes work that no longer needs planning (submitted in Canvas, done, ignored, removed)", () => {
    for (const over of [{ submissionState: "SUBMITTED" }, { submissionState: "GRADED" }, { studentDone: true }, { ignored: true }, { removedUpstream: true }]) {
      expect(needsPlanning(base(over))).toBe(false);
    }
    expect(needsPlanning(base({ submissionState: "MISSING" }))).toBe(true);
    const input = toPlanInput(records([base({ id: "x", submissionState: "SUBMITTED" }), base({ id: "y" })]));
    expect(input.items.map((i) => i.id)).toEqual(["y"]);
  });

  it("uses the student's earlier personal deadline, defaults, and maps kinds", () => {
    const input = toPlanInput(
      records([
        base({ id: "hw", personalDueAt: new Date("2026-11-26T05:59:00Z") }),
        base({ id: "ex", kind: "EXAM" }),
        base({ id: "rd", kind: "READING", estimatedMinutes: 30 }),
      ]),
    );
    const byId = Object.fromEntries(input.items.map((i) => [i.id, i]));
    expect(byId.hw.dueAt).toBe("2026-11-26T05:59:00.000Z");
    expect(byId.hw.estimatedMinutes).toBe(120);
    expect(byId.ex.kind).toBe("exam");
    expect(byId.rd).toMatchObject({ kind: "reading", estimatedMinutes: 30 });
  });

  it("marks finished steps as fully done and splits availability from blocked time", () => {
    const input = toPlanInput(
      records([
        base({
          milestones: [
            { id: "s1", title: "Outline", estimatedMinutes: 40, completedMinutes: 0, doneAt: new Date() },
            { id: "s2", title: "Draft", estimatedMinutes: 90, completedMinutes: 30, doneAt: null },
          ],
        }),
      ]),
    );
    expect(input.items[0].milestones).toEqual([
      { id: "s1", title: "Outline", estimatedMinutes: 40, completedMinutes: 40 },
      { id: "s2", title: "Draft", estimatedMinutes: 90, completedMinutes: 30 },
    ]);
    expect(input.availability.map((a) => a.id)).toEqual(["r1"]);
    expect(input.blocked?.map((a) => a.id)).toEqual(["r2"]);
    expect(input.events?.map((e) => e.id)).toEqual(["e1"]);
    expect(input.classMeetings?.[0]).toMatchObject({ courseId: "c1", start: "09:00", end: "09:50" });
  });
});
