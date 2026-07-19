"use client";

import type { Task } from "@/lib/types";
import { respondByOffset } from "@/lib/needs-respond";
import type { DeferPreset } from "@/lib/capture-task";
import Link from "next/link";

export function RespondStrip({
  tasks,
  moreCount,
  onComplete,
  onDefer,
}: {
  tasks: Task[];
  moreCount: number;
  onComplete?: (id: string) => void;
  onDefer?: (id: string, preset: DeferPreset) => void;
}) {
  if (tasks.length === 0 && moreCount === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-ink">
          Needs a reply
          <span className="ml-1.5 font-normal tabular-nums text-faint">{tasks.length}</span>
        </h2>
        <Link href="/tasks?lens=respond" className="text-xs text-accent hover:underline">
          {moreCount > 0 ? `+${moreCount} more` : "All"}
        </Link>
      </div>
      <p className="mb-3 text-xs text-muted">
        Done after you send. Defer anytime — parking is allowed.
      </p>
      <ul className="space-y-2">
        {tasks.map((t) => {
          const by = respondByOffset(t);
          const byLabel =
            by === null
              ? null
              : by < 0
                ? `${Math.abs(by)}d overdue`
                : by === 0
                  ? "today"
                  : by === 1
                    ? "tomorrow"
                    : `${by}d`;
          return (
            <li
              key={t.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border/80 bg-canvas/40 px-3 py-2"
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onComplete?.(t.id)}
                  aria-label="Mark done — I replied"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-accent transition-colors hover:bg-accent"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{t.title}</p>
                  {byLabel ? (
                    <p
                      className={`mt-0.5 text-[11px] ${by !== null && by <= 0 ? "text-danger" : "text-faint"}`}
                    >
                      come back {byLabel}
                      {t.urgencyReason ? ` · ${t.urgencyReason}` : ""}
                    </p>
                  ) : t.urgencyReason ? (
                    <p className="mt-0.5 text-[11px] text-faint">{t.urgencyReason}</p>
                  ) : null}
                </div>
              </div>
              {onDefer ? (
                <div className="ml-6 flex flex-wrap gap-1.5">
                  {(
                    [
                      ["2d", "+2 days"],
                      ["friday", "Friday"],
                      ["week", "+1 week"],
                    ] as const
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onDefer(t.id, preset)}
                      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] text-muted transition-colors hover:border-accent hover:text-ink"
                    >
                      Defer {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
