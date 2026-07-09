"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/types";
import { deadlineLabel, workModeName } from "@/lib/lenses";
import type { LifeAreaRailItem } from "@/components/today/TodayScreen";

export type OpenDayAreaPickerProps = {
  area: LifeAreaRailItem;
  tasks: Task[];
  approvedIds: Set<string>;
  onAssign: (taskId: string) => void;
  onClose: () => void;
};

export function OpenDayAreaPicker({
  area,
  tasks,
  approvedIds,
  onAssign,
  onClose,
}: OpenDayAreaPickerProps) {
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aa = approvedIds.has(a.id) ? 0 : 1;
      const ab = approvedIds.has(b.id) ? 0 : 1;
      if (aa !== ab) return aa - ab;
      return (a.deadlineInDays ?? 9999) - (b.deadlineInDays ?? 9999);
    });
  }, [tasks, approvedIds]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[75dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Add from ${area.name}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: area.color }} />
            <span className="font-display text-sm font-semibold text-ink">{area.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No open tasks in this area.</p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((task) => {
                const deadline = deadlineLabel(task.deadlineInDays);
                const approved = approvedIds.has(task.id);
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-canvas/40 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        {approved ? (
                          <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                            approved
                          </span>
                        ) : null}
                        {task.workModeId ? (
                          <span className="rounded bg-surface px-1.5 py-0.5">
                            {workModeName(task.workModeId)}
                          </span>
                        ) : null}
                        {deadline ? (
                          <span
                            className={
                              deadline.tone === "danger"
                                ? "font-medium text-danger"
                                : undefined
                            }
                          >
                            {deadline.text}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAssign(task.id)}
                      className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-ink"
                    >
                      add
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[10px] text-faint">Approved this week shown first</p>
        </div>
      </div>
    </div>
  );
}
