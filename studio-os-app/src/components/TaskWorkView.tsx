"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { useTodayAssignment } from "@/lib/use-today-assignment";
import { projectWhy } from "@/lib/lenses";
import { getSavedReturnPath, isTodayPath, returnFromTaskWork, openProjectDetail } from "@/lib/navigation";
import { TaskClassifyDropdowns } from "@/components/TaskClassify";
import { useSessions } from "@/lib/sessions-store";
import { isWaitingTask } from "@/lib/waiting-on";

export function TaskWorkView({ taskId }: { taskId: string }) {
  const router = useRouter();
  const returnTo = useCallback(() => returnFromTaskWork(router), [router]);
  const { tasks, updateTask, deleteTask, completeTask, addSubtask, toggleSubtask, clearTaskWaiting } = useTasks();
  const { toggleToday } = useTodayAssignment();
  const {
    isTaskInSession,
    startSession,
    requestEndSession,
    elapsedLabel,
  } = useSessions();
  const [newSubtask, setNewSubtask] = useState("");
  const [fromToday] = useState(() => {
    const saved = getSavedReturnPath();
    return saved ? isTodayPath(saved) : false;
  });

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">Task not found</p>
        <button
          type="button"
          onClick={returnTo}
          className="mt-2 text-sm text-accent hover:text-accent-ink"
        >
          ← Back
        </button>
      </section>
    );
  }

  const { getProject } = useProjects();
  const project = task.projectId ? getProject(task.projectId) : null;
  const why = projectWhy(task.projectId);
  const done = task.status === "done";
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const pct = task.subtasks.length > 0 ? Math.round((doneSubs / task.subtasks.length) * 100) : 0;
  const inSession = isTaskInSession(task.id);
  const waiting = isWaitingTask(task);

  return (
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-2xl pb-24">
      <header className="flex items-center justify-between border-b border-line py-3">
        <button type="button" onClick={returnTo} className="text-sm font-medium text-muted hover:text-ink">
          ← Back
        </button>
        <span className="text-xs font-medium text-muted">
          {done ? "Completed" : inSession ? `In session · ${elapsedLabel}` : task.status === "in_progress" ? "In progress" : "Task"}
        </span>
        <button
          type="button"
          onClick={() => {
            deleteTask(task.id);
            returnTo();
          }}
          className="text-sm font-medium text-danger hover:text-danger/80"
        >
          Delete
        </button>
      </header>

      <div className="py-5">
        {task.lastReentryNote?.trim() && !done ? (
          <div className="mb-4 rounded-xl border border-accent/25 bg-accent-soft/30 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Where you left off</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{task.lastReentryNote}</p>
          </div>
        ) : null}

        {waiting && !done ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-canvas px-4 py-3">
            <p className="text-sm text-muted">
              Waiting on <span className="font-medium text-ink">{task.waitingOn?.personName}</span>
            </p>
            <button
              type="button"
              onClick={() => clearTaskWaiting(task.id)}
              className="text-sm font-medium text-accent hover:text-accent-ink"
            >
              Clear waiting
            </button>
          </div>
        ) : null}

        {!done && (
          <div className="mb-4">
            {inSession ? (
              <button
                type="button"
                onClick={requestEndSession}
                className="rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft/80"
              >
                End session
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startSession(task.id, task.projectId)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"
              >
                Sit with this
              </button>
            )}
          </div>
        )}

        <textarea
          value={task.title}
          onChange={(e) => updateTask(task.id, { title: e.target.value })}
          rows={2}
          className="w-full resize-none bg-transparent font-display text-2xl font-semibold tracking-tight text-ink outline-none"
        />

        {project && (
          <section className="mt-5 rounded-xl border border-border bg-accent-soft/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Working toward</p>
            <p className="mt-1 font-display text-base font-semibold text-ink">{project.name}</p>
            {why && <p className="mt-2 text-sm leading-relaxed text-muted">&ldquo;{why}&rdquo;</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openProjectDetail(router, project.id)}
                className="text-sm font-medium text-accent hover:text-accent-ink"
              >
                Open project →
              </button>
              {project.driveFolder && (
                <a
                  href={project.driveFolder.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted hover:text-ink"
                >
                  Open Drive folder
                </a>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 space-y-5">
          <TaskClassifyDropdowns task={task} onChange={(patch) => updateTask(task.id, patch)} />

          {!fromToday && (
            <button
              type="button"
              onClick={() => toggleToday(task.id, task.inToday)}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                task.inToday ? "bg-accent text-white" : "border border-border text-muted hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {task.inToday ? "In Today" : "Add to Today"}
            </button>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Sub-tasks</h2>
            {task.subtasks.length > 0 && (
              <span className="text-xs text-muted">
                {doneSubs}/{task.subtasks.length} done
              </span>
            )}
          </div>
          {task.subtasks.length > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          <ul className="mt-3 space-y-1">
            {task.subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSubtask(task.id, s.id)}
                  aria-label={s.done ? "Mark incomplete" : "Mark complete"}
                  className={[
                    "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                    s.done ? "border-accent bg-accent" : "border-faint hover:border-accent",
                  ].join(" ")}
                />
                <span className={["flex-1 text-sm", s.done ? "text-faint line-through" : "text-ink"].join(" ")}>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addSubtask(task.id, newSubtask);
              setNewSubtask("");
            }}
          >
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a step…"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-ink">
              Add
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-base font-semibold text-ink">Notes</h2>
          <p className="mt-0.5 text-xs text-muted">Links, context, anything that helps when you come back.</p>
          <textarea
            value={task.notes}
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
            rows={5}
            placeholder="Jot something down…"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
          />
        </section>
      </div>

      <footer className="fixed bottom-16 left-0 right-0 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm md:bottom-0">
        <div className="mx-auto flex max-w-2xl justify-end">
          {!done ? (
            <button
              type="button"
              onClick={() => completeTask(task.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 13 4 4L19 7" />
              </svg>
              Mark done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateTask(task.id, { status: "todo" })}
              className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted hover:border-accent"
            >
              Reopen
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
