import { deleteEvent } from "@/server/access/schedule";
import { apiRoute } from "@/server/api";

export const DELETE = apiRoute<{ id: string }>(async ({ user, params }) => deleteEvent(user.id, params.id));
