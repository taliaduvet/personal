"use client";

import { useEffect, useRef, useState } from "react";
import {
  appendReturnQuery,
  writeUnifiedTokenFromRedirect,
} from "@/lib/google/google-unified-auth";
import { clearPendingOAuth, readPendingOAuth } from "@/lib/google/gis-oauth";
import {
  applyOAuthToken,
  notifyOAuthComplete,
  parseOAuthResponseFromUrl,
  stripOAuthParamsFromUrl,
} from "@/lib/google/oauth-callback";

export default function GoogleTokenCallbackPage() {
  const [message, setMessage] = useState("Finishing Google sign-in…");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const urlError = new URLSearchParams(window.location.search).get("error");
    const pending = readPendingOAuth();

    if (urlError) {
      setMessage(`Sign-in failed: ${urlError}. Go back to Settings and try again.`);
      clearPendingOAuth();
      return;
    }

    const fromUrl = parseOAuthResponseFromUrl();
    if (!fromUrl) {
      setMessage("Could not read sign-in response. Go back to Settings and try Connect again.");
      return;
    }

    if (handled.current) return;
    handled.current = true;

    if (pending) {
      applyOAuthToken(pending, fromUrl.access_token, fromUrl.expires_in);
    } else {
      writeUnifiedTokenFromRedirect(fromUrl.access_token, fromUrl.expires_in);
      notifyOAuthComplete();
    }

    clearPendingOAuth();
    stripOAuthParamsFromUrl();

    const dest = appendReturnQuery(pending?.returnUrl || "/settings", "google_connected", "1");
    setMessage("Connected! Returning to Settings…");
    notifyOAuthComplete();
    window.location.replace(dest);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-lg font-semibold text-ink">{message}</p>
      <p className="mt-2 text-sm text-muted">You&apos;ll return to the app in a moment.</p>
      <a href="/settings" className="mt-4 text-sm text-accent hover:text-accent-ink">
        Back to Settings
      </a>
    </main>
  );
}
