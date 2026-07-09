import type { Task } from "./types";
import type { WeekStartDay } from "./week";
import { isDayInWeek, weekRange } from "./week";
import { isCarriedDoPlan } from "./do-plan";
import { carryOver } from "./weekly-review";
import { deadlineLabel, workModeName } from "./lenses";
import type { ModeWorkload } from "./week-focus";
import type { WeekDaySlot, WeekFocusDraft } from "./week-focus";

export type AreaApproveSection = {
  inProgress: Task[];
  open: Task[];
};

export function isTaskInProgressForPlanning(task: Task, weekStartsOn: WeekStartDay): boolean {
  if (task.status === "in_progress") return true;
  return isCarriedDoPlan(task.doPlan, weekStartsOn);
}

export function partitionAreaTasks(tasks: Task[], weekStartsOn: WeekStartDay): AreaApproveSection {
  const inProgress: Task[] = [];
  const open: Task[] = [];
  for (const t of tasks) {
    if (t.status === "done") continue;
    if (isTaskInProgressForPlanning(t, weekStartsOn)) inProgress.push(t);
    else open.push(t);
  }
  open.sort((a, b) => {
    const da = a.deadlineInDays ?? 9999;
    const db = b.deadlineInDays ?? 9999;
    return da - db;
  });
  return { inProgress, open };
}

export function tasksForLifeArea(tasks: Task[], areaId: string): Task[] {
  return tasks.filter((t) => t.lifeAreaId === areaId && t.status !== "done");
}

/** Sensible first-pass approval: in progress, carried, deadlines this week. */
export function defaultApprovedTaskIds(tasks: Task[], weekStartsOn: WeekStartDay): string[] {
  const { start, end } = weekRange(weekStartsOn, 0);
  const carried = new Set(carryOver(tasks, weekStartsOn, 0).map((t) => t.id));
  return tasks
    .filter((t) => {
      if (t.status === "done") return false;
      if (t.status === "in_progress") return true;
      if (carried.has(t.id)) return true;
      if (t.deadlineInDays !== null && isDayInWeek(t.deadlineInDays, start, end)) return true;
      return false;
    })
    .map((t) => t.id);
}

export function modeLoadFromApproved(tasks: Task[], approvedIds: string[]): ModeWorkload[] {
  const set = new Set(approvedIds);
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!set.has(t.id) || !t.workModeId) continue;
    counts.set(t.workModeId, (counts.get(t.workModeId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([modeId, count]) => ({ modeId, name: workModeName(modeId), count }))
    .sort((a, b) => b.count - a.count);
}

export function approvedTasksByMode(tasks: Task[], approvedIds: string[]): ModeWorkload[] {
  return modeLoadFromApproved(tasks, approvedIds);
}

export function tasksGroupedByMode(
  tasks: Task[],
  approvedIds: string[]
): { modeId: string; name: string; tasks: Task[] }[] {
  const set = new Set(approvedIds);
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!set.has(t.id) || !t.workModeId) continue;
    const list = groups.get(t.workModeId) ?? [];
    list.push(t);
    groups.set(t.workModeId, list);
  }
  return [...groups.entries()]
    .map(([modeId, modeTasks]) => ({
      modeId,
      name: workModeName(modeId),
      tasks: modeTasks.sort((a, b) => (a.deadlineInDays ?? 9999) - (b.deadlineInDays ?? 9999)),
    }))
    .sort((a, b) => b.tasks.length - a.tasks.length);
}

export type TrustCheckLine = { ok: boolean; text: string };

export function trustCheckLines(
  tasks: Task[],
  approvedIds: string[],
  draft: WeekFocusDraft,
  slots: WeekDaySlot[],
  weekStartsOn: WeekStartDay
): TrustCheckLine[] {
  const set = new Set(approvedIds);
  const { start, end } = weekRange(weekStartsOn, 0);
  const urgent = tasks.filter(
    (t) =>
      set.has(t.id) &&
      t.workModeId &&
      t.deadlineInDays !== null &&
      isDayInWeek(t.deadlineInDays, start, end)
  );

  return urgent.map((task) => {
    const modeId = task.workModeId!;
    const deadline = task.deadlineInDays!;
    const hasModeBefore = slots.some((slot) => {
      if (slot.offset > deadline) return false;
      const focus = draft.days[slot.dateKey]?.focus;
      return focus?.kind === "mode" && focus.id === modeId;
    });
    const dl = deadlineLabel(task.deadlineInDays);
    const short =
      task.title.length > 36 ? `${task.title.slice(0, 35)}…` : task.title;
    return {
      ok: hasModeBefore,
      text: hasModeBefore
        ? `✓ ${short} — ${workModeName(modeId)} covered`
        : `○ ${short} (${dl?.text ?? "due"}) — stamp ${workModeName(modeId)} before then`,
    };
  });
}

export function deadlineDotsByDay(
  tasks: Task[],
  approvedIds: string[],
  slots: WeekDaySlot[]
): Record<string, number> {
  const set = new Set(approvedIds);
  const dots: Record<string, number> = {};
  for (const slot of slots) {
    const count = tasks.filter(
      (t) =>
        set.has(t.id) &&
        t.deadlineInDays !== null &&
        t.deadlineInDays === slot.offset
    ).length;
    if (count > 0) dots[slot.dateKey] = count;
  }
  return dots;
}
