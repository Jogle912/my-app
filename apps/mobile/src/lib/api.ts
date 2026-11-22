import { Platform } from "react-native";
import { authClient } from "./auth-client";
import { API_URL } from "./config";

export interface Issue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly issues: Issue[] = [],
  ) {
    super(ApiError.describe(status, code, issues));
    this.name = "ApiError";
  }

  static describe(status: number, code: string, issues: Issue[]): string {
    if (issues.length) return issues.map((i) => i.message).join("\n");
    if (status === 0) return "Can't reach StudyPilot. Check your connection and try again.";
    if (status === 401) return "Your session has ended. Please sign in again.";
    if (status === 404) return "That item no longer exists.";
    return "Something went wrong. Please try again.";
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Calls the StudyPilot API as the signed-in student. Throws ApiError with a user-readable message. */
export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  // Native: the session lives in secure storage and is sent as a Cookie header.
  // Web (used only for automated screen tests): the browser manages the cookie itself.
  const cookie = Platform.OS === "web" ? undefined : await authClient.getCookie();
  let res: Response;
  try {
    res = await fetchImpl(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      // With a stored cookie, send only that; otherwise let the browser attach its own.
      credentials: cookie ? "omit" : "include",
    });
  } catch {
    throw new ApiError(0, "network");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: Issue[] };
  if (!res.ok) throw new ApiError(res.status, data.error ?? "error", data.issues ?? []);
  return data as T;
}
