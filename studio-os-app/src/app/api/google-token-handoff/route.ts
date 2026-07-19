import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_ACCESS_HANDOFF_COOKIE,
  OAUTH_EXPIRES_HANDOFF_COOKIE,
} from "@/lib/google/oauth-pkce";

function clearHandoff(response: NextResponse) {
  response.cookies.set(OAUTH_ACCESS_HANDOFF_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(OAUTH_EXPIRES_HANDOFF_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * One-shot redeem of the access token set by /api/google-oauth-callback.
 * Keeps tokens out of the address bar / history.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(OAUTH_ACCESS_HANDOFF_COOKIE)?.value;
  const expiresRaw = request.cookies.get(OAUTH_EXPIRES_HANDOFF_COOKIE)?.value;
  const expiresIn = expiresRaw ? parseInt(expiresRaw, 10) : NaN;

  if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    const response = NextResponse.json({ error: "no_handoff" }, { status: 404 });
    clearHandoff(response);
    return response;
  }

  const response = NextResponse.json({
    access_token: accessToken,
    expires_in: expiresIn,
  });
  clearHandoff(response);
  return response;
}
