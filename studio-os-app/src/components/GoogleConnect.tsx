"use client";

import { useEffect, useRef, useState } from "react";
import {
  getStoredCalendarClientId,
  GOOGLE_CLIENT_ID,
  saveCalendarClientId,
} from "@/lib/google/calendar-auth";
import { fetchGoogleContacts, getContactsAccessToken } from "@/lib/google/contacts-auth";
import {
  getGoogleConnectedAt,
  invalidateUnifiedTokenCache,
  isGoogleUnifiedConnected,
} from "@/lib/google/google-unified-auth";
import { readPendingOAuth } from "@/lib/google/gis-oauth";
import { subscribeOAuthComplete } from "@/lib/google/oauth-callback";
import { hasGooglePickerEnv } from "@/lib/google/picker";
import { useGoogleUnifiedAuth } from "@/lib/google/use-google-unified-auth";
import { useSettings } from "@/lib/settings-store";

function formatConnectedAt(iso: string | null): string {
  if (!iso) return "just now";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function GoogleConnect() {
  const { connected, connect, disconnect } = useGoogleUnifiedAuth();
  const { contacts, setGoogleContacts, clearGoogleContacts } = useSettings();
  const [clientId, setClientId] = useState(GOOGLE_CLIENT_ID);
  const [busy, setBusy] = useState(false);
  const [awaitingOAuth, setAwaitingOAuth] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const needsClientId = !GOOGLE_CLIENT_ID && !clientId.trim();
  const pickerReady = hasGooglePickerEnv();
  const driveReady = isConnected && pickerReady;

  function syncConnectedState() {
    invalidateUnifiedTokenCache();
    const ok = isGoogleUnifiedConnected();
    setIsConnected(ok);
    if (!ok) return false;
    setJustConnected(true);
    setConnectedAt(getGoogleConnectedAt());
    setError(null);
    setBusy(false);
    setStatus(null);
    setAwaitingOAuth(false);
    return true;
  }

  // Hydrate browser-only state after mount (avoids SSR mismatch).
  useEffect(() => {
    setClientId(getStoredCalendarClientId());
    syncConnectedState();
  }, []);

  useEffect(() => {
    if (connected) syncConnectedState();
  }, [connected]);

  // OAuth redirect back with ?google_connected=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") !== "1") return;
    syncConnectedState();
    params.delete("google_connected");
    const clean =
      window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState(null, "", clean);
    const timer = window.setTimeout(() => setJustConnected(false), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!awaitingOAuth) return;

    const finishIfConnected = () => {
      if (!syncConnectedState()) return;
    };

    finishIfConnected();
    const interval = window.setInterval(finishIfConnected, 400);
    const onWake = () => finishIfConnected();
    const unsubOAuth = subscribeOAuthComplete(onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("storage", onWake);

    let sawBlur = false;
    const onBlur = () => {
      sawBlur = true;
    };
    const onFocusAfterPopup = () => {
      if (!sawBlur) return;
      sawBlur = false;
      window.setTimeout(() => {
        finishIfConnected();
        if (isGoogleUnifiedConnected()) return;
        if (!readPendingOAuth()) {
          setBusy(false);
          setStatus(null);
          setAwaitingOAuth(false);
        }
      }, 600);
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocusAfterPopup);

    return () => {
      window.clearInterval(interval);
      unsubOAuth();
      window.removeEventListener("focus", onWake);
      window.removeEventListener("storage", onWake);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocusAfterPopup);
    };
  }, [awaitingOAuth]);

  const contactsSyncStarted = useRef(false);

  const loadContacts = async () => {
    invalidateUnifiedTokenCache();
    const token = getContactsAccessToken();
    if (!token) {
      throw new Error("Google session missing — try Disconnect, then Connect again.");
    }
    return fetchGoogleContacts(token);
  };

  // After connect (including OAuth redirect), pull contacts.
  useEffect(() => {
    if (!isConnected) {
      contactsSyncStarted.current = false;
      return;
    }
    if (contactsSyncStarted.current) return;

    let cancelled = false;
    contactsSyncStarted.current = true;
    setSyncingContacts(true);
    setError(null);

    loadContacts()
      .then((list) => {
        if (!cancelled) setGoogleContacts(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load contacts");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSyncingContacts(false);
          contactsSyncStarted.current = false;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, setGoogleContacts]);

  async function handleConnect() {
    if (needsClientId) {
      setError("Paste your Google Client ID below first.");
      return;
    }
    saveCalendarClientId(clientId);
    setError(null);
    setStatus(null);
    setBusy(true);
    setStatus("Opening Google sign-in…");
    try {
      await connect(clientId);
      setBusy(false);
      if (isGoogleUnifiedConnected()) {
        setJustConnected(true);
        setConnectedAt(getGoogleConnectedAt());
        setStatus(null);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "REDIRECTING_TO_GOOGLE") {
        setStatus("Taking you to Google…");
        return;
      }
      setError(e instanceof Error ? e.message : "Could not connect Google account");
      setStatus(null);
      setBusy(false);
    }
  }

  async function handleRefreshContacts() {
    contactsSyncStarted.current = false;
    setSyncingContacts(true);
    setError(null);
    try {
      const list = await loadContacts();
      setGoogleContacts(list);
      if (list.length === 0) {
        setError(
          "Google returned 0 contacts. Check contacts.google.com, or add someone from a task’s Person pill."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh contacts");
    } finally {
      setSyncingContacts(false);
    }
  }

  function handleDisconnect() {
    disconnect();
    clearGoogleContacts();
    setJustConnected(false);
    setConnectedAt(null);
    setStatus(null);
  }

  if (isConnected) {
    return (
      <div className="space-y-3 text-sm">
        {(justConnected || status === "Connected!") && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3"
          >
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Google account connected successfully
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
              Calendar, Drive picker, Contacts, and Sheets access are enabled.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-canvas/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
            <p className="font-medium text-ink">Connected to Google</p>
          </div>
          <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
            Linked {formatConnectedAt(connectedAt)}
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted">
            <li className="flex items-center gap-2">
              <ServiceDot ok={driveReady} />
              Drive picker {driveReady ? "ready" : "— add API key to .env.local"}
            </li>
            <li className="flex items-center gap-2">
              <ServiceDot ok={!syncingContacts && contacts.length > 0} pending={syncingContacts} />
              Contacts{" "}
              {syncingContacts ? "syncing…" : `${contacts.length} people loaded`}
            </li>
            <li className="flex items-center gap-2">
              <ServiceDot ok />
              Calendar sync enabled
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={syncingContacts}
            onClick={handleRefreshContacts}
            className="rounded-md border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-accent hover:border-accent/40 hover:text-accent-ink disabled:opacity-60"
          >
            {syncingContacts ? "Syncing contacts…" : "Refresh contacts"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs text-muted hover:text-ink"
          >
            Disconnect Google
          </button>
        </div>
        {error && <p className="text-xs text-[#bc6740]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        One sign-in for Sheets, Calendar, Drive, and Contacts. You&apos;ll go to Google to
        approve — then land back here with a confirmation.
      </p>

      {status && (
        <p
          role="status"
          className="rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2 text-xs text-accent"
        >
          {status}
        </p>
      )}

      {!pickerReady && (
        <p className="rounded-lg border border-[#bc6740]/30 bg-[#bc6740]/5 px-3 py-2 text-xs text-[#bc6740]">
          <strong>Drive picker:</strong> add{" "}
          <code className="text-muted">NEXT_PUBLIC_GOOGLE_API_KEY</code> to{" "}
          <code className="text-muted">.env.local</code>. Calendar and Contacts still work
          without it.
        </p>
      )}

      <details className="text-xs text-faint">
        <summary className="cursor-pointer text-muted hover:text-ink">
          How to get the Google API key
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Open{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-ink"
            >
              Google Cloud Console → Credentials
            </a>
          </li>
          <li>Create credentials → <strong>API key</strong> (not OAuth client)</li>
          <li>
            Restrict → <strong>Websites</strong> → add{" "}
            <code className="text-muted">http://localhost:3000/*</code>
          </li>
          <li>
            Enable <strong>Google Picker API</strong> and <strong>Google Drive API</strong>
          </li>
          <li>
            Paste into <code className="text-muted">.env.local</code> as{" "}
            <code className="text-muted">NEXT_PUBLIC_GOOGLE_API_KEY=...</code>
          </li>
          <li>
            Restart dev server (<code className="text-muted">npm run dev</code>)
          </li>
        </ol>
      </details>

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

      {(awaitingOAuth || busy) && (
        <button
          type="button"
          onClick={() => syncConnectedState()}
          className="text-xs text-accent hover:text-accent-ink"
        >
          I finished signing in — check connection
        </button>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={handleConnect}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
      >
        {busy ? "Connecting…" : "Connect Google account"}
      </button>
    </div>
  );
}

function ServiceDot({ ok, pending }: { ok: boolean; pending?: boolean }) {
  return (
    <span
      className={[
        "h-1.5 w-1.5 shrink-0 rounded-full",
        pending ? "bg-amber-400" : ok ? "bg-emerald-500" : "bg-faint",
      ].join(" ")}
      aria-hidden
    />
  );
}
