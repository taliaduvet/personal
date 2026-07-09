import { entriesInWeek, sessionEndEntries, type ActivityLogEntry } from "./activity-log";

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
