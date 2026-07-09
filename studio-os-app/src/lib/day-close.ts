import { dayCloseRetroForDate, type ActivityLogEntry } from "./activity-log";
import { entriesOnDate } from "./day-ledger";
import { dateKeyFromOffset } from "./week-focus";
import type { Task } from "./types";

export type DayCloseRetroInput = {
  durationMs: number;
  taskId?: string | null;
  projectId?: string | null;
  reviewNote?: string | null;
};

export type YesterdayNote = {
  dateKey: string;
  reviewNote: string;
  durationMs: number;
  taskId: string | null;
  projectId: string | null;
};

/** Retro review left on the prior calendar day — shown on Today the next morning. */
export function yesterdayNote(log: ActivityLogEntry[]): YesterdayNote | null {
  const yesterdayKey = dateKeyFromOffset(-1);
  const retro = dayCloseRetroForDate(log, yesterdayKey);
  if (!retro?.reviewNote?.trim()) return null;

  return {
    dateKey: yesterdayKey,
    reviewNote: retro.reviewNote.trim(),
    durationMs: retro.durationMs,
    taskId: retro.taskId ?? null,
    projectId: retro.projectId ?? null,
  };
}

export function hasDayCloseContent(input: DayCloseRetroInput): boolean {
  return input.durationMs > 0 || Boolean(input.reviewNote?.trim());
}

/** Tasks worth tagging when stating unlogged studio time. */
export function dayCloseAssignableTasks(
  tasks: Task[],
  log: ActivityLogEntry[],
  dateKey: string
): Task[] {
  const sessionTaskIds = new Set(
    entriesOnDate(log, dateKey)
      .filter((e): e is Extract<ActivityLogEntry, { kind: "session_end" }> => e.kind === "session_end")
      .map((e) => e.taskId)
  );

  const seen = new Set<string>();
  const result: Task[] = [];

  for (const task of tasks) {
    const relevant =
      task.inToday || sessionTaskIds.has(task.id) || task.status === "in_progress";
    if (!relevant) continue;
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    result.push(task);
  }

  return result.sort((a, b) => a.title.localeCompare(b.title));
}

export function dayCloseRetroInputFromEntry(
  entry: NonNullable<ReturnType<typeof dayCloseRetroForDate>>
): DayCloseRetroInput {
  return {
    durationMs: entry.durationMs,
    taskId: entry.taskId ?? null,
    projectId: entry.projectId ?? null,
    reviewNote: entry.reviewNote ?? null,
  };
}
