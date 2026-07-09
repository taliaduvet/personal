import type { ActivityLogEntry, CompletionAttribution } from "./activity-log";
import { dayCloseRetroForDate } from "./activity-log";
import type { AllDayEvent, DayCommitment, TimedEventSlice } from "./calendar/types";
import { formatLocalTimeRange, localDateKey } from "./local-date";
import { formatStudioDuration } from "./studio-time";
import type { Task } from "./types";
import type { DayShapeBlock, WeekDayFocusEntry } from "./week-focus";

export type LedgerShippedItem = {
  taskId: string;
  title: string;
  attribution: string;
  atIso: string;
};

export type LedgerSessionItem = {
  taskId: string;
  title: string;
  durationMs: number;
  durationLabel: string;
  atIso: string;
};

export type LedgerShapeBlock = {
  block: DayShapeBlock;
  label: string;
  taskTitles: string[];
};

export type DayLedgerSection =
  | {
      kind: "calendar";
      timedEvents: TimedEventSlice[];
      allDayEvents: AllDayEvent[];
      blocked: boolean;
    }
  | { kind: "shape"; blocks: LedgerShapeBlock[]; note: string | null }
  | { kind: "shipped"; items: LedgerShippedItem[] }
  | { kind: "sessions"; items: LedgerSessionItem[] }
  | { kind: "stated"; durationMs: number; durationLabel: string; taskTitle?: string; reviewNote?: string }
  | { kind: "gaps"; label: string };

export type DayLedger = {
  dateKey: string;
  sections: DayLedgerSection[];
  isEmpty: boolean;
};

const BLOCK_LABELS: Record<DayShapeBlock, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function attributionLabel(a: CompletionAttribution): string {
  switch (a) {
    case "session":
      return "during session";
    case "shape_block":
      return "shape block";
    case "today_bench":
      return "today bench";
    case "unplaced":
      return "unplaced";
  }
}

export function entriesOnDate(log: ActivityLogEntry[], dateKey: string): ActivityLogEntry[] {
  return log.filter((entry) => {
    if (entry.kind === "day_close_retro") return entry.dateKey === dateKey;
    return localDateKey(new Date(entry.atIso)) === dateKey;
  });
}

export function composeDayLedger(params: {
  dateKey: string;
  log: ActivityLogEntry[];
  tasks: Task[];
  dayEntry?: WeekDayFocusEntry | null;
  commitment?: DayCommitment | null;
}): DayLedger {
  const { dateKey, log, tasks, dayEntry, commitment } = params;
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const dayLog = entriesOnDate(log, dateKey);
  const sections: DayLedgerSection[] = [];

  if (
    commitment &&
    (commitment.timedEvents.length > 0 || commitment.allDayEvents.length > 0 || commitment.blocked)
  ) {
    sections.push({
      kind: "calendar",
      timedEvents: commitment.timedEvents,
      allDayEvents: commitment.allDayEvents,
      blocked: commitment.blocked,
    });
  }

  const shapeBlockTasks = dayEntry?.shapeBlockTasks ?? {};
  const shapeBlocks: LedgerShapeBlock[] = [];
  for (const block of ["morning", "afternoon", "evening"] as DayShapeBlock[]) {
    const ids = shapeBlockTasks[block] ?? [];
    if (ids.length === 0) continue;
    shapeBlocks.push({
      block,
      label: BLOCK_LABELS[block],
      taskTitles: ids.map((id) => tasksById.get(id)?.title ?? "Unknown task"),
    });
  }
  const note = dayEntry?.note?.trim() || null;
  if (shapeBlocks.length > 0 || note) {
    sections.push({ kind: "shape", blocks: shapeBlocks, note });
  }

  const shipped = dayLog.filter(
    (e): e is Extract<ActivityLogEntry, { kind: "task_complete" }> => e.kind === "task_complete"
  );
  if (shipped.length > 0) {
    sections.push({
      kind: "shipped",
      items: shipped.map((e) => ({
        taskId: e.taskId,
        title: tasksById.get(e.taskId)?.title ?? "Task",
        attribution: attributionLabel(e.attribution),
        atIso: e.atIso,
      })),
    });
  }

  const sessions = dayLog.filter(
    (e): e is Extract<ActivityLogEntry, { kind: "session_end" }> => e.kind === "session_end"
  );
  if (sessions.length > 0) {
    sections.push({
      kind: "sessions",
      items: sessions.map((e) => ({
        taskId: e.taskId,
        title: tasksById.get(e.taskId)?.title ?? "Task",
        durationMs: e.durationMs,
        durationLabel: formatStudioDuration(e.durationMs),
        atIso: e.atIso,
      })),
    });
  }

  const retro = dayCloseRetroForDate(log, dateKey);
  if (retro && (retro.durationMs > 0 || retro.reviewNote?.trim())) {
    sections.push({
      kind: "stated",
      durationMs: retro.durationMs,
      durationLabel: formatStudioDuration(retro.durationMs),
      taskTitle: retro.taskId ? tasksById.get(retro.taskId)?.title : undefined,
      reviewNote: retro.reviewNote?.trim(),
    });
  }

  const hasLoggedWork = shipped.length > 0 || sessions.length > 0;
  const hasCalendar = Boolean(commitment && commitment.timedEvents.length > 0);
  const hasShape = shapeBlocks.length > 0 || Boolean(note);

  if (hasCalendar && !hasLoggedWork && !retro) {
    sections.push({
      kind: "gaps",
      label: "Calendar has events — no logged studio time yet",
    });
  } else if (hasLoggedWork && !hasCalendar && !hasShape) {
    sections.push({
      kind: "gaps",
      label: "Logged work — no calendar or shape intent on record",
    });
  }

  return {
    dateKey,
    sections,
    isEmpty: sections.length === 0,
  };
}

export function formatLedgerEventTime(ev: TimedEventSlice): string {
  return formatLocalTimeRange(ev.startMs, ev.endMs);
}
