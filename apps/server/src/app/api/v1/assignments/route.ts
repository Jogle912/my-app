import { createAssignment, listUpcomingAssignments } from "@/server/access/assignments";
import { apiRoute, body } from "@/server/api";

export const GET = apiRoute(async ({ user }) => ({ assignments: await listUpcomingAssignments(user.id, new Date()) }));
export const POST = apiRoute(async ({ req, user }) => ({ assignment: await createAssignment(user.id, await body(req)) }));
