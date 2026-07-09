import type { DoPlan } from "./types";
import type { WeekStartDay } from "./week";
import { weekKey, weekRange } from "./week";

export function dayPlan(offset: number): DoPlan {
  return { kind: "day", offset };
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

export function dateWithOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Migrate legacy day-offset field or normalize partial values. */
export function normalizeDoPlan(
  plan: DoPlan | undefined | null,
  legacyDoDateInDays?: number | null
): DoPlan {
  if (plan != null && typeof plan === "object" && "kind" in plan) {
    if (plan.kind === "day") return { kind: "day", offset: plan.offset };
    if (plan.kind === "week") return { kind: "week", weekStart: plan.weekStart };
  }
  if (legacyDoDateInDays != null) return dayPlan(legacyDoDateInDays);
  return null;
}

export function doPlanEquals(a: DoPlan, b: DoPlan): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "day") return b.kind === "day" && a.offset === b.offset;
  return b.kind === "week" && a.weekStart === b.weekStart;
}

/** Human label for the Doing pill. */
export function doPlanLabel(plan: DoPlan | undefined, weekStartsOn: WeekStartDay): string {
  if (plan == null) return "Doing";
  if (plan.kind === "day") {
    if (plan.offset < 0) {
      if (plan.offset === -1) return "Yesterday";
      const d = dateWithOffset(plan.offset);
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    }
    if (plan.offset === 0) return "Today";
    if (plan.offset === 1) return "Tomorrow";
    const d = dateWithOffset(plan.offset);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  const thisWeek = weekKey(weekStartsOn, 0);
  const nextWeek = weekKey(weekStartsOn, 1);
  if (plan.weekStart === thisWeek) return "This week";
  if (plan.weekStart === nextWeek) return "Next week";
  const start = new Date(`${plan.weekStart}T12:00:00`);
  const { start: ws } = weekRangeForKey(plan.weekStart, weekStartsOn);
  const endDate = dateWithOffset(ws + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Week · ${fmt(start)} – ${fmt(endDate)}`;
}

/** Sort key for When lens — lower = sooner. null plan sorts last. */
export function doPlanSortKey(plan: DoPlan | undefined, weekStartsOn: WeekStartDay): number | null {
  if (plan == null) return null;
  if (plan.kind === "day") return plan.offset;
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
  if (plan.kind === "day") return plan.offset >= start && plan.offset <= end;
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
  if (plan.kind === "day") return plan.offset < 0;
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
