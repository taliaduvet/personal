import { sessionEndEntries, type ActivityLogEntry } from "./activity-log";
import { formatStudioDuration } from "./studio-time";
import { localDateKey } from "./local-date";
import type { Task } from "./types";

const EXCLUDED_SIMILAR_MODES = new Set(["admin", "errands"]);

export type TaskSessionStats = {
  sessionCount: number;
  totalMs: number;
  totalLabel: string;
  spanDays: number;
  subtasksDone: number;
  subtasksTotal: number;
};

export type SimilarWorkHint = {
  sessionRange: [number, number];
  hourRange: [number, number];
  sampleCount: number;
};

export type ProjectSessionRollup = {
  totalMs: number;
  totalLabel: string;
  taskCount: number;
};

function minMaxRange(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  const sorted = [...values].sort((a, b) => a - b);
  return [sorted[0], sorted[sorted.length - 1]];
}

export function taskSessionStats(task: Task, log: ActivityLogEntry[]): TaskSessionStats | null {
  const sessions = sessionEndEntries(log).filter((e) => e.taskId === task.id);
  if (sessions.length === 0) return null;

  const totalMs = sessions.reduce((sum, entry) => sum + entry.durationMs, 0);
  const dayKeys = new Set(sessions.map((e) => localDateKey(new Date(e.atIso))));

  return {
    sessionCount: sessions.length,
    totalMs,
    totalLabel: formatStudioDuration(totalMs),
    spanDays: dayKeys.size,
    subtasksDone: task.subtasks.filter((s) => s.done).length,
    subtasksTotal: task.subtasks.length,
  };
}

export function comparableDoneTasks(
  workModeId: string,
  excludeTaskId: string,
  allTasks: Task[],
  log: ActivityLogEntry[]
): Task[] {
  const withSessions = new Set(sessionEndEntries(log).map((s) => s.taskId));
  return allTasks.filter(
    (t) =>
      t.id !== excludeTaskId &&
      t.status === "done" &&
      t.workModeId === workModeId &&
      withSessions.has(t.id)
  );
}

export function similarWorkHint(
  task: Task,
  allTasks: Task[],
  log: ActivityLogEntry[]
): SimilarWorkHint | null {
  if (!task.workModeId || EXCLUDED_SIMILAR_MODES.has(task.workModeId)) return null;

  const comparables = comparableDoneTasks(task.workModeId, task.id, allTasks, log);
  if (comparables.length < 2) return null;

  const sessionCounts: number[] = [];
  const hourTotals: number[] = [];

  for (const comparable of comparables) {
    const sessions = sessionEndEntries(log).filter((e) => e.taskId === comparable.id);
    sessionCounts.push(sessions.length);
    const ms = sessions.reduce((sum, e) => sum + e.durationMs, 0);
    hourTotals.push(Math.round((ms / 3_600_000) * 10) / 10);
  }

  return {
    sessionRange: minMaxRange(sessionCounts),
    hourRange: minMaxRange(hourTotals),
    sampleCount: comparables.length,
  };
}

export function projectSessionRollup(
  projectId: string,
  tasks: Task[],
  log: ActivityLogEntry[]
): ProjectSessionRollup | null {
  const taskIds = new Set(tasks.filter((t) => t.projectId === projectId).map((t) => t.id));
  const sessions = sessionEndEntries(log).filter((e) => taskIds.has(e.taskId));
  if (sessions.length === 0) return null;

  const tasksWithSessions = new Set(sessions.map((s) => s.taskId));
  const totalMs = sessions.reduce((sum, e) => sum + e.durationMs, 0);

  return {
    totalMs,
    totalLabel: formatStudioDuration(totalMs),
    taskCount: tasksWithSessions.size,
  };
}
