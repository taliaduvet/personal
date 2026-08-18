import type { DoPlan } from "./types";
import type { WeekStartDay } from "./week";
import { weekKey, weekRange } from "./week";
import { addDaysToDateKey, localDateKey, parseLocalDateKey } from "./local-date";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_KEY_RE.test(value);
}

/**
 * Build a day plan `offset` days from `from` (default: now).
 *
 * Stores an absolute date key — see the `DoPlan` docs for why offsets are not
 * persisted. Pass `from` explicitly in tests and when migrating legacy data so
 * the anchor is deterministic.
 */
export function dayPlan(offset: number, from: Date = new Date()): DoPlan {
  if (!Number.isFinite(offset)) return null;
  return { kind: "day", dateKey: addDaysToDateKey(localDateKey(from), offset) };
}

/** Days from `now` until a day plan's date (negative = past). Null if not a day plan. */
export function doPlanDayOffset(plan: DoPlan, now: Date = new Date()): number | null {
  if (plan?.kind !== "day" || !isDateKey(plan.dateKey)) return null;
  return deadlineOffsetFromDateKey(plan.dateKey, now);
}

export function weekPlan(weekStart: string): DoPlan {
  return { kind: "week", weekStart };
}

export function offsetFromToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function dateWithOffset(offset: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Days from `from` until a YYYY-MM-DD deadline (negative = overdue). */
export function deadlineOffsetFromDateKey(dateKey: string, from = new Date()): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const deadline = new Date(y, m - 1, d, 0, 0, 0, 0);
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - base.getTime()) / 86_400_000);
}

/**
 * Normalize a stored plan to the absolute-date-key form.
 *
 * Legacy rows hold a sticky `offset`. Those are resolved against `parkedAt`
 * (when the task was captured) rather than "now" — otherwise every stored
 * offset would silently re-point at a new day on each read, which is the exact
 * bug this migration removes.
 */
export function normalizeDoPlan(
  plan: DoPlan | undefined | null,
  legacyDoDateInDays?: number | null,
  parkedAt?: number | null
): DoPlan {
  const anchor = parkedAt != null && Number.isFinite(parkedAt) ? new Date(parkedAt) : new Date();
  if (plan != null && typeof plan === "object" && "kind" in plan) {
    if (plan.kind === "day") {
      const raw = plan as { kind: "day"; offset?: number; dateKey?: string };
      if (isDateKey(raw.dateKey)) return { kind: "day", dateKey: raw.dateKey };
      if (Number.isFinite(raw.offset)) return dayPlan(raw.offset as number, anchor);
      return null;
    }
    if (plan.kind === "week") return { kind: "week", weekStart: plan.weekStart };
  }
  if (legacyDoDateInDays != null) return dayPlan(legacyDoDateInDays, anchor);
  return null;
}

/**
 * Normalize a deadline to an absolute date key, migrating a legacy
 * `deadlineInDays` offset against `parkedAt` for the same reason as above.
 */
export function normalizeDeadlineDateKey(
  dateKey: string | null | undefined,
  deadlineInDays?: number | null,
  parkedAt?: number | null
): string | null {
  if (isDateKey(dateKey)) return dateKey;
  if (deadlineInDays == null || !Number.isFinite(deadlineInDays)) return null;
  const anchor = parkedAt != null && Number.isFinite(parkedAt) ? new Date(parkedAt) : new Date();
  return addDaysToDateKey(localDateKey(anchor), deadlineInDays);
}

export function doPlanEquals(a: DoPlan, b: DoPlan): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "day") return b.kind === "day" && a.dateKey === b.dateKey;
  return b.kind === "week" && a.weekStart === b.weekStart;
}

/** Human label for the Doing pill. */
export function doPlanLabel(plan: DoPlan | undefined, weekStartsOn: WeekStartDay): string {
  if (plan == null) return "Doing";
  if (plan.kind === "day") {
    const offset = doPlanDayOffset(plan);
    if (offset == null) return "Doing";
    if (offset === -1) return "Yesterday";
    if (offset === 0) return "Today";
    if (offset === 1) return "Tomorrow";
    return parseLocalDateKey(plan.dateKey).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  const thisWeek = weekKey(weekStartsOn, 0);
  const nextWeek = weekKey(weekStartsOn, 1);
  if (plan.weekStart === thisWeek) return "This week";
  if (plan.weekStart === nextWeek) return "Next week";
  if (!plan.weekStart || Number.isNaN(Date.parse(`${plan.weekStart}T12:00:00`))) {
    return "This week";
  }
  const start = new Date(`${plan.weekStart}T12:00:00`);
  const { start: ws } = weekRangeForKey(plan.weekStart, weekStartsOn);
  if (!Number.isFinite(ws)) return "This week";
  const endDate = dateWithOffset(ws + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Week · ${fmt(start)} – ${fmt(endDate)}`;
}

/** Sort key for When lens — lower = sooner. null plan sorts last. */
export function doPlanSortKey(plan: DoPlan | undefined, weekStartsOn: WeekStartDay): number | null {
  if (plan == null) return null;
  if (plan.kind === "day") return doPlanDayOffset(plan);
  const { start } = weekRangeForKey(plan.weekStart, weekStartsOn);
  return start;
}

function weekRangeForKey(weekStartKey: string, weekStartsOn: WeekStartDay) {
  const target = new Date(`${weekStartKey}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  const offset = offsetFromToday(target);
  // Walk week offsets to find matching key
  for (let w = -52; w <= 52; w++) {
    const range = weekRange(weekStartsOn, w);
    if (range.weekStartKey === weekStartKey) return range;
  }
  return { start: offset, end: offset + 6, label: "", weekStartKey };
}

export function isCurrentWeekPlan(plan: DoPlan, weekStartsOn: WeekStartDay): boolean {
  if (plan?.kind !== "week") return false;
  const { start, end } = weekRange(weekStartsOn, 0);
  const planStart = doPlanSortKey(plan, weekStartsOn);
  return planStart !== null && planStart >= start && planStart <= end;
}

/** Soft doing plan lands within the current calendar week. */
export function hasDoPlanWithinWeek(
  plan: DoPlan | undefined,
  weekStartsOn: WeekStartDay
): boolean {
  if (plan == null) return false;
  const { start, end } = weekRange(weekStartsOn, 0);
  const planStart = doPlanSortKey(plan, weekStartsOn);
  return planStart !== null && planStart >= start && planStart <= end;
}

export function isPastWeekPlan(plan: DoPlan, weekStartsOn: WeekStartDay): boolean {
  if (plan?.kind !== "week") return false;
  const { start } = weekRange(weekStartsOn, 0);
  const planStart = weekRangeForKey(plan.weekStart, weekStartsOn).start;
  return planStart < start;
}

export function isCarriedDoPlan(plan: DoPlan, weekStartsOn: WeekStartDay): boolean {
  if (plan === null) return false;
  if (plan.kind === "day") {
    const offset = doPlanDayOffset(plan);
    return offset != null && offset < 0;
  }
  return isPastWeekPlan(plan, weekStartsOn);
}

/** Tasks tagged for a week bucket without a specific day — for week planning ritual. */
export function isWeekBucketPlan(plan: DoPlan): boolean {
  return plan?.kind === "week";
}

export type MonthWeekRow = {
  weekStart: string;
  weekStartOffset: number;
  days: ({ offset: number; date: number; inMonth: boolean } | null)[];
};

/** Build calendar rows for a month; each row starts on the user's week-start day. */
export function buildMonthWeeks(
  year: number,
  month: number,
  weekStartsOn: WeekStartDay
): MonthWeekRow[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startOffset = offsetFromToday(firstOfMonth);
  const daysSinceStart = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;
  let cursor = startOffset - daysSinceStart;

  const rows: MonthWeekRow[] = [];
  while (cursor <= offsetFromToday(lastOfMonth) + 6) {
    const weekStartDate = dateWithOffset(cursor);
    const days: MonthWeekRow["days"] = [];
    for (let i = 0; i < 7; i++) {
      const off = cursor + i;
      const d = dateWithOffset(off);
      days.push({
        offset: off,
        date: d.getDate(),
        inMonth: d.getMonth() === month,
      });
    }
    rows.push({
      weekStart: weekStartDate.toISOString().slice(0, 10),
      weekStartOffset: cursor,
      days,
    });
    cursor += 7;
  }
  return rows;
}

export function parseWeekPhrase(
  phrase: "this week" | "next week",
  weekStartsOn: WeekStartDay
): DoPlan {
  const offset = phrase === "this week" ? 0 : 1;
  return weekPlan(weekKey(weekStartsOn, offset));
}
