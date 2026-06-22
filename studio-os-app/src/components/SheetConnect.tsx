"use client";

import { useState } from "react";
import {
  getStoredSheetsClientId,
  saveSheetsClientId,
} from "@/lib/google/sheets-auth";
import { GOOGLE_CLIENT_ID } from "@/lib/google/calendar-auth";
import { useSheet } from "@/lib/sheet-store";

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SheetConnect() {
  const {
    connection,
    syncing,
    syncError,
    writeStatus,
    writeError,
    templateCopyUrl,
    connectAndSync,
    syncNow,
    disconnect,
  } = useSheet();

  const [sheetInput, setSheetInput] = useState("");
  const [clientId, setClientId] = useState(() => getStoredSheetsClientId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsClientId = !GOOGLE_CLIENT_ID && !clientId.trim();
  const displayError = error ?? syncError ?? writeError;

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsClientId) {
        throw new Error("Paste your Google Client ID below first.");
      }
      saveSheetsClientId(clientId);
      await connectAndSync(sheetInput);
      setSheetInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect sheet");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setError(null);
    setBusy(true);
    try {
      await syncNow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const writeLabel =
    writeStatus === "syncing"
      ? "Saving to sheet…"
      : writeStatus === "pending"
        ? "Unsaved changes…"
        : writeStatus === "error"
          ? "Save failed"
          : connection
            ? "Sheet is up to date"
            : null;

  if (connection) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5">
          <p className="text-sm font-medium text-ink">Connected to {connection.sheetTitle}</p>
          <p className="mt-0.5 text-xs text-muted">
            Last synced {formatSyncTime(connection.lastSyncAt)}
            {writeLabel && (
              <>
                {" "}
                ·{" "}
                <span className={writeStatus === "error" ? "text-[#bc6740]" : ""}>{writeLabel}</span>
              </>
            )}
          </p>
        </div>

        {displayError && <p className="text-xs text-[#bc6740]">{displayError}</p>}
        {writeError && writeError.toLowerCase().includes("permission") && (
          <p className="text-xs text-muted">
            Disconnect and connect again to grant write access to your sheet.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || syncing}
            onClick={handleSyncNow}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
          >
            {busy || syncing ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={() => disconnect()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-ink"
          >
            Disconnect
          </button>
        </div>

        <p className="text-[11px] text-faint">
          Edits in the app save back to your sheet automatically. Today flags, subtasks, and week
          planning stay on this device for now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-canvas/60 px-3 py-2.5">
        <p className="text-sm font-medium text-ink">Step 1 — Copy the template</p>
        <p className="mt-1 text-xs text-muted">
          Make your own copy of the Studio OS sheet. All your tasks live there — the app reads
          from it.
        </p>
        <a
          href={templateCopyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink"
        >
          Copy Studio OS template
        </a>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <div>
          <p className="text-sm font-medium text-ink">Step 2 — Connect your copy</p>
          <p className="mt-1 text-xs text-muted">
            Paste the URL of the sheet you just copied. The app reads and writes tasks there.
          </p>
          <input
            type="url"
            value={sheetInput}
            onChange={(e) => setSheetInput(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className="mt-2 w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-sm text-ink"
          />
        </div>

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
          type="submit"
          disabled={busy || syncing || !sheetInput.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
        >
          {busy || syncing ? "Connecting…" : "Connect & load tasks"}
        </button>
      </form>
    </div>
  );
}
