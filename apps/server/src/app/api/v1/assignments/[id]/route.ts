import { deleteAssignment, getAssignment, updateAssignment } from "@/server/access/assignments";
import { apiRoute, body } from "@/server/api";

type P = { id: string };
export const GET = apiRoute<P>(async ({ user, params }) => ({ assignment: await getAssignment(user.id, params.id) }));
export const PATCH = apiRoute<P>(async ({ req, user, params }) => {
  await updateAssignment(user.id, params.id, await body(req));
  return { assignment: await getAssignment(user.id, params.id) };
});
export const DELETE = apiRoute<P>(async ({ user, params }) => deleteAssignment(user.id, params.id));
