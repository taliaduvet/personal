import { dayPlan } from "./do-plan";
import type { Task } from "./types";
import {
  nextMatchingFocusDayOffset,
  resurfaceFocusForTask,
  type DayFocus,
  type WeekFocusDraft,
} from "./week-focus";
import type { WeekStartDay } from "./week";

export type DeferTodayResult = {
  /** Task patch — always clears Today; may aim doPlan at next matching mode day. */
  patch: Partial<Task>;
  /** True when the task should be approved for this week so it can resurface. */
  shouldApprove: boolean;
  /** Offset of the next matching focus day, or null if none this week. */
  nextOffset: number | null;
};

/**
 * Today-bench Defer (not Needs-reply defer):
 * clear inToday, keep eligibility for the next planned day with matching focus.
 */
export function planDeferToday(
  task: Task,
  opts: {
    todayFocus: DayFocus | null;
    draft: WeekFocusDraft;
    weekStartsOn: WeekStartDay;
    approvedIds: Set<string>;
  }
): DeferTodayResult {
  const resurface = resurfaceFocusForTask(task, opts.todayFocus);
  const nextOffset = resurface
    ? nextMatchingFocusDayOffset(opts.draft, resurface, opts.weekStartsOn, 0)
    : null;

  const patch: Partial<Task> = { inToday: false };
  if (nextOffset !== null) {
    patch.doPlan = dayPlan(nextOffset);
  }

  const shouldApprove =
    Boolean(resurface) && nextOffset !== null && !opts.approvedIds.has(task.id);

  return { patch, shouldApprove, nextOffset };
}

export function withDeferredTaskId(
  existing: string[] | undefined,
  taskId: string
): string[] {
  const set = new Set(existing ?? []);
  set.add(taskId);
  return [...set];
}
