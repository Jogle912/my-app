import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../auth";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/** The signed-in student, or null. Reads the request, so callers must sit inside <Suspense>. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

/**
 * The signed-in student, or a redirect to sign-in. Every page and server action that touches
 * student data starts here; the returned id is the ONLY user id passed to repositories.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}
