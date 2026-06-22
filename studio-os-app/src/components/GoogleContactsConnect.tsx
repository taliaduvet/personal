"use client";

import { useState } from "react";
import {
  getStoredCalendarClientId,
  GOOGLE_CLIENT_ID,
  saveCalendarClientId,
} from "@/lib/google/calendar-auth";
import { useGoogleContactsAuth } from "@/lib/google/use-contacts-auth";
import { useSettings } from "@/lib/settings-store";

type Props = {
  compact?: boolean;
};

export function GoogleContactsConnect({ compact = false }: Props) {
  const { contacts, setGoogleContacts, clearGoogleContacts } = useSettings();
  const { connected, syncing, syncError, connect, disconnect, syncContacts, refreshContacts } =
    useGoogleContactsAuth();
  const [clientId, setClientId] = useState(() => getStoredCalendarClientId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsClientId = !GOOGLE_CLIENT_ID && !clientId.trim();
  const displayError = error || syncError;

  async function handleConnect() {
    setError(null);
    setBusy(true);
    try {
      if (needsClientId) {
        setError("Paste your Google Client ID below first.");
        return;
      }
      saveCalendarClientId(clientId);
      const list = await syncContacts(clientId);
      setGoogleContacts(list);
    } catch (e) {
      if (e instanceof Error && e.message === "REDIRECTING_TO_GOOGLE") return;
      setError(e instanceof Error ? e.message : "Could not connect Google Contacts");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setError(null);
    setBusy(true);
    try {
      const list = await refreshContacts();
      setGoogleContacts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh contacts");
    } finally {
      setBusy(false);
    }
  }

  function handleDisconnect() {
    disconnect();
    clearGoogleContacts();
  }

  if (connected) {
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <p className="text-muted">
          Google Contacts connected — {contacts.length} people available for task assignment.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || syncing}
            onClick={handleRefresh}
            className="text-xs text-accent hover:text-accent-ink disabled:opacity-60"
          >
            {busy || syncing ? "Refreshing…" : "Refresh contacts"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs text-muted hover:text-ink"
          >
            Disconnect contacts
          </button>
        </div>
        {displayError && <p className="mt-2 text-xs text-[#bc6740]">{displayError}</p>}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={compact ? "text-xs text-muted" : "text-sm text-muted"}>
        Pull people from your Google Contacts to assign them to tasks.
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
        </div>
      )}

      {displayError && <p className="text-xs text-[#bc6740]">{displayError}</p>}

      <button
        type="button"
        disabled={busy || syncing}
        onClick={handleConnect}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
      >
        {busy || syncing ? "Connecting…" : "Connect Google Contacts"}
      </button>
    </div>
  );
}
