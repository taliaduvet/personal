"use client";

import { useEffect, useState } from "react";
import { useSessions } from "@/lib/sessions-store";

export function SessionEndSheet() {
  const { endSessionOpen, closeEndSession, confirmEndSession } = useSessions();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!endSessionOpen) setNote("");
  }, [endSessionOpen]);

  if (!endSessionOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 md:items-center">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-lg"
        role="dialog"
        aria-labelledby="session-end-title"
      >
        <h2 id="session-end-title" className="font-display text-lg font-semibold text-ink">
          Where did you leave off?
        </h2>
        <p className="mt-1 text-sm text-muted">Optional — one line for next time you sit with this.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          autoFocus
          placeholder="e.g. vocals prepped, ready to balance"
          className="mt-3 w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          maxLength={280}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeEndSession}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-ink"
          >
            Keep sitting
          </button>
          <button
            type="button"
            onClick={() => confirmEndSession(note)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
          >
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
