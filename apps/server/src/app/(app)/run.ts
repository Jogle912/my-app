import "server-only";
import { refresh } from "next/cache";
import { ZodError } from "zod";
import type { ActionState } from "@/components/forms";
import { NotFoundError } from "@/server/access/errors";
import { requireUser } from "@/server/access/session";

/**
 * Runs a mutation for the signed-in student: authorises from the session (never from form data),
 * turns validation and not-found errors into form messages, and refreshes the page on success.
 */
export async function run(fn: (userId: string) => Promise<unknown>): Promise<ActionState> {
  const user = await requireUser();
  try {
    await fn(user.id);
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
      return { fieldErrors };
    }
    if (e instanceof NotFoundError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: true };
}
