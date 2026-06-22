import type { Task } from "./types";
import type { WeekStartDay } from "./week";
import { isDayInWeek, weekRange } from "./week";
import { doPlanSortKey } from "./do-plan";
import { LIFE_AREAS, PROJECTS } from "./sample-data";
import { lifeAreaName, projectName } from "./lenses";

export { weekRange, weekKey } from "./week";

function inWeek(completedAtInDays: number | null, start: number, end: number): boolean {
  return isDayInWeek(completedAtInDays, start, end);
}

/** Tasks marked done during this week window. */
export function shippedThisWeek(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  const { start, end } = weekRange(weekStartsOn, weekOffset);
  return tasks
    .filter((t) => t.status === "done" && inWeek(t.completedAtInDays, start, end))
    .sort((a, b) => (b.completedAtInDays ?? 0) - (a.completedAtInDays ?? 0));
}

/** Active tasks whose soft plan predates this week — calmly carried forward. */
export function carryOver(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  const { start } = weekRange(weekStartsOn, weekOffset);
  return tasks.filter((t) => {
    if (t.status === "done" || t.doPlan === null) return false;
    if (t.doPlan.kind === "day") return t.doPlan.offset < start;
    const planStart = doPlanSortKey(t.doPlan, weekStartsOn);
    return planStart !== null && planStart < start;
  });
}

/** Active tasks still in motion this week (not carried). */
export function inFlight(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  const carried = new Set(carryOver(tasks, weekStartsOn, weekOffset).map((t) => t.id));
  return tasks.filter((t) => t.status !== "done" && !carried.has(t.id));
}

/** Done this week where a hard deadline existed. */
export function deadlinesHit(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): Task[] {
  return shippedThisWeek(tasks, weekStartsOn, weekOffset).filter((t) => t.deadlineInDays !== null);
}

export type AreaBalance = {
  id: string;
  name: string;
  color: string;
  shipped: number;
  active: number;
};

/** Reflective life-balance snapshot — no nudges, just what happened. */
export function lifeBalanceWeek(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): AreaBalance[] {
  const shipped = shippedThisWeek(tasks, weekStartsOn, weekOffset);
  const active = tasks.filter((t) => t.status !== "done");
  return LIFE_AREAS.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    shipped: shipped.filter((t) => t.lifeAreaId === a.id).length,
    active: active.filter((t) => t.lifeAreaId === a.id).length,
  })).filter((r) => r.shipped > 0 || r.active > 0);
}

export type ProjectWeekProgress = {
  id: string;
  name: string;
  color: string;
  shippedThisWeek: number;
  totalDone: number;
  total: number;
};

export function projectProgressWeek(tasks: Task[], weekStartsOn: WeekStartDay, weekOffset = 0): ProjectWeekProgress[] {
  const shipped = shippedThisWeek(tasks, weekStartsOn, weekOffset);
  return PROJECTS.map((p) => {
    const mine = tasks.filter((t) => t.projectId === p.id);
    const area = LIFE_AREAS.find((a) => a.id === p.lifeAreaId);
    return {
      id: p.id,
      name: p.name,
      color: area?.color ?? "#8b95a1",
      shippedThisWeek: shipped.filter((t) => t.projectId === p.id).length,
      totalDone: mine.filter((t) => t.status === "done").length,
      total: mine.length,
    };
  }).filter((p) => p.total > 0);
}

export function taskMetaLine(t: Task): string {
  const parts: string[] = [];
  if (t.projectId) parts.push(projectName(t.projectId));
  if (t.lifeAreaId) parts.push(lifeAreaName(t.lifeAreaId));
  return parts.join(" · ") || "Unsorted";
}
