import { addMeeting } from "@/server/access/courses";
import { apiRoute, body } from "@/server/api";

export const POST = apiRoute<{ id: string }>(async ({ req, user, params }) => ({ meeting: await addMeeting(user.id, params.id, await body(req)) }));
