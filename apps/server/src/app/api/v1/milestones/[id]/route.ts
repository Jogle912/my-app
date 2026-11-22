import { z } from "zod";
import { deleteMilestone, setMilestoneDone } from "@/server/access/assignments";
import { apiRoute, body } from "@/server/api";

type P = { id: string };
const patch = z.object({ done: z.boolean() });
export const PATCH = apiRoute<P>(async ({ req, user, params }) => setMilestoneDone(user.id, params.id, patch.parse(await body(req)).done));
export const DELETE = apiRoute<P>(async ({ user, params }) => deleteMilestone(user.id, params.id));
