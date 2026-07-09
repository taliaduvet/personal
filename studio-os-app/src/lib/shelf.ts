import { dateWithOffset } from "./do-plan";
import { localDateKey, dateKeyStartMs } from "./local-date";
import { formatRelativeDayOffset } from "./time-display";
import type { Task } from "./types";

export type ShippedMonthGroup = {
  key: string;
  label: string;
  tasks: Task[];
};

export type ShippedFilters = {
  lifeAreaId?: string | null;
  projectId?: string | null;
};

export function completionSortMs(task: Task): number {
  if (task.completedAtIso) {
    const ms = new Date(task.completedAtIso).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  if (task.completedAtInDays !== null) {
    return dateKeyStartMs(localDateKey(dateWithOffset(task.completedAtInDays)));
  }
  return task.parkedAt;
}

export function shippedTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => completionSortMs(b) - completionSortMs(a));
}

export function filterShipped(tasks: Task[], filters: ShippedFilters): Task[] {
  let list = shippedTasks(tasks);
  if (filters.lifeAreaId) {
    list = list.filter((t) => t.lifeAreaId === filters.lifeAreaId);
  }
  if (filters.projectId) {
    list = list.filter((t) => t.projectId === filters.projectId);
  }
  return list;
}

export function monthKeyForTask(task: Task): string {
  if (task.completedAtIso) {
    const d = new Date(task.completedAtIso);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  if (task.completedAtInDays !== null) {
    const d = dateWithOffset(task.completedAtInDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const d = new Date(task.parkedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function groupShippedByMonth(tasks: Task[]): ShippedMonthGroup[] {
  const map = new Map<string, Task[]>();
  for (const t of filterShipped(tasks, {})) {
    const key = monthKeyForTask(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, monthTasks]) => ({
      key,
      label: formatMonthLabel(key),
      tasks: monthTasks.sort((a, b) => completionSortMs(b) - completionSortMs(a)),
    }));
}

export function formatShippedDate(task: Task): string {
  if (task.completedAtIso) {
    const d = new Date(task.completedAtIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
  }
  if (task.completedAtInDays !== null) {
    return formatRelativeDayOffset(task.completedAtInDays);
  }
  return "shipped";
}
