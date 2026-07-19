"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { respondByOffset, waitingDays } from "@/lib/needs-respond";
import { localDateKey } from "@/lib/local-date";
import Link from "next/link";

function waitingLabel(t: Task): string {
  const d = waitingDays(t);
  if (d === 0) return "waiting since today";
  if (d === 1) return "waiting 1 day";
  return `waiting ${d} days`;
}

function overdueWhisper(t: Task): string | null {
  const by = respondByOffset(t);
  if (by === null || by >= 0) return null;
  return by === -1 ? "come-back was yesterday" : `come-back ${Math.abs(by)}d overdue`;
}

export function RespondContextRail({
  tasks,
  moreCount,
  onComplete,
  onDefer,
}: {
  tasks: Task[];
  moreCount: number;
  onComplete?: (id: string) => void;
  onDefer?: (id: string, dateKey?: string) => void;
}) {
  const [datePickerId, setDatePickerId] = useState<string | null>(null);
  if (tasks.length === 0 && moreCount === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Needs reply</p>
        <Link href="/tasks?lens=respond" className="text-[10px] text-accent hover:underline">
          {moreCount > 0 ? `+${moreCount} more` : "All"}
        </Link>
      </div>
      <p className="text-[10px] leading-snug text-faint">Defer parks it off Today until the come-back day.</p>
      <ul className="space-y-2">
        {tasks.map((t) => {
          const overdue = overdueWhisper(t);
          return (
            <li
              key={t.id}
              className="rounded-lg border border-border/70 bg-surface/80 px-2.5 py-2 shadow-sm"
            >
              <p className="text-xs font-medium leading-snug text-ink line-clamp-2">{t.title}</p>
              {t.personName ? (
                <p className="mt-0.5 text-[10px] text-muted">{t.personName}</p>
              ) : null}
              <p className="mt-1 text-[10px] text-faint">
                {waitingLabel(t)}
                {overdue ? ` · ${overdue}` : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onComplete?.(t.id)}
                  className="rounded-md border border-border bg-canvas px-2 py-0.5 text-[10px] font-medium text-ink hover:border-accent"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => onDefer?.(t.id)}
                  className="rounded-md border border-border bg-canvas px-2 py-0.5 text-[10px] text-muted hover:border-accent hover:text-ink"
                >
                  Defer
                </button>
                <button
                  type="button"
                  onClick={() => setDatePickerId((cur) => (cur === t.id ? null : t.id))}
                  className="rounded-md border border-border bg-canvas px-2 py-0.5 text-[10px] text-muted hover:border-accent hover:text-ink"
                >
                  Pick date
                </button>
              </div>
              {datePickerId === t.id ? (
                <label className="mt-2 block text-[10px] text-faint">
                  Come back on
                  <input
                    type="date"
                    min={localDateKey(new Date())}
                    defaultValue={t.respondByDateKey ?? localDateKey(new Date())}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onDefer?.(t.id, e.target.value);
                      setDatePickerId(null);
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-canvas px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                  />
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
