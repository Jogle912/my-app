import { getPreferences, updatePreferences } from "@/server/access/schedule";
import { apiRoute, body } from "@/server/api";

export const GET = apiRoute(async ({ user }) => ({ preferences: await getPreferences(user.id) }));
export const PUT = apiRoute(async ({ req, user }) => {
  await updatePreferences(user.id, await body(req));
  return { preferences: await getPreferences(user.id) };
});
