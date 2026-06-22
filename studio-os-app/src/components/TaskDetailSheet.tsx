"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/lib/store";
import { classifyChipLabels } from "@/lib/parse";
import { lifeAreaColor, lifeAreaName } from "@/lib/lenses";
import { ClassifyEditor } from "@/components/TaskClassify";
import type { Task } from "@/lib/types";

/**
 * QUICK EDIT — bottom sheet for fast filing while browsing.
 * Work View is the full page at /tasks/[id].
 */
export function TaskDetailSheet() {
  const { tasks, quickEditId, closeQuickEdit, updateTask, deleteTask, completeTask } = useTasks();
  const [showClassify, setShowClassify] = useState(false);
  const task = quickEditId ? tasks.find((t) => t.id === quickEditId) ?? null : null;

  useEffect(() => {
    if (!task) return;
    setShowClassify(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuickEdit();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [task, closeQuickEdit]);

  if (!task) return null;

  const set = (patch: Partial<Task>) => updateTask(task.id, patch);
  const chips = classifyChipLabels(task);
  const done = task.status === "done";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4"
      onClick={closeQuickEdit}
      role="presentation"
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick edit task"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: lifeAreaColor(task.lifeAreaId) }} />
            {done ? "Completed" : task.status === "in_progress" ? "In progress" : "Task"}
          </span>
          <button type="button" onClick={closeQuickEdit} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <input
            value={task.title}
            onChange={(e) => set({ title: e.target.value })}
            aria-label="Task title"
            className="w-full bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-faint"
          />

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">Classify</p>
              <button type="button" onClick={() => setShowClassify((v) => !v)} className="text-xs font-medium text-accent hover:text-accent-ink">
                {showClassify ? "Done" : "Edit"}
              </button>
            </div>

            {!showClassify ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.project && (
                  <SummaryChip dot={lifeAreaColor(task.lifeAreaId)} accent>
                    {chips.project}
                  </SummaryChip>
                )}
                {chips.doing && <SummaryChip>{chips.doing}</SummaryChip>}
                {chips.deadline && <SummaryChip danger>{chips.deadline}</SummaryChip>}
                {chips.mode && <SummaryChip>{chips.mode}</SummaryChip>}
                {!chips.project && !chips.doing && !chips.deadline && !chips.mode && (
                  <span className="text-sm text-faint">No tags yet — tap Edit</span>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <ClassifyEditor task={task} onChange={set} />
              </div>
            )}

            {task.projectId && !showClassify && (
              <p className="mt-1.5 text-xs text-faint">{lifeAreaName(task.lifeAreaId)} · inherited from project</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => set({ inToday: !task.inToday })}
            className={[
              "w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
              task.inToday
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            {task.inToday ? "In Today — tap to remove" : "Add to Today"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <button type="button" onClick={() => deleteTask(task.id)} className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10">
            Delete
          </button>
          {done ? (
            <button type="button" onClick={() => set({ status: "todo" })} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent">
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                completeTask(task.id);
                closeQuickEdit();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 13 4 4L19 7" />
              </svg>
              Mark done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  children,
  dot,
  accent = false,
  danger = false,
}: {
  children: React.ReactNode;
  dot?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm",
        danger ? "border-danger/30 text-danger" : accent ? "border-accent/30 text-accent" : "border-border text-muted",
      ].join(" ")}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}
