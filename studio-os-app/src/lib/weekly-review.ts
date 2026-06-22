import type { Task } from "./types";
import { LIFE_AREAS, PROJECTS } from "./sample-data";
import { lifeAreaName, projectName } from "./lenses";

/** Sunday-start week. weekOffset 0 = this week, -1 = last week. */
export function weekRange(weekOffset: number): { start: number; end: number; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = -day - weekOffset * 7;
  const end = start + 6;

  const startDate = new Date(now);
  startDate.setDate(now.getDate() + start);
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + end);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const label =
    weekOffset === 0
      ? `This week · ${fmt(startDate)} – ${fmt(endDate)}`
      : `${fmt(startDate)} – ${fmt(endDate)}`;

  return { start, end, label };
}

export function weekKey(weekOffset: number): string {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day - weekOffset * 7);
  return sunday.toISOString().slice(0, 10);
}

function inWeek(completedAtInDays: number | null, start: number, end: number): boolean {
  if (completedAtInDays === null) return false;
  return completedAtInDays >= start && completedAtInDays <= end;
}

/** Tasks marked done during this week window. */
export function shippedThisWeek(tasks: Task[], weekOffset: number): Task[] {
  const { start, end } = weekRange(weekOffset);
  return tasks
    .filter((t) => t.status === "done" && inWeek(t.completedAtInDays, start, end))
    .sort((a, b) => (b.completedAtInDays ?? 0) - (a.completedAtInDays ?? 0));
}

/** Active tasks whose soft plan predates this week — calmly carried forward. */
export function carryOver(tasks: Task[], weekOffset: number): Task[] {
  const { start } = weekRange(weekOffset);
  return tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.doDateInDays !== null &&
      t.doDateInDays < start
  );
}

/** Active tasks still in motion this week (not carried). */
export function inFlight(tasks: Task[], weekOffset: number): Task[] {
  const carried = new Set(carryOver(tasks, weekOffset).map((t) => t.id));
  return tasks.filter(
    (t) => t.status !== "done" && !carried.has(t.id)
  );
}

/** Done this week where a hard deadline existed. */
export function deadlinesHit(tasks: Task[], weekOffset: number): Task[] {
  return shippedThisWeek(tasks, weekOffset).filter((t) => t.deadlineInDays !== null);
}

export type AreaBalance = {
  id: string;
  name: string;
  color: string;
  shipped: number;
  active: number;
};

/** Reflective life-balance snapshot — no nudges, just what happened. */
export function lifeBalanceWeek(tasks: Task[], weekOffset: number): AreaBalance[] {
  const shipped = shippedThisWeek(tasks, weekOffset);
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

export function projectProgressWeek(tasks: Task[], weekOffset: number): ProjectWeekProgress[] {
  const shipped = shippedThisWeek(tasks, weekOffset);
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
