import type { Task } from "./types";
import type { WeekStartDay } from "./week";
import { isDayInWeek, weekRange } from "./week";
import { localDateKey } from "./local-date";
import { dateWithOffset, doPlanSortKey, isCurrentWeekPlan } from "./do-plan";
import { deadlineLabel, projectName, workModeName } from "./lenses";
import type { AllDayDisposition } from "./calendar/types";

/** Mode-first day focus, with optional project override. */
export type DayFocus =
  | { kind: "mode"; id: string }
  | { kind: "project"; id: string };

export type WeekDayFocusEntry = {
  focus: DayFocus | null;
  note: string;
};

export type WeekFocusDraft = {
  theme: string | null;
  days: Record<string, WeekDayFocusEntry>;
  /** `${dateKey}:${eventId}` → how all-day items affect planning. */
  allDayDispositions?: Record<string, AllDayDisposition>;
};

export type WeekDaySlot = {
  dateKey: string;
  offset: number;
  weekday: string;
  dayNum: number;
  isToday: boolean;
};

export function dateKeyFromOffset(offset: number): string {
  return localDateKey(dateWithOffset(offset));
}

export function weekDaySlots(weekStartsOn: WeekStartDay): WeekDaySlot[] {
  const { start, end } = weekRange(weekStartsOn, 0);
  const slots: WeekDaySlot[] = [];
  for (let offset = start; offset <= end; offset++) {
    const d = dateWithOffset(offset);
    slots.push({
      dateKey: dateKeyFromOffset(offset),
      offset,
      weekday:
        offset === 0
          ? "Today"
          : offset === 1
            ? "Tmrw"
            : d.toLocaleDateString(undefined, { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: offset === 0,
    });
  }
  return slots;
}

export function emptyWeekFocusDraft(slots: WeekDaySlot[]): WeekFocusDraft {
  const days: Record<string, WeekDayFocusEntry> = {};
  for (const s of slots) {
    days[s.dateKey] = days[s.dateKey] ?? { focus: null, note: "" };
  }
  return { theme: null, days };
}

export function mergeWeekFocusDraft(
  existing: WeekFocusDraft | undefined,
  slots: WeekDaySlot[]
): WeekFocusDraft {
  const base = emptyWeekFocusDraft(slots);
  if (!existing) return base;
  return {
    theme: existing.theme ?? null,
    days: {
      ...base.days,
      ...existing.days,
    },
    allDayDispositions: existing.allDayDispositions ?? {},
  };
}

export function focusLabel(focus: DayFocus | null): string {
  if (!focus) return "Open";
  if (focus.kind === "mode") return workModeName(focus.id);
  return projectName(focus.id);
}

export function focusShortLabel(focus: DayFocus | null): string {
  const full = focusLabel(focus);
  if (full === "Open") return "—";
  return full.length > 10 ? `${full.slice(0, 9)}…` : full;
}

export function taskMatchesFocus(task: Task, focus: DayFocus): boolean {
  if (focus.kind === "mode") return task.workModeId === focus.id;
  return task.projectId === focus.id;
}

/** Task is eligible for a focus day (respects explicit doPlan exceptions). */
export function taskEligibleForFocusDay(task: Task, dayOffset: number, weekStartsOn: WeekStartDay): boolean {
  if (task.status === "done") return false;
  if (task.doPlan?.kind === "day") return task.doPlan.offset === dayOffset;
  if (task.doPlan === null) return true;
  if (isCurrentWeekPlan(task.doPlan, weekStartsOn)) return true;
  const key = doPlanSortKey(task.doPlan, weekStartsOn);
  const { start, end } = weekRange(weekStartsOn, 0);
  return key !== null && key >= start && key <= end;
}

export function tasksForDayFocus(
  tasks: Task[],
  focus: DayFocus,
  dayOffset: number,
  weekStartsOn: WeekStartDay
): Task[] {
  return tasks.filter(
    (t) => taskMatchesFocus(t, focus) && taskEligibleForFocusDay(t, dayOffset, weekStartsOn)
  );
}

export function todayFocusEntry(
  draft: WeekFocusDraft,
  weekStartsOn: WeekStartDay
): { focus: DayFocus | null; note: string } {
  const key = dateKeyFromOffset(0);
  return draft.days[key] ?? { focus: null, note: "" };
}

export type WeekDeadlineRow = {
  task: Task;
  offset: number;
  label: ReturnType<typeof deadlineLabel>;
};

export function deadlinesInWeek(tasks: Task[], weekStartsOn: WeekStartDay): WeekDeadlineRow[] {
  const { start, end } = weekRange(weekStartsOn, 0);
  return tasks
    .filter((t) => t.status !== "done" && t.deadlineInDays !== null)
    .filter((t) => isDayInWeek(t.deadlineInDays!, start, end))
    .sort((a, b) => (a.deadlineInDays ?? 0) - (b.deadlineInDays ?? 0))
    .map((task) => ({
      task,
      offset: task.deadlineInDays!,
      label: deadlineLabel(task.deadlineInDays),
    }));
}

export type ModeWorkload = {
  modeId: string;
  name: string;
  count: number;
};

export function modeWorkloads(tasks: Task[], weekStartsOn: WeekStartDay): ModeWorkload[] {
  const { start, end } = weekRange(weekStartsOn, 0);
  const active = tasks.filter((t) => {
    if (t.status === "done" || !t.workModeId) return false;
    if (t.doPlan?.kind === "day") return isDayInWeek(t.doPlan.offset, start, end);
    if (t.doPlan === null) return true;
    return isCurrentWeekPlan(t.doPlan, weekStartsOn) || doPlanSortKey(t.doPlan, weekStartsOn)! <= end;
  });
  const counts = new Map<string, number>();
  for (const t of active) {
    if (!t.workModeId) continue;
    counts.set(t.workModeId, (counts.get(t.workModeId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([modeId, count]) => ({ modeId, name: workModeName(modeId), count }))
    .sort((a, b) => b.count - a.count);
}

export function countFocusDays(draft: WeekFocusDraft): number {
  return Object.values(draft.days).filter((d) => d.focus !== null).length;
}

export function partitionInTodayByFocus(
  tasks: Task[],
  focus: DayFocus | null
): { inFocus: Task[]; outsideFocus: Task[] } {
  const inToday = tasks.filter((t) => t.inToday && t.status !== "done");
  if (!focus) return { inFocus: inToday, outsideFocus: [] };
  const inFocus: Task[] = [];
  const outsideFocus: Task[] = [];
  for (const t of inToday) {
    if (taskMatchesFocus(t, focus)) inFocus.push(t);
    else outsideFocus.push(t);
  }
  return { inFocus, outsideFocus };
}
