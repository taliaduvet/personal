import { NextRequest, NextResponse } from "next/server";
import { OAUTH_REFRESH_COOKIE } from "@/lib/google/oauth-pkce";
import { refreshCookieAttributes } from "@/lib/google/oauth-refresh-cookie";
import { refreshGoogleAccessToken } from "@/lib/google/oauth-server";

function clearRefreshCookie(request: NextRequest, response: NextResponse) {
  response.cookies.set(OAUTH_REFRESH_COOKIE, "", {
    ...refreshCookieAttributes(request),
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
      response.cookies.set(OAUTH_REFRESH_COOKIE, tokens.refresh_token, refreshCookieAttributes(request));
    }
    return response;
  } catch (e) {
    const response = NextResponse.json(
      { error: e instanceof Error ? e.message : "refresh_failed" },
      { status: 401 }
    );
    clearRefreshCookie(request, response);
    return response;
  }
}

/** DELETE — clear remembered Google session (Disconnect). */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearRefreshCookie(request, response);
  return response;
}
