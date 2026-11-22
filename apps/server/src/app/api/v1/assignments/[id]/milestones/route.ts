import { addMilestone } from "@/server/access/assignments";
import { apiRoute, body } from "@/server/api";

export const POST = apiRoute<{ id: string }>(async ({ req, user, params }) => ({ milestone: await addMilestone(user.id, params.id, await body(req)) }));
