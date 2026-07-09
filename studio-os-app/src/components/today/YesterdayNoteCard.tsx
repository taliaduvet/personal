"use client";

import { projectName } from "@/lib/lenses";
import { formatStudioDuration } from "@/lib/studio-time";
import type { YesterdayNote } from "@/lib/day-close";

export type YesterdayNoteCardProps = {
  note: YesterdayNote;
  taskTitle?: string | null;
};

export function YesterdayNoteCard({ note, taskTitle }: YesterdayNoteCardProps) {
  return (
    <div className="rounded-xl border border-border bg-canvas/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-faint">From yesterday</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{note.reviewNote}</p>
      {(note.durationMs > 0 || taskTitle || note.projectId) && (
        <p className="mt-2 text-xs text-muted">
          {note.durationMs > 0 ? `~${formatStudioDuration(note.durationMs)} stated` : null}
          {note.durationMs > 0 && (taskTitle || note.projectId) ? " · " : null}
          {taskTitle ? taskTitle : note.projectId ? projectName(note.projectId) : null}
        </p>
      )}
    </div>
  );
}
