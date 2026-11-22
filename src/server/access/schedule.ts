import "server-only";
import { db } from "../db";
import { NotFoundError } from "./errors";
import { availabilityInput, eventInput, preferencesInput } from "./schemas";

export async function getPreferences(userId: string) {
  // Created at sign-up; upsert covers accounts created before that hook existed.
  return db.studentPreferences.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function updatePreferences(userId: string, raw: unknown) {
  const input = preferencesInput.parse(raw);
  await db.studentPreferences.upsert({ where: { userId }, create: { userId, ...input }, update: input });
}

export async function listAvailability(userId: string) {
  return db.availabilityRule.findMany({ where: { userId }, orderBy: [{ kind: "asc" }, { startTime: "asc" }, { id: "asc" }] });
}

export async function addAvailability(userId: string, raw: unknown) {
  const input = availabilityInput.parse(raw);
  return db.availabilityRule.create({ data: { ...input, userId } });
}

export async function deleteAvailability(userId: string, id: string) {
  const { count } = await db.availabilityRule.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Availability rule");
}

export async function listEvents(userId: string, from: Date) {
  return db.calendarEvent.findMany({ where: { userId, endAt: { gte: from } }, orderBy: [{ startAt: "asc" }, { id: "asc" }] });
}

export async function addEvent(userId: string, raw: unknown) {
  const input = eventInput.parse(raw);
  return db.calendarEvent.create({ data: { ...input, userId, source: "MANUAL" } });
}

export async function deleteEvent(userId: string, id: string) {
  const { count } = await db.calendarEvent.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Event");
}
