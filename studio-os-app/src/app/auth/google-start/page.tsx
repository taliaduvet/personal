"use client";

import { useEffect, useRef } from "react";
import { getStoredCalendarClientId } from "@/lib/google/calendar-auth";
import { readPendingOAuth, startRedirectOAuth } from "@/lib/google/gis-oauth";

/** Same-tab Google OAuth — direct navigation, no GSI popups. */
export default function GoogleStartPage() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const pending = readPendingOAuth();
    const clientId = getStoredCalendarClientId();

    if (!pending || !clientId) {
      window.location.replace("/settings");
      return;
    }

    void startRedirectOAuth(clientId, pending.scope, pending);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-lg font-semibold text-ink">Taking you to Google…</p>
      <p className="mt-2 text-sm text-muted">Approve access, then you&apos;ll return to Settings.</p>
    </main>
  );
}
