import { getAssignment, updateAssignmentProgress } from "@/server/access/assignments";
import { apiRoute, body } from "@/server/api";

export const PATCH = apiRoute<{ id: string }>(async ({ req, user, params }) => {
  await updateAssignmentProgress(user.id, params.id, await body(req));
  return { assignment: await getAssignment(user.id, params.id) };
});
