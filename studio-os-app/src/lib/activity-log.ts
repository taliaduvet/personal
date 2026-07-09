import { offsetFromToday } from "./do-plan";
import type { DayShapeBlock } from "./week-focus";

export const ACTIVITY_LOG_CAP = 2000;

export type CompletionAttribution = "session" | "shape_block" | "today_bench" | "unplaced";

export type ActivityLogEntry =
  | {
      id: string;
      atIso: string;
      kind: "session_start";
      taskId: string;
      projectId: string | null;
    }
  | {
      id: string;
      atIso: string;
      kind: "session_end";
      taskId: string;
      projectId: string | null;
      startedAtIso: string;
      durationMs: number;
      reentryNote?: string;
    }
  | {
      id: string;
      atIso: string;
      kind: "task_complete";
      taskId: string;
      completedAtIso: string;
      attribution: CompletionAttribution;
      sessionId?: string;
      shapeBlock?: DayShapeBlock;
    }
  | {
      id: string;
      atIso: string;
      kind: "subtask_toggle";
      taskId: string;
      subtaskId: string;
      done: boolean;
    };

export function newActivityLogId(): string {
  return `al-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendActivityLogEntry(
  log: ActivityLogEntry[],
  entry: ActivityLogEntry
): ActivityLogEntry[] {
  const next = [...log, entry];
  if (next.length <= ACTIVITY_LOG_CAP) return next;
  return next.slice(next.length - ACTIVITY_LOG_CAP);
}

export function mergeActivityLogs(
  local: ActivityLogEntry[],
  remote: ActivityLogEntry[]
): ActivityLogEntry[] {
  const byId = new Map<string, ActivityLogEntry>();
  for (const entry of [...local, ...remote]) {
    byId.set(entry.id, entry);
  }
  const merged = [...byId.values()].sort((a, b) => a.atIso.localeCompare(b.atIso));
  if (merged.length <= ACTIVITY_LOG_CAP) return merged;
  return merged.slice(merged.length - ACTIVITY_LOG_CAP);
}

export function entryDayOffset(entry: ActivityLogEntry): number {
  return offsetFromToday(new Date(entry.atIso));
}

/** Inclusive week range by day offsets from today (matches `weekRange`). */
export function entriesInWeek(
  log: ActivityLogEntry[],
  weekStartOffset: number,
  weekEndOffset: number
): ActivityLogEntry[] {
  return log.filter((entry) => {
    const offset = entryDayOffset(entry);
    return offset >= weekStartOffset && offset <= weekEndOffset;
  });
}

export function sessionEndEntries(log: ActivityLogEntry[]): Extract<
  ActivityLogEntry,
  { kind: "session_end" }
>[] {
  return log.filter((e): e is Extract<ActivityLogEntry, { kind: "session_end" }> => e.kind === "session_end");
}
