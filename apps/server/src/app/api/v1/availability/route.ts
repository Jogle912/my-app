import { addAvailability, listAvailability } from "@/server/access/schedule";
import { apiRoute, body } from "@/server/api";

export const GET = apiRoute(async ({ user }) => ({ rules: await listAvailability(user.id) }));
export const POST = apiRoute(async ({ req, user }) => ({ rule: await addAvailability(user.id, await body(req)) }));
