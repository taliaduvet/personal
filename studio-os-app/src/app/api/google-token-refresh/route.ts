import { NextRequest, NextResponse } from "next/server";
import { OAUTH_REFRESH_COOKIE } from "@/lib/google/oauth-pkce";
import { refreshGoogleAccessToken } from "@/lib/google/oauth-server";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 180;

function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(OAUTH_REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** GET — has the browser got a stored refresh session? */
export async function GET(request: NextRequest) {
  const hasRefresh = Boolean(request.cookies.get(OAUTH_REFRESH_COOKIE)?.value);
  return NextResponse.json({ remembered: hasRefresh });
}

/**
 * POST — mint a fresh access token from the httpOnly refresh cookie.
 * Body unused; cookie carries the credential.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(OAUTH_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_session" }, { status: 401 });
  }

  try {
    const tokens = await refreshGoogleAccessToken(refreshToken);
    const response = NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    });
    // Google may rotate refresh tokens — keep the cookie current.
    if (tokens.refresh_token) {
      const secure = request.nextUrl.protocol === "https:";
      response.cookies.set(OAUTH_REFRESH_COOKIE, tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
        maxAge: REFRESH_MAX_AGE,
      });
    }
    return response;
  } catch (e) {
    const response = NextResponse.json(
      { error: e instanceof Error ? e.message : "refresh_failed" },
      { status: 401 }
    );
    clearRefreshCookie(response);
    return response;
  }
}

/** DELETE — clear remembered Google session (Disconnect). */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearRefreshCookie(response);
  return response;
}
