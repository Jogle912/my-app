import "server-only";
import { ZodError } from "zod";
import { NotFoundError } from "./access/errors";
import { auth } from "./auth";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

type Handler<P> = (ctx: { req: Request; user: ApiUser; params: P }) => Promise<unknown>;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Wraps a JSON API route for the mobile app:
 * - the user comes only from the session (cookie sent by the app), never from the request body;
 * - mutations must be `application/json`, which blocks cross-site form posts (CSRF);
 * - validation errors → 400, missing or other students' records → 404 (indistinguishable).
 */
export function apiRoute<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return json({ error: "unauthorized" }, 401);
    if (req.method !== "GET" && req.method !== "DELETE" && !req.headers.get("content-type")?.startsWith("application/json")) {
      return json({ error: "unsupported_media_type" }, 415);
    }
    try {
      const params = (await ctx.params) ?? ({} as P);
      const result = await handler({ req, user: { id: session.user.id, name: session.user.name, email: session.user.email }, params });
      return result instanceof Response ? result : json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof ZodError) {
        return json({ error: "invalid", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
      }
      if (e instanceof NotFoundError) return json({ error: "not_found", message: e.message }, 404);
      if (e instanceof SyntaxError) return json({ error: "invalid_json" }, 400);
      console.error("API error", e);
      return json({ error: "internal" }, 500);
    }
  };
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  const data: unknown = await req.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new SyntaxError("Expected a JSON object");
  return data as Record<string, unknown>;
}
