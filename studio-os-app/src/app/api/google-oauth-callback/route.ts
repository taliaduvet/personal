import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/google/oauth-pkce";
import { exchangeGoogleAuthCode } from "@/lib/google/oauth-server";

const CALLBACK_PAGE = "/auth/google-token";
const REDIRECT_PATH = "/api/google-oauth-callback";

function finishRedirect(
  request: NextRequest,
  params: { access_token?: string | null; expires_in?: string | null; error?: string | null }
) {
  const url = request.nextUrl.clone();
  url.pathname = CALLBACK_PAGE;
  url.search = "";

  const { access_token, expires_in, error } = params;

  if (error) {
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  if (access_token && expires_in) {
    url.searchParams.set("access_token", access_token);
    url.searchParams.set("expires_in", expires_in);
    const response = NextResponse.redirect(url);
    response.cookies.delete(OAUTH_VERIFIER_COOKIE);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  url.searchParams.set("error", "missing_token");
  return NextResponse.redirect(url);
}

/** Legacy implicit-flow hash forward (kept for older GIS callbacks). */
function hashForwardHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Google sign-in</title></head><body><p>Finishing sign-in…</p><script>
(function(){
  var finish=new URL(${JSON.stringify(CALLBACK_PAGE)},location.origin);
  var token=null,expiry=null,err=null;
  if(location.hash){var h=new URLSearchParams(location.hash.slice(1));token=h.get("access_token");expiry=h.get("expires_in");err=h.get("error");}
  if(!token){var q=new URLSearchParams(location.search);token=q.get("access_token");expiry=q.get("expires_in");err=err||q.get("error");}
  if(err)finish.searchParams.set("error",err);
  else if(token&&expiry){finish.searchParams.set("access_token",token);finish.searchParams.set("expires_in",expiry);}
  else finish.searchParams.set("error","missing_token");
  location.replace(finish.pathname+finish.search);
})();
</script></body></html>`;
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (error) {
    return finishRedirect(request, { error });
  }

  if (code) {
    const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const rawVerifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
    const verifier = rawVerifier ? decodeURIComponent(rawVerifier) : null;

    if (!state || !cookieState || state !== cookieState || !verifier) {
      return finishRedirect(request, { error: "invalid_oauth_state" });
    }

    const redirectUri = `${request.nextUrl.origin}${REDIRECT_PATH}`;

    try {
      const tokens = await exchangeGoogleAuthCode(code, verifier, redirectUri);
      return finishRedirect(request, {
        access_token: tokens.access_token,
        expires_in: String(tokens.expires_in),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "token_exchange_failed";
      return finishRedirect(request, { error: msg });
    }
  }

  const access_token = request.nextUrl.searchParams.get("access_token");
  const expires_in = request.nextUrl.searchParams.get("expires_in");
  if (access_token && expires_in) {
    return finishRedirect(request, { access_token, expires_in });
  }

  return new NextResponse(hashForwardHtml(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** GIS form_post token callback (legacy). */
export async function POST(request: NextRequest) {
  let access_token: string | null = null;
  let expires_in: string | null = null;
  let error: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    access_token = params.get("access_token");
    expires_in = params.get("expires_in");
    error = params.get("error");
  } else {
    try {
      const form = await request.formData();
      access_token = form.get("access_token") as string | null;
      expires_in = form.get("expires_in") as string | null;
      error = form.get("error") as string | null;
    } catch {
      /* ignore */
    }
  }

  return finishRedirect(request, { access_token, expires_in, error });
}
