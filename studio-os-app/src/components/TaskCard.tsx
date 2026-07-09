"use client";

import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { openTaskWork } from "@/lib/navigation";
import {
  deadlineLabel,
  lifeAreaColor,
  lifeAreaName,
  planLabel,
  projectName,
  workModeName,
} from "@/lib/lenses";
import { isStaleParked, parkedLabel } from "@/lib/parked";
import { isWaitingTask } from "@/lib/waiting-on";

export function TaskCard({
  task,
  onComplete,
  hideArea = false,
  hideProject = false,
  hideMode = false,
  todayTiming = false,
  waitingQuietLabel,
  showNudge = false,
  onCopyNudge,
}: {
  task: Task;
  onComplete?: (id: string) => void;
  hideArea?: boolean;
  hideProject?: boolean;
  /** Hide mode pill — used on Today mode-day bench. */
  hideMode?: boolean;
  /** Today bench: show deadline or doing-by only (no parked/stale clutter). */
  todayTiming?: boolean;
  /** Waiting lens: e.g. "quiet 8 days". */
  waitingQuietLabel?: string;
  showNudge?: boolean;
  onCopyNudge?: () => void;
}) {
  const router = useRouter();
  const { openQuickEdit } = useTasks();
  const { weekStartsOn } = useSettings();
  const accent = lifeAreaColor(task.lifeAreaId);
  const done = task.status === "done";
  const plan = planLabel(task.doPlan, weekStartsOn);
  const deadline = deadlineLabel(task.deadlineInDays);
  const parked = parkedLabel(task.parkedAt);
  const stale = !done && isStaleParked(task.parkedAt);
  const waiting = isWaitingTask(task);

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
      ) : task.status === "in_progress" ? (
        <button
          type="button"
          onClick={() => onComplete?.(task.id)}
          aria-label="Mark complete"
          title="In progress"
          className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-accent bg-accent/15 transition-colors hover:bg-accent/25"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
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
          onClick={() => openTaskWork(router, task.id)}
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
          className="mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 text-left text-xs text-muted hover:text-ink"
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
          {!hideProject && !task.projectId && !todayTiming && (
            <span className="text-faint">No project</span>
          )}
          {deadline ? (
            <span
              className={[
                "rounded px-1.5 py-0.5 font-medium",
                deadline.tone === "danger"
                  ? "bg-danger/10 text-danger"
                  : "bg-canvas text-muted",
              ].join(" ")}
            >
              {deadline.text}
            </span>
          ) : todayTiming && plan ? (
            <span className="rounded bg-canvas px-1.5 py-0.5 text-muted">{plan}</span>
          ) : null}
          {!todayTiming && (
            <span className={stale ? "text-faint" : "text-muted"}>{parked}</span>
          )}
          {!hideMode && task.workModeId && (
            <span className="rounded bg-canvas px-1.5 py-0.5">{workModeName(task.workModeId)}</span>
          )}
          {waiting && (
            <span className="rounded bg-canvas px-1.5 py-0.5 text-muted">
              waiting · {task.waitingOn?.personName}
            </span>
          )}
          {waitingQuietLabel && (
            <span className="text-faint">{waitingQuietLabel}</span>
          )}
          {!todayTiming && plan && !deadline && (
            <span className="text-faint">{plan}</span>
          )}
          {!todayTiming && stale && (
            <span className="rounded bg-canvas px-1.5 py-0.5 text-faint" title="Consider doing or dropping">
              stale
            </span>
          )}
        </button>
        {showNudge && onCopyNudge && (
          <button
            type="button"
            onClick={onCopyNudge}
            className="mt-2 text-xs font-medium text-accent hover:text-accent-ink"
          >
            Copy check-in
          </button>
        )}
      </div>
    </div>
  );
}
