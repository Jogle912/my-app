import { addEvent, listEvents } from "@/server/access/schedule";
import { apiRoute, body } from "@/server/api";

export const GET = apiRoute(async ({ user }) => ({ events: await listEvents(user.id, new Date()) }));
export const POST = apiRoute(async ({ req, user }) => ({ event: await addEvent(user.id, await body(req)) }));
