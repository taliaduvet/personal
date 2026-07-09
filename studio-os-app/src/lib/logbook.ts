import type { ActivityLogEntry } from "./activity-log";
import { formatStudioDuration } from "./studio-time";
import { localDateKey, dateKeyStartMs, dateKeyEndMs } from "./local-date";
import type { Task } from "./types";
import type { WeekStartDay } from "./week";

export type LogbookDaySection =
  | { kind: "shipped"; taskId: string; title: string; atIso: string }
  | {
      kind: "session";
      taskId: string;
      title: string;
      durationMs: number;
      durationLabel: string;
      reentryNote?: string;
      atIso: string;
    }
  | { kind: "reflection"; weekKey: string; snippet: string };

export type LogbookDayPage = {
  dateKey: string;
  label: string;
  sections: LogbookDaySection[];
  userLine?: string;
};

function isoOnDateKey(iso: string, dateKey: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return localDateKey(d) === dateKey;
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function composeDayPage(
  dateKey: string,
  tasks: Task[],
  log: ActivityLogEntry[],
  reviewNotes: Record<string, { reflection: string; intentions: string }>,
  logbookLines: Record<string, string>,
  weekStartsOn: WeekStartDay
): LogbookDayPage {
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const sections: LogbookDaySection[] = [];

  const shippedIds = new Set<string>();

  for (const entry of log) {
    if (entry.kind === "task_complete" && isoOnDateKey(entry.completedAtIso, dateKey)) {
      shippedIds.add(entry.taskId);
      const t = tasksById.get(entry.taskId);
      sections.push({
        kind: "shipped",
        taskId: entry.taskId,
        title: t?.title ?? "Task",
        atIso: entry.completedAtIso,
      });
    }
    if (entry.kind === "session_end" && isoOnDateKey(entry.atIso, dateKey)) {
      const t = tasksById.get(entry.taskId);
      sections.push({
        kind: "session",
        taskId: entry.taskId,
        title: t?.title ?? "Session",
        durationMs: entry.durationMs,
        durationLabel: formatStudioDuration(entry.durationMs),
        reentryNote: entry.reentryNote,
        atIso: entry.atIso,
      });
    }
  }

  for (const t of tasks) {
    if (t.status !== "done" || !t.completedAtIso) continue;
    if (!isoOnDateKey(t.completedAtIso, dateKey)) continue;
    if (shippedIds.has(t.id)) continue;
    sections.push({
      kind: "shipped",
      taskId: t.id,
      title: t.title,
      atIso: t.completedAtIso,
    });
  }

  sections.sort((a, b) => {
    const aIso = a.kind === "reflection" ? "" : a.atIso;
    const bIso = b.kind === "reflection" ? "" : b.atIso;
    return aIso.localeCompare(bIso);
  });

  const dayStart = dateKeyStartMs(dateKey);
  const dayEnd = dateKeyEndMs(dateKey);
  for (const [wk, notes] of Object.entries(reviewNotes)) {
    const reflection = notes.reflection.trim();
    if (!reflection) continue;
    const wkStart = dateKeyStartMs(wk);
    if (wkStart >= dayStart && wkStart < dayEnd) {
      sections.push({
        kind: "reflection",
        weekKey: wk,
        snippet: reflection.length > 160 ? `${reflection.slice(0, 157)}…` : reflection,
      });
    }
  }

  const userLine = logbookLines[dateKey]?.trim() || undefined;

  return {
    dateKey,
    label: formatDayLabel(dateKey),
    sections,
    userLine,
  };
}

export function dayKeysWithActivity(
  tasks: Task[],
  log: ActivityLogEntry[],
  logbookLines: Record<string, string>
): string[] {
  const keys = new Set<string>();
  for (const entry of log) {
    if (entry.kind === "task_complete" || entry.kind === "session_end") {
      keys.add(localDateKey(new Date(entry.atIso)));
    }
  }
  for (const t of tasks) {
    if (t.status === "done" && t.completedAtIso) {
      keys.add(localDateKey(new Date(t.completedAtIso)));
    }
  }
  for (const key of Object.keys(logbookLines)) {
    if (logbookLines[key]?.trim()) keys.add(key);
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}
