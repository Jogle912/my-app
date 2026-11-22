import { deleteCourse, getCourse, updateCourse } from "@/server/access/courses";
import { apiRoute, body } from "@/server/api";

type P = { id: string };
export const GET = apiRoute<P>(async ({ user, params }) => ({ course: await getCourse(user.id, params.id) }));
export const PATCH = apiRoute<P>(async ({ req, user, params }) => {
  await updateCourse(user.id, params.id, await body(req));
  return { course: await getCourse(user.id, params.id) };
});
export const DELETE = apiRoute<P>(async ({ user, params }) => deleteCourse(user.id, params.id));
