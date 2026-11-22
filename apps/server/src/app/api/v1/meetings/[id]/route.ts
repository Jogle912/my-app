import { deleteMeeting } from "@/server/access/courses";
import { apiRoute } from "@/server/api";

export const DELETE = apiRoute<{ id: string }>(async ({ user, params }) => deleteMeeting(user.id, params.id));
