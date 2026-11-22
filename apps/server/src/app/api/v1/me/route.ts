import { apiRoute } from "@/server/api";

export const GET = apiRoute(async ({ user }) => ({ user }));
