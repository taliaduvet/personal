import { entriesInWeek, sessionEndEntries, type ActivityLogEntry } from "./activity-log";
import { makeManageBucket } from "./work-mode-buckets";
import type { Task } from "./types";

export function studioMsInWeek(
  log: ActivityLogEntry[],
  weekStartOffset: number,
  weekEndOffset: number
): number {
  const inWeek = entriesInWeek(log, weekStartOffset, weekEndOffset);
  return sessionEndEntries(inWeek).reduce((sum, entry) => sum + entry.durationMs, 0);
}

/** Human label for Review stat — never judgmental. */
export function formatStudioDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  return `${hours}h`;
}

export function studioMsByBucket(
  log: ActivityLogEntry[],
  tasksById: Map<string, Task>,
  weekStartOffset: number,
  weekEndOffset: number
): { make: number; manage: number } {
  const inWeek = sessionEndEntries(entriesInWeek(log, weekStartOffset, weekEndOffset));
  let make = 0;
  let manage = 0;
  for (const entry of inWeek) {
    const bucket = makeManageBucket(tasksById.get(entry.taskId)?.workModeId ?? null);
    if (bucket === "make") make += entry.durationMs;
    else if (bucket === "manage") manage += entry.durationMs;
  }
  return { make, manage };
}
