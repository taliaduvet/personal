"use client";

import { workModeName } from "@/lib/lenses";
import type { SimilarWorkHint, TaskSessionStats } from "@/lib/duration-memory";

export type TaskSessionStatsProps = {
  stats: TaskSessionStats;
  hint: SimilarWorkHint | null;
  workModeId: string | null;
};

function formatHourRange([lo, hi]: [number, number]): string {
  if (lo === hi) return `${lo}h`;
  return `${lo}–${hi}h`;
}

function formatSessionRange([lo, hi]: [number, number]): string {
  if (lo === hi) return `${lo}`;
  return `${lo}–${hi}`;
}

export function TaskSessionStats({ stats, hint, workModeId }: TaskSessionStatsProps) {
  const subtaskSegment =
    stats.subtasksTotal > 0 ? ` · ${stats.subtasksDone}/${stats.subtasksTotal} subtasks` : "";

  return (
    <div className="mb-4 rounded-xl border border-border bg-canvas/50 px-4 py-3">
      <p className="text-sm text-muted">
        so far: {stats.sessionCount} {stats.sessionCount === 1 ? "session" : "sessions"} · ~
        {stats.totalLabel}
        {subtaskSegment}
      </p>
      {hint && workModeId ? (
        <p className="mt-1 text-xs text-faint">
          similar {workModeName(workModeId).toLowerCase()}: usually{" "}
          {formatSessionRange(hint.sessionRange)} sessions (~{formatHourRange(hint.hourRange)}) — your
          past work
        </p>
      ) : null}
    </div>
  );
}
