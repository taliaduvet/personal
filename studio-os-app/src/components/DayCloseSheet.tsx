"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessions } from "@/lib/sessions-store";
import { formatStudioDuration } from "@/lib/studio-time";
import { hasDayCloseContent, type DayCloseRetroInput } from "@/lib/day-close";
import { projectName } from "@/lib/lenses";
import type { Task } from "@/lib/types";

const PRESET_MS = [
  { label: "~1h", ms: 3_600_000 },
  { label: "~2h", ms: 7_200_000 },
  { label: "~3h", ms: 10_800_000 },
] as const;

export type DayCloseSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: (input: DayCloseRetroInput) => void;
  assignableTasks: Task[];
  existing?: DayCloseRetroInput | null;
};

export function DayCloseSheet({
  open,
  onClose,
  onSave,
  assignableTasks,
  existing,
}: DayCloseSheetProps) {
  const { activeSession, requestEndSession } = useSessions();
  const [durationMs, setDurationMs] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setDurationMs(existing?.durationMs ?? 0);
    setTaskId(existing?.taskId ?? null);
    setReviewNote(existing?.reviewNote ?? "");
  }, [open, existing]);

  const selectedTask = useMemo(
    () => assignableTasks.find((t) => t.id === taskId) ?? null,
    [assignableTasks, taskId]
  );

  if (!open) return null;

  const payload: DayCloseRetroInput = {
    durationMs,
    taskId: taskId,
    projectId: selectedTask?.projectId ?? null,
    reviewNote: reviewNote.trim() || null,
  };

  const canSave = hasDayCloseContent(payload);

  const handleSave = () => {
    if (!canSave) return;
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 md:items-center">
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg"
        role="dialog"
        aria-labelledby="day-close-title"
      >
        <h2 id="day-close-title" className="font-display text-lg font-semibold text-ink">
          Close the day
        </h2>
        <p className="mt-1 text-sm text-muted">
          Optional — state unlogged studio time, tag what it was for, leave a note for tomorrow.
        </p>

        {activeSession ? (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2.5">
            <p className="text-sm text-ink">You still have an active session.</p>
            <button
              type="button"
              onClick={requestEndSession}
              className="mt-2 text-sm font-medium text-accent hover:text-accent-ink"
            >
              End session first →
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-faint">
                Unlogged studio time
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_MS.map(({ label, ms }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDurationMs(durationMs === ms ? 0 : ms)}
                    className={[
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      durationMs === ms
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-canvas text-ink hover:border-accent hover:text-accent",
                    ].join(" ")}
                  >
                    {label}
                    <span className="ml-1 text-xs text-faint">({formatStudioDuration(ms)})</span>
                  </button>
                ))}
              </div>
            </div>

            {durationMs > 0 && assignableTasks.length > 0 ? (
              <div className="mt-4">
                <label
                  htmlFor="day-close-task"
                  className="text-[10px] font-bold uppercase tracking-wider text-faint"
                >
                  What was it for?
                </label>
                <select
                  id="day-close-task"
                  value={taskId ?? ""}
                  onChange={(e) => setTaskId(e.target.value || null)}
                  className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="">Not tied to a task</option>
                  {assignableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                      {task.projectId ? ` · ${projectName(task.projectId)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-4">
              <label
                htmlFor="day-close-review"
                className="text-[10px] font-bold uppercase tracking-wider text-faint"
              >
                Quick review for tomorrow
              </label>
              <textarea
                id="day-close-review"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="e.g. got the vocal comp 80% there, need fresh ears on the low end"
                className="mt-2 w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                maxLength={400}
              />
              <p className="mt-1 text-xs text-faint">Shows on Today tomorrow as a note from yesterday.</p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-ink"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </>
        )}

        {activeSession ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Skip
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
