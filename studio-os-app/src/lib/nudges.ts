import type { Task } from "./types";
import { localDateKey, addDaysToDateKey, dateKeyStartMs } from "./local-date";

/**
 * Follow-up / nudge helpers. Two nudge types (see docs handoff brief):
 *  - "timed"  — fires at a specific clock moment because a real deadline demands it.
 *  - "checkin" — repeatedly asks "have you started this?" until acknowledged.
 * The backend owns computing `startThinkingAtDateKey` (deadline minus estimated
 * lead time); the client lets Talia override it, marking `leadTimeSource: manual`.
 */

export type NudgeType = "timed" | "checkin";

export const NUDGE_TYPE_META: Record<
  NudgeType,
  { label: string; short: string; hint: string }
> = {
  timed: {
    label: "Timed",
    short: "Timed",
    hint: "Fires at a set moment before the deadline.",
  },
  checkin: {
    label: "Check-in",
    short: "Check-in",
    hint: "Keeps asking “started this?” until you acknowledge.",
  },
};

/**
 * The task's effective deadline as a YYYY-MM-DD key. Prefers the explicit
 * `deadlineDateKey`; otherwise derives it from the `deadlineInDays` offset.
 */
export function resolveDeadlineDateKey(task: Task, from = new Date()): string | null {
  if (task.deadlineDateKey) return task.deadlineDateKey;
  if (task.deadlineInDays != null) {
    return addDaysToDateKey(localDateKey(from), task.deadlineInDays);
  }
  return null;
}

/**
 * Whole calendar days between the "start thinking about" date and the deadline.
 * Returns null when either side is unknown. Never negative (a start after the
 * deadline clamps to 0).
 */
export function computeLeadTimeDays(
  startThinkingKey: string | null | undefined,
  deadlineKey: string | null | undefined,
): number | null {
  if (!startThinkingKey || !deadlineKey) return null;
  const days = Math.round(
    (dateKeyStartMs(deadlineKey) - dateKeyStartMs(startThinkingKey)) / 86_400_000,
  );
  return Math.max(0, days);
}

/** Patch to apply when Talia manually picks a "Start thinking about" date. */
export function manualStartThinkingPatch(
  task: Task,
  startThinkingKey: string | null,
  from = new Date(),
): Partial<Task> {
  const deadlineKey = resolveDeadlineDateKey(task, from);
  return {
    startThinkingAtDateKey: startThinkingKey,
    leadTimeSource: "manual",
    leadTimeDays: computeLeadTimeDays(startThinkingKey, deadlineKey),
  };
}

/** True once a check-in nudge has been acknowledged (stops resurfacing; not "done"). */
export function isAcknowledged(task: Task): boolean {
  return Boolean(task.acknowledgedAt);
}
