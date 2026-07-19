import type { Task } from "./types";
import type { DayFocus } from "./week-focus";
import { deadlineOffsetFromDateKey } from "./do-plan";
import { taskMatchesFocus } from "./week-focus";

export const RESPOND_STRIP_MAX = 3;
/** Context rail list cap — full queue in Lot. */
export const RESPOND_RAIL_MAX = 5;

export function isNeedsRespondTask(t: Task): boolean {
  return Boolean(t.needsRespond) && t.status !== "done";
}

export function needsRespondTasks(tasks: Task[]): Task[] {
  return tasks.filter(isNeedsRespondTask);
}

export function needsRespondCount(tasks: Task[]): number {
  return needsRespondTasks(tasks).length;
}

/** Days until respond-by (negative = overdue). Null if unset. */
export function respondByOffset(t: Task, from = new Date()): number | null {
  if (!t.respondByDateKey) return null;
  return deadlineOffsetFromDateKey(t.respondByDateKey, from);
}

/** Whole days since capture / park (how long this reply has been sitting). */
export function waitingDays(t: Task, from = new Date()): number {
  const ms = from.getTime() - t.parkedAt;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Due today / overdue / no date — belongs on Today's Context rail. */
export function isRespondDueToday(t: Task, from = new Date()): boolean {
  if (!isNeedsRespondTask(t)) return false;
  const by = respondByOffset(t, from);
  return by === null || by <= 0;
}

/**
 * Today Context rail: due/overdue, OR captured today (so you can Defer new shares).
 * Future-dated deferred items stay off the rail until their come-back day.
 */
export function isRespondOnTodayRail(t: Task, from = new Date()): boolean {
  if (!isNeedsRespondTask(t)) return false;
  if (isRespondDueToday(t, from)) return true;
  if (respondByOffset(t, from) !== null && /^Deferred\b/i.test(t.urgencyReason ?? "")) return false;
  return waitingDays(t, from) === 0;
}

/** Ranked Needs-reply items for Today's Context rail. */
export function topRespondForTodayRail(
  tasks: Task[],
  limit = RESPOND_RAIL_MAX,
  opts: {
    todayFocus?: DayFocus | null;
    vipNames?: string[];
    from?: Date;
  } = {}
): Task[] {
  const from = opts.from ?? new Date();
  return topNeedsRespond(
    needsRespondTasks(tasks).filter((t) => isRespondOnTodayRail(t, from)),
    limit,
    opts
  );
}

function ageDays(t: Task, from = new Date()): number {
  return waitingDays(t, from);
}

function textBlob(t: Task): string {
  return `${t.title}\n${t.notes}\n${t.personName ?? ""}`.toLowerCase();
}

function vipBoost(t: Task, vipNames: string[]): number {
  if (vipNames.length === 0) return 0;
  const blob = textBlob(t);
  for (const name of vipNames) {
    const n = name.trim().toLowerCase();
    if (n.length >= 2 && blob.includes(n)) return 40;
  }
  if (t.personName && vipNames.some((v) => v.toLowerCase() === t.personName!.toLowerCase())) {
    return 40;
  }
  return 0;
}

/**
 * Higher = more urgent for the Today Respond strip.
 * Overdue respond-by and near respond-by dominate; age prevents rotting.
 */
export function scoreNeedsRespond(
  t: Task,
  opts: {
    todayFocus?: DayFocus | null;
    vipNames?: string[];
    from?: Date;
  } = {}
): number {
  const from = opts.from ?? new Date();
  const vipNames = opts.vipNames ?? [];
  let score = 0;

  const by = respondByOffset(t, from);
  if (by !== null) {
    if (by < 0) score += 200 + Math.min(50, Math.abs(by) * 10);
    else if (by === 0) score += 160;
    else if (by === 1) score += 120;
    else if (by <= 3) score += 80;
    else score += Math.max(0, 40 - by);
  } else {
    score += 20;
  }

  score += Math.min(60, ageDays(t, from) * 8);
  score += vipBoost(t, vipNames);

  if (opts.todayFocus && taskMatchesFocus(t, opts.todayFocus)) {
    score += 15;
  }

  return score;
}

export function topNeedsRespond(
  tasks: Task[],
  limit = RESPOND_STRIP_MAX,
  opts: {
    todayFocus?: DayFocus | null;
    vipNames?: string[];
    from?: Date;
  } = {}
): Task[] {
  return needsRespondTasks(tasks)
    .map((t) => ({ t, s: scoreNeedsRespond(t, opts) }))
    .sort((a, b) => b.s - a.s || a.t.parkedAt - b.t.parkedAt)
    .slice(0, limit)
    .map((x) => x.t);
}
