import { deleteAvailability } from "@/server/access/schedule";
import { apiRoute } from "@/server/api";

export const DELETE = apiRoute<{ id: string }>(async ({ user, params }) => deleteAvailability(user.id, params.id));
