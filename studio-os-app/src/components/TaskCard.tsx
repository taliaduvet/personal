"use client";

import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { useTasks } from "@/lib/store";
import {
  deadlineLabel,
  lifeAreaColor,
  lifeAreaName,
  planLabel,
  projectName,
  workModeName,
} from "@/lib/lenses";

export function TaskCard({
  task,
  onComplete,
  hideArea = false,
  hideProject = false,
}: {
  task: Task;
  onComplete?: (id: string) => void;
  hideArea?: boolean;
  hideProject?: boolean;
}) {
  const router = useRouter();
  const { openQuickEdit } = useTasks();
  const accent = lifeAreaColor(task.lifeAreaId);
  const done = task.status === "done";
  const plan = planLabel(task.doDateInDays);
  const deadline = deadlineLabel(task.deadlineInDays);

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {done ? (
        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-faint text-white">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onComplete?.(task.id)}
          aria-label="Mark complete"
          className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-faint transition-colors hover:border-accent"
        />
      )}

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => router.push(`/tasks/${task.id}`)}
          className="w-full text-left"
          aria-label={`Work on ${task.title}`}
        >
          <p className={["text-sm", done ? "text-faint line-through" : "text-ink"].join(" ")}>
            {task.title}
          </p>
        </button>
        <button
          type="button"
          onClick={() => openQuickEdit(task.id)}
          className="mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-left text-xs text-muted hover:text-ink"
          aria-label={`Quick edit ${task.title}`}
        >
          {!hideProject && task.projectId && (
            <span className="font-medium text-accent">→ {projectName(task.projectId)}</span>
          )}
          {!hideArea && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {lifeAreaName(task.lifeAreaId)}
            </span>
          )}
          {!hideProject && !task.projectId && <span className="text-faint">No project</span>}
          {task.workModeId && (
            <span className="rounded bg-canvas px-1.5 py-0.5">{workModeName(task.workModeId)}</span>
          )}
          {plan && <span className="text-faint">{plan}</span>}
          {task.status === "in_progress" && <span className="text-accent">In progress</span>}
        </button>
      </div>

      {deadline && (
        <span
          className={[
            "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
            deadline.tone === "danger" ? "text-danger" : "text-muted",
          ].join(" ")}
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4v16M4 4h12l-2 4 2 4H4" />
          </svg>
          {deadline.text}
        </span>
      )}
    </div>
  );
}
