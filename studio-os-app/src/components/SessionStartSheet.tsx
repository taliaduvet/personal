"use client";

import { useState } from "react";

const GENERIC_CHIPS_MIN = [25, 45, 90];
const WARN_BEFORE_OPTIONS_MIN = [2, 5, 10, 15];

export interface SessionStartSheetProps {
  open: boolean;
  /** Historical average for this task or similar work, in ms — null if no history yet. */
  smartDefaultMs: number | null;
  smartDefaultLabel: string | null;
  defaultWarnBeforeMs: number;
  onCancel: () => void;
  onConfirm: (options?: { targetDurationMs: number; warnBeforeMs: number }) => void;
}

/**
 * Always shown before a session starts — "Sit with this" opens this rather
 * than starting instantly. The untimed path stays one tap ("No timer, just
 * start"); picking a duration chip reveals the warn-before control.
 */
export function SessionStartSheet({
  open,
  smartDefaultMs,
  smartDefaultLabel,
  defaultWarnBeforeMs,
  onCancel,
  onConfirm,
}: SessionStartSheetProps) {
  const [selectedMs, setSelectedMs] = useState<number | null>(null);
  const [warnBeforeMs, setWarnBeforeMs] = useState(defaultWarnBeforeMs);

  if (!open) return null;

  function selectChip(ms: number) {
    setSelectedMs((prev) => (prev === ms ? null : ms));
  }

  function reset() {
    setSelectedMs(null);
    setWarnBeforeMs(defaultWarnBeforeMs);
  }

  function handleStartWithTimer() {
    if (!selectedMs) return;
    onConfirm({ targetDurationMs: selectedMs, warnBeforeMs: Math.min(warnBeforeMs, selectedMs) });
    reset();
  }

  function handleNoTimer() {
    onConfirm();
    reset();
  }

  function handleCancel() {
    onCancel();
    reset();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 md:items-center" onClick={handleCancel}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-lg"
        role="dialog"
        aria-labelledby="session-start-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="session-start-title" className="font-display text-lg font-semibold text-ink">
          How long do you want to sit with this?
        </h2>
        <p className="mt-1 text-sm text-muted">Optional — skip it and it'll just track how long you're in.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {smartDefaultMs && smartDefaultLabel && (
            <button
              type="button"
              onClick={() => selectChip(smartDefaultMs)}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                selectedMs === smartDefaultMs ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
              ].join(" ")}
            >
              {smartDefaultLabel}
            </button>
          )}
          {GENERIC_CHIPS_MIN.map((min) => {
            const ms = min * 60_000;
            return (
              <button
                key={min}
                type="button"
                onClick={() => selectChip(ms)}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  selectedMs === ms ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
                ].join(" ")}
              >
                {min}m
              </button>
            );
          })}
        </div>

        {selectedMs && (
          <div className="mt-4">
            <label className="text-xs font-medium text-faint">Warn me before it&apos;s up</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WARN_BEFORE_OPTIONS_MIN.map((min) => {
                const ms = min * 60_000;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setWarnBeforeMs(ms)}
                    className={[
                      "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      warnBeforeMs === ms ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
                    ].join(" ")}
                  >
                    {min}m before
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {selectedMs ? (
            <button
              type="button"
              onClick={handleStartWithTimer}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-ink"
            >
              Start with timer
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleNoTimer}
            className={[
              "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              selectedMs ? "border border-border text-muted hover:text-ink" : "bg-accent text-white hover:bg-accent-ink",
            ].join(" ")}
          >
            No timer, just start
          </button>
          <button type="button" onClick={handleCancel} className="text-center text-xs text-faint hover:text-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
