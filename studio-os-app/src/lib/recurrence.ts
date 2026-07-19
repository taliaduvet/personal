import type { DoPlan, Recurrence, Task } from "./types";
import { dayPlan, dateWithOffset } from "./do-plan";
import { dateKeyStartMs, localDateKey } from "./local-date";

/**
 * Recurring tasks — roll-forward on complete.
 *
 * A recurring task is one live task, not a pre-generated series: completing
 * it spawns the next occurrence with a fresh id and a do-plan on the next
 * matching day. That keeps the Lot honest (one row per commitment) and
 * plays nicely with local-first sync — no phantom future instances to
 * reconcile.
 */

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function diffInDays(target: Date, now: Date): number {
  const targetMs = dateKeyStartMs(localDateKey(target));
  const todayMs = dateKeyStartMs(localDateKey(now));
  return Math.round((targetMs - todayMs) / 86_400_000);
}

/** The task's current anchor day: its do-date if set, else today. */
function anchorDate(doPlan: DoPlan, now: Date): Date {
  if (doPlan?.kind === "day") return dateWithOffset(doPlan.offset);
  return new Date(now);
}

const DAY_MS = 86_400_000;

function clampedMonthDate(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

/**
 * Days from today until the next occurrence — always strictly in the
 * future, so completing early or late never re-spawns for today.
 */
export function nextOccurrenceOffset(
  recurrence: Recurrence,
  doPlan: DoPlan,
  now = new Date()
): number {
  const todayMs = dateKeyStartMs(localDateKey(now));
  const base = anchorDate(doPlan, now);

  switch (recurrence.kind) {
    case "daily":
      return 1;
    case "weekdays": {
      let d = addDays(now, 1);
      while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
      return diffInDays(d, now);
    }
    case "weekly": {
      let target = addDays(base, 7);
      while (dateKeyStartMs(localDateKey(target)) <= todayMs) target = addDays(target, 7);
      return diffInDays(target, now);
    }
    case "everyNDays": {
      const n = Math.max(1, recurrence.n);
      let target = addDays(base, n);
      if (dateKeyStartMs(localDateKey(target)) <= todayMs) {
        const behindMs = todayMs - dateKeyStartMs(localDateKey(target));
        const skips = Math.floor(behindMs / (n * DAY_MS)) + 1;
        target = addDays(target, skips * n);
      }
      return diffInDays(target, now);
    }
    case "monthly": {
      const day = base.getDate();
      let year = base.getFullYear();
      let month = base.getMonth();
      let target: Date;
      do {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
        target = clampedMonthDate(year, month, day);
      } while (dateKeyStartMs(localDateKey(target)) <= todayMs);
      return diffInDays(target, now);
    }
  }
}

export function recurrenceLabel(recurrence: Recurrence | null | undefined): string | null {
  if (!recurrence) return null;
  switch (recurrence.kind) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "weekly":
      return "Every week";
    case "everyNDays":
      return recurrence.n === 14 ? "Every 2 weeks" : `Every ${recurrence.n} days`;
    case "monthly":
      return "Every month";
  }
}

/**
 * Build the next occurrence of a completed recurring task.
 * Fresh id, clean slate (subtasks unchecked, no session note, no waiting),
 * do-plan on the next matching day. Sheet metadata is dropped so calendar
 * event ids never duplicate.
 */
export function spawnNextRecurringTask(
  task: Task,
  newId: string,
  now = new Date()
): Task {
  const offset = nextOccurrenceOffset(task.recurrence!, task.doPlan, now);
  return {
    ...task,
    id: newId,
    status: "todo",
    inToday: false,
    doPlan: dayPlan(offset),
    deadlineDateKey: null,
    deadlineInDays: null,
    completedAtInDays: null,
    completedAtIso: null,
    parkedAt: now.getTime(),
    subtasks: task.subtasks.map((s, i) => ({ ...s, id: `${newId}-s${i}`, done: false })),
    lastReentryNote: null,
    waitingOn: null,
    sheetMeta: undefined,
  };
}
