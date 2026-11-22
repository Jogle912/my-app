import { createCourse, listCourses } from "@/server/access/courses";
import { apiRoute, body } from "@/server/api";

export const GET = apiRoute(async ({ user }) => ({ courses: await listCourses(user.id) }));
export const POST = apiRoute(async ({ req, user }) => ({ course: await createCourse(user.id, await body(req)) }));
