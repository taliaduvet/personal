"use client";

import { useEffect } from "react";
import { useTasks } from "@/lib/store";
import { LIFE_AREAS, PROJECTS, WORK_MODES } from "@/lib/sample-data";
import { deadlineLabel, lifeAreaColor } from "@/lib/lenses";
import type { Task } from "@/lib/types";

const DO_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Today", value: 0 },
  { label: "Tomorrow", value: 1 },
  { label: "In 3 days", value: 3 },
  { label: "Next week", value: 7 },
  { label: "Someday", value: null },
];

const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "None", value: null },
  { label: "Today", value: 0 },
  { label: "In 3 days", value: 3 },
  { label: "In a week", value: 7 },
  { label: "In 2 weeks", value: 14 },
];

export function TaskDetailSheet() {
  const { tasks, openId, closeTask, updateTask, deleteTask, completeTask } = useTasks();
  const task = openId ? tasks.find((t) => t.id === openId) ?? null : null;

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTask();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [task, closeTask]);

  if (!task) return null;

  const set = (patch: Partial<Task>) => updateTask(task.id, patch);

  const pickArea = (areaId: string) => {
    // Clear the project if it no longer belongs to the chosen area.
    const project = PROJECTS.find((p) => p.id === task.projectId);
    const keepProject = project && project.lifeAreaId === areaId;
    set({ lifeAreaId: areaId, projectId: keepProject ? task.projectId : null });
  };

  const areaProjects = PROJECTS.filter((p) => p.lifeAreaId === task.lifeAreaId);
  const deadline = deadlineLabel(task.deadlineInDays);
  const done = task.status === "done";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4"
      onClick={closeTask}
      role="presentation"
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: lifeAreaColor(task.lifeAreaId) }} />
            {done ? "Completed" : task.status === "in_progress" ? "In progress" : "Task"}
          </span>
          <button
            type="button"
            onClick={closeTask}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <textarea
            value={task.title}
            onChange={(e) => set({ title: e.target.value })}
            rows={2}
            aria-label="Task title"
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 font-display text-lg font-semibold text-ink outline-none focus:border-accent"
          />

          <Field label="Life area">
            <div className="flex flex-wrap gap-1.5">
              {LIFE_AREAS.map((a) => (
                <Chip key={a.id} selected={task.lifeAreaId === a.id} onClick={() => pickArea(a.id)} dot={a.color}>
                  {a.name}
                </Chip>
              ))}
              <Chip selected={!LIFE_AREAS.some((a) => a.id === task.lifeAreaId)} onClick={() => set({ lifeAreaId: "", projectId: null })}>
                Unsorted
              </Chip>
            </div>
          </Field>

          <Field label="Project">
            {areaProjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {areaProjects.map((p) => (
                  <Chip key={p.id} selected={task.projectId === p.id} onClick={() => set({ projectId: p.id })}>
                    {p.name}
                  </Chip>
                ))}
                <Chip selected={task.projectId === null} onClick={() => set({ projectId: null })}>
                  None
                </Chip>
              </div>
            ) : (
              <p className="text-sm text-faint">Pick a life area with projects to assign one.</p>
            )}
          </Field>

          <Field label="Work mode">
            <div className="flex flex-wrap gap-1.5">
              {WORK_MODES.map((m) => (
                <Chip key={m.id} selected={task.workModeId === m.id} onClick={() => set({ workModeId: m.id })}>
                  {m.name}
                </Chip>
              ))}
              <Chip selected={task.workModeId === null} onClick={() => set({ workModeId: null })}>
                None
              </Chip>
            </div>
          </Field>

          <Field label="Doing date" hint="A soft plan — never an overdue stick. Past dates just carry forward.">
            <div className="flex flex-wrap gap-1.5">
              {DO_OPTIONS.map((o) => (
                <Chip key={o.label} selected={task.doDateInDays === o.value} onClick={() => set({ doDateInDays: o.value })}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Hard deadline" hint="External dependencies only (a grant cutoff, someone waiting). Most tasks have none.">
            <div className="flex flex-wrap gap-1.5">
              {DEADLINE_OPTIONS.map((o) => (
                <Chip
                  key={o.label}
                  selected={task.deadlineInDays === o.value}
                  onClick={() => set({ deadlineInDays: o.value })}
                  danger={o.value !== null}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
            {deadline && (
              <p className={["mt-2 text-xs font-medium", deadline.tone === "danger" ? "text-danger" : "text-muted"].join(" ")}>
                {deadline.text}
              </p>
            )}
          </Field>

          <Field label="Today">
            <button
              type="button"
              onClick={() => set({ inToday: !task.inToday })}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                task.inToday
                  ? "bg-accent-soft text-accent hover:bg-accent/15"
                  : "border border-border text-muted hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {task.inToday ? "In Today — tap to remove" : "Add to Today"}
            </button>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Delete
          </button>
          {done ? (
            <button
              type="button"
              onClick={() => set({ status: "todo" })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                completeTask(task.id);
                closeTask();
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Chip({
  children,
  selected,
  onClick,
  dot,
  danger = false,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  dot?: string;
  danger?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm transition-colors";
  const tone = selected
    ? danger
      ? "bg-danger text-white"
      : "bg-accent text-white"
    : "border border-border text-muted hover:border-accent hover:text-ink";
  return (
    <button type="button" onClick={onClick} className={[base, tone].join(" ")}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: selected ? "currentColor" : dot }} />}
      {children}
    </button>
  );
}
