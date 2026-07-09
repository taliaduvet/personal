import type { Task } from "./types";
import type { WeekStartDay } from "./week";
import { hasDoPlanWithinWeek } from "./do-plan";

/** Active tasks matching today's mode that aren't on the mode bench yet. */
export function unplannedModeTasks(
  tasks: Task[],
  modeId: string,
  approvedIds: Set<string>,
  weekStartsOn: WeekStartDay
): Task[] {
  if (approvedIds.size === 0) return [];
  return tasks
    .filter(
      (t) =>
        t.status !== "done" &&
        t.workModeId === modeId &&
        !approvedIds.has(t.id) &&
        !hasDoPlanWithinWeek(t.doPlan, weekStartsOn)
    )
    .sort((a, b) => (a.deadlineInDays ?? 9999) - (b.deadlineInDays ?? 9999));
}

/**
 * Show nudge when there are unplanned tasks and either never dismissed,
 * or a new unplanned task appeared since dismiss (id not in snapshot).
 */
export function shouldShowUnplannedNudge(
  unplannedIds: string[],
  dismissedSnapshot: string[] | undefined
): boolean {
  if (unplannedIds.length === 0) return false;
  if (!dismissedSnapshot || dismissedSnapshot.length === 0) return true;
  const dismissed = new Set(dismissedSnapshot);
  return unplannedIds.some((id) => !dismissed.has(id));
}
