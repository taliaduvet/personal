"use client";

import { useState } from "react";
import Link from "next/link";
import { useSheet } from "@/lib/sheet-store";
import { TEMPLATE_COPY_URL } from "@/lib/sheet/schema";
import {
  getStoredSheetsClientId,
  saveSheetsClientId,
} from "@/lib/google/sheets-auth";
import { GOOGLE_CLIENT_ID } from "@/lib/google/calendar-auth";

const DISMISS_KEY = "studio-os.onboarding-card.v1";

export function OnboardingCard() {
  const { connection, connectAndSync, syncing } = useSheet();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [sheetUrl, setSheetUrl] = useState("");
  const [clientId, setClientId] = useState(() => getStoredSheetsClientId());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (connection || dismissed) return null;

  const needsClientId = !GOOGLE_CLIENT_ID && !clientId.trim();

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsClientId) throw new Error("Add your Google Client ID in Settings first.");
      saveSheetsClientId(clientId);
      await connectAndSync(sheetUrl);
      setSheetUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Get set up</h2>
          <p className="mt-1 text-sm text-muted">
            Three steps — then your sheet and app stay in sync.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-faint hover:text-muted"
        >
          Later
        </button>
      </div>

      <ol className="mt-4 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            1
          </span>
          <div>
            <p className="font-medium text-ink">Copy the template</p>
            <a
              href={TEMPLATE_COPY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium text-accent hover:text-accent-ink"
            >
              Open template copy link →
            </a>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            2
          </span>
          <div>
            <p className="font-medium text-ink">Build the sheet</p>
            <p className="mt-0.5 text-xs text-muted">
              In your copy: 🎛 Studio Setup → Build / Rebuild System, then Add Sample Data.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            3
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">Connect below</p>
            <form onSubmit={handleConnect} className="mt-2 space-y-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Paste your sheet URL"
                className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-ink"
              />
              {error && <p className="text-xs text-[#bc6740]">{error}</p>}
              <button
                type="submit"
                disabled={busy || syncing || !sheetUrl.trim()}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink disabled:opacity-60"
              >
                {busy || syncing ? "Connecting…" : "Connect & load tasks"}
              </button>
            </form>
          </div>
        </li>
      </ol>

      <p className="mt-3 text-[11px] text-faint">
        More options in{" "}
        <Link href="/settings" className="text-accent hover:text-accent-ink">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
