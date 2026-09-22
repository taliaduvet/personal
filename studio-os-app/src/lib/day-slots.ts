import type { Task } from "./types";
import type { WeekStartDay } from "./week";
import type { DayFocus, WeekDayFocusEntry, WeekFocusDraft } from "./week-focus";
import { dayFocusIncludes, weekDaySlots } from "./week-focus";

/** dateKey -> task ids explicitly placed on that day (comingled across whatever modes are stamped on that day, same shape as a single day's shapeBlockTasks). */
export type DaySlotMap = Record<string, string[]>;

/** Every dateKey a given focus (e.g. one work mode) is stamped on this week, in week order. */
export function daySlotDateKeysForFocus(
  weekStartsOn: WeekStartDay,
  weekOffset: number,
  draft: WeekFocusDraft,
  focus: DayFocus
): string[] {
  return weekDaySlots(weekStartsOn, weekOffset)
    .filter((slot) => dayFocusIncludes(draft.days[slot.dateKey]?.focus ?? null, focus))
    .map((slot) => slot.dateKey);
}

/** Slice draft.days down to a flat dateKey -> slottedTaskIds map for the given days. */
export function daySlotMapForDays(
  days: Record<string, WeekDayFocusEntry>,
  dateKeys: string[]
): DaySlotMap {
  const map: DaySlotMap = {};
  for (const dateKey of dateKeys) {
    map[dateKey] = [...(days[dateKey]?.slottedTaskIds ?? [])];
  }
  return map;
}

/** Remove task from every day in the map; optionally place it on one dateKey. */
export function moveTaskToDaySlot(
  current: DaySlotMap,
  taskId: string,
  dateKey: string | null
): DaySlotMap {
  const next: DaySlotMap = {};
  for (const key of Object.keys(current)) {
    next[key] = current[key]!.filter((id) => id !== taskId);
  }
  if (dateKey) {
    next[dateKey] = [...(next[dateKey] ?? []), taskId];
  }
  return next;
}

export function tasksInDaySlot(tasks: Task[], taskIds: string[] | undefined): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return (taskIds ?? []).map((id) => byId.get(id)).filter((t): t is Task => Boolean(t));
}

export function unslottedBenchTasksForMode(bench: Task[], slotMap: DaySlotMap): Task[] {
  const assigned = new Set(Object.values(slotMap).flat());
  return bench.filter((t) => !assigned.has(t.id));
}

export function hasAnySlottedTasks(slotMap: DaySlotMap): boolean {
  return Object.values(slotMap).some((ids) => ids.length > 0);
}
