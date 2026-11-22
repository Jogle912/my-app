import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic check only: bounce visitors without a session cookie away from app pages.
 * Real authorisation happens in `requireUser()` on every page and server action.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/courses/:path*", "/assignments/:path*", "/settings/:path*", "/plan/:path*"],
};
