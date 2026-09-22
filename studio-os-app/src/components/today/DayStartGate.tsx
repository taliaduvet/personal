"use client";

import { useEffect, useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import type { Task } from "@/lib/types";

export type DayStartGateProps = {
  placedTasks: Task[];
  swapCandidates: Task[];
  onConfirm: () => void;
  onComplete?: (id: string) => void;
  onDeferToday?: (id: string) => void;
  onApproveSwapIn?: (taskIds: string[]) => void;
};

export function DayStartGate({
  placedTasks,
  swapCandidates,
  onConfirm,
  onComplete,
  onDeferToday,
  onApproveSwapIn,
}: DayStartGateProps) {
  const [swapOpen, setSwapOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (swapCandidates.some((t) => t.id === id)) next.add(id);
      }
      return next;
    });
  }, [swapCandidates]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = () => {
    if (selected.size === 0) return;
    onApproveSwapIn?.([...selected]);
    setSelected(new Set());
    setSwapOpen(false);
  };

  return (
    <div className="rounded-xl border-2 border-accent bg-accent-soft p-4">
      <h2 className="font-display text-base font-semibold text-ink">Start your day</h2>
      <p className="mt-0.5 text-xs text-muted">
        Here&apos;s what you placed for today. Confirm, or swap something out first.
      </p>

      {placedTasks.length > 0 ? (
        <div className="mt-3 space-y-2">
          {placedTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onComplete={onComplete}
              onDefer={onDeferToday}
              hideProject
              hideMode
              hideArea
              todayTiming
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Nothing placed for today yet — pull something in below, or confirm an open day.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-ink"
        >
          Looks right →
        </button>
        {swapCandidates.length > 0 && (
          <button
            type="button"
            onClick={() => setSwapOpen((v) => !v)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-ink"
          >
            Swap one in
          </button>
        )}
      </div>

      {swapOpen && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] text-muted">Approve one to add it to today&apos;s bench</p>
          <ul className="mt-2 space-y-1.5">
            {swapCandidates.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  className="mt-0.5 rounded border-border"
                  aria-label={`Add ${t.title} to today`}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addSelected}
            disabled={selected.size === 0}
            className="mt-2 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            Add selected{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
