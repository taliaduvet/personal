import type { Task } from "./types";
import type { WeekPlanningSummary } from "./settings-store";
import type { WeekStartDay } from "./week";
import { isDayInWeek, weekKey, weekRange } from "./week";
import { dateWithOffset, doPlanDayOffset, doPlanSortKey, isCurrentWeekPlan } from "./do-plan";
import { carryOver } from "./weekly-review";

/** Active task with any doing plan that falls in the target week window. */
export function isTaskInCurrentWeek(t: Task, weekStartsOn: WeekStartDay, weekOffset = 0): boolean {
  if (t.status === "done" || t.doPlan == null) return false;
  const { start, end } = weekRange(weekStartsOn, weekOffset);
  if (t.doPlan.kind === "week") {
    const planStart = doPlanSortKey(t.doPlan, weekStartsOn);
    return planStart !== null && planStart >= start && planStart <= end;
  }
  return isDayInWeek(doPlanDayOffset(t.doPlan) ?? NaN, start, end);
}

export function tasksInCurrentWeek(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  return tasks.filter((t) => isTaskInCurrentWeek(t, weekStartsOn, weekOffset));
}

export function currentWeekBucketTasks(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  return tasks.filter((t) => t.status !== "done" && isCurrentWeekPlan(t.doPlan, weekStartsOn, weekOffset));
}

export function currentWeekDayTasks(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  const { start, end } = weekRange(weekStartsOn, weekOffset);
  return tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.doPlan?.kind === "day" &&
      isDayInWeek(doPlanDayOffset(t.doPlan) ?? NaN, start, end)
  );
}

export function computeWeekPlanningSummary(
  tasks: Task[],
  weekStartsOn: WeekStartDay,
  focusDays: number,
  weekOffset = 0
): WeekPlanningSummary {
  const { start, end } = weekRange(weekStartsOn, weekOffset);
  const active = tasks.filter((t) => t.status !== "done");

  const placed = active.filter(
    (t) => t.doPlan?.kind === "day" && isDayInWeek(doPlanDayOffset(t.doPlan) ?? NaN, start, end)
  ).length;

  const stillOpen = currentWeekBucketTasks(tasks, weekStartsOn, weekOffset).length;

  const pulledToToday = active.filter(
    (t) =>
      t.inToday &&
      ((t.doPlan?.kind === "day" && isDayInWeek(doPlanDayOffset(t.doPlan) ?? NaN, start, end)) ||
        isCurrentWeekPlan(t.doPlan, weekStartsOn, weekOffset))
  ).length;

  return { focusDays, placed, stillOpen, pulledToToday };
}

export type WeekPlanningMode = "active" | "shaped";

/** Active until Done planning — bumps back if new week-bucket tasks appear. */
export function weekPlanningMode(
  tasks: Task[],
  weekStartsOn: WeekStartDay,
  weekPlanning: Record<string, { completedAt: string; summary: WeekPlanningSummary }>,
  weekOffset = 0
): WeekPlanningMode {
  const key = weekKey(weekStartsOn, weekOffset);
  const record = weekPlanning[key];
  const bucketCount = currentWeekBucketTasks(tasks, weekStartsOn, weekOffset).length;
  if (!record || bucketCount > 0) return "active";
  return "shaped";
}

export function weekDayOptions(weekStartsOn: WeekStartDay, weekOffset = 0): { offset: number; label: string }[] {
  const { start, end } = weekRange(weekStartsOn, weekOffset);
  const options: { offset: number; label: string }[] = [];
  for (let offset = start; offset <= end; offset++) {
    let label: string;
    if (offset === 0) label = "Today";
    else if (offset === 1) label = "Tmrw";
    else label = dateWithOffset(offset).toLocaleDateString(undefined, { weekday: "short" });
    options.push({ offset, label });
  }
  return options;
}

export function carriedForPlanning(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  return carryOver(tasks, weekStartsOn, weekOffset);
}

export type WeekDayGroup = {
  /** Day offset, or "unplaced" for week-bucket tasks. */
  key: number | "unplaced";
  label: string;
  tasks: Task[];
};

/** Agenda groups for the planning card — unplaced first, then days in order. */
export function groupWeekTasksByDay(
  weekTasks: Task[],
  bucketTasks: Task[],
  weekStartsOn: WeekStartDay
): WeekDayGroup[] {
  const groups: WeekDayGroup[] = [];

  if (bucketTasks.length > 0) {
    groups.push({ key: "unplaced", label: "Unplaced", tasks: bucketTasks });
  }

  for (const d of weekDayOptions(weekStartsOn)) {
    const dayTasks = weekTasks.filter(
      (t) => t.doPlan?.kind === "day" && doPlanDayOffset(t.doPlan) === d.offset
    );
    if (dayTasks.length > 0) {
      groups.push({ key: d.offset, label: d.label, tasks: dayTasks });
    }
  }

  return groups;
}
