"use client";

import { useRouter } from "next/navigation";
import { openTaskWork } from "@/lib/navigation";
import { lifeAreaColor, lifeAreaName, projectName } from "@/lib/lenses";
import { formatShippedDate } from "@/lib/shelf";
import type { Task } from "@/lib/types";

export function ShelfRow({ task }: { task: Task }) {
  const router = useRouter();
  const accent = lifeAreaColor(task.lifeAreaId);

  return (
    <button
      type="button"
      onClick={() => openTaskWork(router, task.id)}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-canvas"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-faint/80 text-white">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {lifeAreaName(task.lifeAreaId)}
          </span>
          {task.projectId && (
            <span className="font-medium text-accent">→ {projectName(task.projectId)}</span>
          )}
          <span className="text-faint">{formatShippedDate(task)}</span>
        </p>
      </div>
    </button>
  );
}
