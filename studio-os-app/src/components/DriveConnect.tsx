"use client";

import { useState } from "react";
import {
  getStoredCalendarClientId,
  GOOGLE_CLIENT_ID,
  saveCalendarClientId,
} from "@/lib/google/calendar-auth";
import { useDriveAuth } from "@/lib/google/use-drive-auth";
import { hasGooglePickerEnv } from "@/lib/google/picker";

type Props = {
  compact?: boolean;
};

export function DriveConnect({ compact = false }: Props) {
  const { connected, connect, disconnect } = useDriveAuth();
  const [clientId, setClientId] = useState(() => getStoredCalendarClientId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsClientId = !GOOGLE_CLIENT_ID && !clientId.trim();
  const pickerReady = hasGooglePickerEnv();

  async function handleConnect() {
    if (needsClientId) {
      setError("Paste your Google Client ID below first.");
      return;
    }
    if (!pickerReady) {
      setError("Add NEXT_PUBLIC_GOOGLE_API_KEY to enable the Drive picker.");
      return;
    }
    saveCalendarClientId(clientId);
    setError(null);
    setBusy(true);
    try {
      await connect(clientId);
    } catch (e) {
      if (e instanceof Error && e.message === "REDIRECTING_TO_GOOGLE") return;
      setError(e instanceof Error ? e.message : "Could not connect Google Drive");
    } finally {
      setBusy(false);
    }
  }

  if (connected) {
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <p className="text-muted">
          Google Drive connected
          {!compact && " — browse folders and docs when linking projects."}
        </p>
        <button
          type="button"
          onClick={() => disconnect()}
          className="mt-2 text-xs text-muted hover:text-ink"
        >
          Disconnect Drive
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={compact ? "text-xs text-muted" : "text-sm text-muted"}>
        Connect Google Drive to pick folders and docs directly — no copy-pasting links.
      </p>

      {!pickerReady && (
        <p className="text-xs text-[#bc6740]">
          Drive picker needs <code className="text-muted">NEXT_PUBLIC_GOOGLE_API_KEY</code> in your
          env file.
        </p>
      )}

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
        </div>
      )}

      {error && <p className="text-xs text-[#bc6740]">{error}</p>}

      <button
        type="button"
        disabled={busy || !pickerReady}
        onClick={handleConnect}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
      >
        {busy ? "Connecting…" : "Connect Google Drive"}
      </button>
    </div>
  );
}
