import type { NextRequest } from "next/server";

/** Shared by the OAuth callback route (sets this cookie) and the refresh route (reads/rotates it). */
export const OAUTH_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function refreshCookieAttributes(request: NextRequest) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    // OR'd with NODE_ENV so a proxy that misreports the request protocol can't
    // silently downgrade this cookie to non-secure in production.
    secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    maxAge: OAUTH_REFRESH_COOKIE_MAX_AGE,
  };
}
