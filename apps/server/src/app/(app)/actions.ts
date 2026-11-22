"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/forms";
import { localInputToDate } from "@/lib/localTime";
import * as A from "@/server/access/assignments";
import * as C from "@/server/access/courses";
import * as S from "@/server/access/schedule";
import { run } from "./run";

type Prev = ActionState;
const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : undefined;
};
const optNum = (f: FormData, k: string) => (str(f, k) ? str(f, k) : undefined);
const days = (f: FormData) => f.getAll("days").map(String);

async function zoneFor(userId: string) {
  return (await S.getPreferences(userId)).timeZone;
}

// ── Courses ──────────────────────────────────────────────
export async function createCourse(_p: Prev, f: FormData) {
  return run((uid) => C.createCourse(uid, { name: str(f, "name"), code: str(f, "code"), term: str(f, "term"), difficulty: str(f, "difficulty") }));
}

export async function updateCourse(id: string, _p: Prev, f: FormData) {
  return run((uid) => C.updateCourse(uid, id, { name: str(f, "name"), code: str(f, "code"), term: str(f, "term"), difficulty: str(f, "difficulty") }));
}

export async function deleteCourse(id: string, _p: Prev, _f: FormData) {
  void _f;
  const result = await run((uid) => C.deleteCourse(uid, id));
  if (result.ok) redirect("/courses");
  return result;
}

export async function addMeeting(courseId: string, _p: Prev, f: FormData) {
  return run((uid) =>
    C.addMeeting(uid, courseId, { days: days(f), startTime: str(f, "startTime"), endTime: str(f, "endTime"), location: str(f, "location") }),
  );
}

export async function deleteMeeting(id: string, _p: Prev, _f: FormData) {
  void _f;
  return run((uid) => C.deleteMeeting(uid, id));
}

// ── Assignments ──────────────────────────────────────────
async function assignmentFields(uid: string, f: FormData) {
  return {
    courseId: str(f, "courseId"),
    title: str(f, "title"),
    description: str(f, "description"),
    kind: str(f, "kind"),
    dueAt: localInputToDate(str(f, "dueAt") ?? "", await zoneFor(uid)),
    estimatedMinutes: optNum(f, "estimatedMinutes"),
    priority: str(f, "priority"),
  };
}

export async function createAssignment(_p: Prev, f: FormData) {
  return run(async (uid) => A.createAssignment(uid, await assignmentFields(uid, f)));
}

export async function updateAssignment(id: string, _p: Prev, f: FormData) {
  return run(async (uid) => A.updateAssignment(uid, id, await assignmentFields(uid, f)));
}

export async function updateProgress(id: string, _p: Prev, f: FormData) {
  return run((uid) =>
    A.updateAssignmentProgress(uid, id, { completedMinutes: optNum(f, "completedMinutes"), studentDone: f.get("studentDone") === "on" }),
  );
}

export async function deleteAssignment(id: string, courseId: string, _p: Prev, _f: FormData) {
  void _f;
  const result = await run((uid) => A.deleteAssignment(uid, id));
  if (result.ok) redirect(`/courses/${courseId}`);
  return result;
}

export async function addMilestone(assignmentId: string, _p: Prev, f: FormData) {
  return run((uid) => A.addMilestone(uid, assignmentId, { title: str(f, "title"), estimatedMinutes: str(f, "estimatedMinutes") }));
}

export async function toggleMilestone(id: string, done: boolean, _p: Prev, _f: FormData) {
  void _f;
  return run((uid) => A.setMilestoneDone(uid, id, done));
}

export async function deleteMilestone(id: string, _p: Prev, _f: FormData) {
  void _f;
  return run((uid) => A.deleteMilestone(uid, id));
}

// ── Schedule settings ────────────────────────────────────
export async function updatePreferences(_p: Prev, f: FormData) {
  const keys = [
    "timeZone", "sleepStart", "sleepEnd", "maxStudyMinutesPerDay", "preferredSessionMinutes", "minSessionMinutes",
    "breakMinutes", "deadlineBufferHours", "energyMorning", "energyAfternoon", "energyEvening",
  ];
  return run((uid) => S.updatePreferences(uid, Object.fromEntries(keys.map((k) => [k, str(f, k)]))));
}

export async function addAvailability(_p: Prev, f: FormData) {
  return run((uid) =>
    S.addAvailability(uid, { kind: str(f, "kind"), label: str(f, "label"), days: days(f), startTime: str(f, "startTime"), endTime: str(f, "endTime") }),
  );
}

export async function deleteAvailability(id: string, _p: Prev, _f: FormData) {
  void _f;
  return run((uid) => S.deleteAvailability(uid, id));
}

export async function addEvent(_p: Prev, f: FormData) {
  return run(async (uid) => {
    const zone = await zoneFor(uid);
    return S.addEvent(uid, {
      title: str(f, "title"),
      startAt: localInputToDate(str(f, "startAt") ?? "", zone),
      endAt: localInputToDate(str(f, "endAt") ?? "", zone),
    });
  });
}

export async function deleteEvent(id: string, _p: Prev, _f: FormData) {
  void _f;
  return run((uid) => S.deleteEvent(uid, id));
}
