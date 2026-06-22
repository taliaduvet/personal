"use client";

import { useState } from "react";
import {
  getStoredCalendarClientId,
  GOOGLE_CLIENT_ID,
  saveCalendarClientId,
} from "@/lib/google/calendar-auth";
import { useCalendarAccessToken } from "@/lib/calendar/use-calendar-access-token";

type Props = {
  compact?: boolean;
};

export function CalendarConnect({ compact = false }: Props) {
  const { token, directConnected, optedOut, connect, disconnect } = useCalendarAccessToken();
  const [clientId, setClientId] = useState(() => getStoredCalendarClientId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsClientId = !GOOGLE_CLIENT_ID && !clientId.trim();

  async function handleConnect() {
    setError(null);
    setBusy(true);
    try {
      if (needsClientId) {
        setError("Paste your Google Client ID below first.");
        return;
      }
      saveCalendarClientId(clientId);
      await connect(clientId);
    } catch (e) {
      if (e instanceof Error && e.message === "REDIRECTING_TO_GOOGLE") return;
      setError(e instanceof Error ? e.message : "Could not connect calendar");
    } finally {
      setBusy(false);
    }
  }

  if (directConnected) {
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <p className="text-muted">
          Google Calendar connected
          {!compact && " — deadlines and doing blocks sync to your Studio OS calendar."}
        </p>
        <button
          type="button"
          onClick={() => disconnect()}
          className="mt-2 text-xs text-muted hover:text-ink"
        >
          Disconnect calendar
        </button>
      </div>
    );
  }

  if (token && !optedOut && !directConnected) {
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <p className="text-muted">Calendar linked via app sign-in (read-only).</p>
        <button
          type="button"
          onClick={() => disconnect()}
          className="mt-2 text-xs text-muted hover:text-ink"
        >
          Disconnect calendar
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={compact ? "text-xs text-muted" : "text-sm text-muted"}>
        Connect Google Calendar to sync deadlines and see commitment hours when planning your week.
      </p>

      {needsClientId && (
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            Google Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="123456789.apps.googleusercontent.com"
            className="mt-1 w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-ink"
          />
          <p className="mt-1 text-[11px] text-faint">
            From Google Cloud Console → OAuth client (Web). Add{" "}
            <code className="text-muted">http://localhost:3000</code> as authorized origin.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-[#bc6740]">{error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={handleConnect}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
      >
        {busy ? "Connecting…" : "Connect Google Calendar"}
      </button>
    </div>
  );
}
