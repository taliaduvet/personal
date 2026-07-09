import type { AllDayEvent, DayCommitment, TimedEventSlice } from "./calendar/types";
import type { Task } from "./types";
import type { DayShapeBlock, WeekDayFocusEntry } from "./week-focus";

export const DAY_SHAPE_BLOCKS: DayShapeBlock[] = ["morning", "afternoon", "evening"];

/** Morning before noon, afternoon noon–5pm, evening after 5pm (local). */
export function blockForLocalMs(ms: number): DayShapeBlock {
  const hour = new Date(ms).getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function eventsByShapeBlock(
  timedEvents: TimedEventSlice[]
): Record<DayShapeBlock, TimedEventSlice[]> {
  const buckets: Record<DayShapeBlock, TimedEventSlice[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const ev of timedEvents) {
    buckets[blockForLocalMs(ev.startMs)].push(ev);
  }
  return buckets;
}

export function normalizeShapeBlockTasks(
  raw?: Partial<Record<DayShapeBlock, string[]>>
): Record<DayShapeBlock, string[]> {
  return {
    morning: [...(raw?.morning ?? [])],
    afternoon: [...(raw?.afternoon ?? [])],
    evening: [...(raw?.evening ?? [])],
  };
}

/** Remove task from every block; optionally place in one block. */
export function moveTaskToShapeBlock(
  current: Partial<Record<DayShapeBlock, string[]>> | undefined,
  taskId: string,
  block: DayShapeBlock | null
): Record<DayShapeBlock, string[]> {
  const next = normalizeShapeBlockTasks(current);
  for (const b of DAY_SHAPE_BLOCKS) {
    next[b] = next[b].filter((id) => id !== taskId);
  }
  if (block) next[block] = [...next[block], taskId];
  return next;
}

export function tasksInShapeBlock(tasks: Task[], taskIds: string[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return taskIds.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t));
}

export function unassignedShapeBenchTasks(
  bench: Task[],
  shapeBlockTasks: Partial<Record<DayShapeBlock, string[]>> | undefined
): Task[] {
  const assigned = new Set(
    DAY_SHAPE_BLOCKS.flatMap((b) => shapeBlockTasks?.[b] ?? [])
  );
  return bench.filter((t) => !assigned.has(t.id));
}

export function hasAssignedShapeTasks(
  shapeBlockTasks: Partial<Record<DayShapeBlock, string[]>> | undefined
): boolean {
  return DAY_SHAPE_BLOCKS.some((b) => (shapeBlockTasks?.[b]?.length ?? 0) > 0);
}

/** True when the collapsed dot-strip should appear (future design-mode UI). */
export function hasDayShapeSummary(
  entry: Pick<WeekDayFocusEntry, "note" | "shapeBlockTasks">,
  commitment: Pick<DayCommitment, "timedEvents" | "allDayEvents">
): boolean {
  if (entry.note.trim().length > 0) return true;
  if (hasAssignedShapeTasks(entry.shapeBlockTasks)) return true;
  if (commitment.timedEvents.length > 0) return true;
  if (commitment.allDayEvents.length > 0) return true;
  return false;
}

export function blockShortLabel(block: DayShapeBlock): string {
  if (block === "morning") return "Morning";
  if (block === "afternoon") return "Afternoon";
  return "Evening";
}

export function shapeBlockForTask(
  taskId: string,
  shapeBlockTasks?: Partial<Record<DayShapeBlock, string[]>>
): DayShapeBlock | null {
  for (const block of DAY_SHAPE_BLOCKS) {
    if (shapeBlockTasks?.[block]?.includes(taskId)) return block;
  }
  return null;
}
