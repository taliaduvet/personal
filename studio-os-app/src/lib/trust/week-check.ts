import type { Task } from "../types";
import type { WeekStartDay } from "../week";
import { weekRange } from "../week";
import { dateKeyFromOffset } from "../week-focus";
import { disposeTask, isActiveTask, type SurfaceReason } from "./completeness";
import { commitmentPerson } from "./commitments";

/**
 * THE TRUST CORE INSIDE WEEK PLANNING (docs/TRUST-CORE.md §6).
 *
 * The existing `trustCheckLines()` validates choices the user has *already*
 * made: it only looks at approved tasks, and only at deadlines falling inside
 * this week. That cannot catch the two failures that actually happen —
 * **forgetting to approve something**, and a commitment that lands this week
 * being left out of the plan entirely.
 *
 * So this runs over **every active task**, not just the approved ones. The
 * safety net must not depend on the user having already got it right; that is
 * the whole point of a safety net.
 *
 * Deliberately excluded: window/runway maths ("must start this week" for a
 * deadline three weeks out). That needs the calendar server-side (item 6) and
 * a user-supplied size, and inventing either would violate principle 1.
 */

/** Reasons that represent a real obligation rather than the user's own plan. */
const COMMITMENT_REASONS: ReadonlySet<SurfaceReason> = new Set<SurfaceReason>([
  "respond_by",
  "owed",
  "handoff",
  "deadline",
  "chase",
]);

export type WeekRisk = {
  task: Task;
  reason: SurfaceReason;
  /** When it lands (YYYY-MM-DD). */
  dateKey: string;
  /** Already past — it landed before this week even started. */
  alreadyLate: boolean;
  /** Whoever it involves, when it involves someone. */
  person: string | null;
};

export type WeekTrustCheck = {
  /**
   * Commitments landing this week that are **not** in the plan. The hole the
   * old check couldn't see, and the reason this runs over all tasks.
   */
  missing: WeekRisk[];
  /** Commitments landing this week that are safely in the plan. */
  covered: WeekRisk[];
  /** Ids that should be ticked by default — every commitment lands here. */
  suggestedIds: string[];
};

/**
 * Commitments (not plans) that land inside the planning week.
 *
 * `weekOffset` 0 = the current week; the planning ritual usually runs for the
 * week about to start.
 */
export function weekTrustCheck(
  tasks: Task[],
  approvedIds: string[],
  weekStartsOn: WeekStartDay,
  now: Date = new Date(),
  weekOffset = 0
): WeekTrustCheck {
  const { start, end } = weekRange(weekStartsOn, weekOffset, now);
  const startKey = dateKeyFromOffset(start, now);
  const endKey = dateKeyFromOffset(end, now);
  const approved = new Set(approvedIds);

  const missing: WeekRisk[] = [];
  const covered: WeekRisk[] = [];

  for (const task of tasks) {
    if (!isActiveTask(task)) continue;
    const disposition = disposeTask(task, now);
    if (disposition.state !== "triggered") continue;

    const { dateKey, reason } = disposition.trigger;
    if (!COMMITMENT_REASONS.has(reason)) continue;
    // Anything already past counts as landing this week — it is *more* urgent,
    // not less, and dropping it because its date preceded Monday would be the
    // exact silent loss this exists to prevent.
    if (dateKey > endKey) continue;

    const risk: WeekRisk = {
      task,
      reason,
      dateKey,
      alreadyLate: dateKey < startKey,
      person: commitmentPerson(task),
    };
    (approved.has(task.id) ? covered : missing).push(risk);
  }

  const bySoonest = (a: WeekRisk, b: WeekRisk) =>
    a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0;
  missing.sort(bySoonest);
  covered.sort(bySoonest);

  return {
    missing,
    covered,
    suggestedIds: [...missing, ...covered].map((r) => r.task.id),
  };
}

/**
 * Why un-approving a task would be a problem — or null when it's a free choice.
 *
 * Returned as information plus options, never as a block: the user can always
 * override (principle 12), they just shouldn't be able to do it *unknowingly*.
 */
export function unapproveWarning(
  task: Task,
  weekStartsOn: WeekStartDay,
  now: Date = new Date(),
  weekOffset = 0
): string | null {
  const check = weekTrustCheck([task], [task.id], weekStartsOn, now, weekOffset);
  const risk = check.covered[0];
  if (!risk) return null;

  const who = risk.person;
  switch (risk.reason) {
    case "respond_by":
      return who ? `${who} is expecting a reply this week.` : "A reply is owed this week.";
    case "owed":
      return who ? `${who} is waiting on you.` : "Someone is waiting on you.";
    case "handoff":
      return who ? `This needs ${who} to come back to you first.` : "This is blocked on someone.";
    case "chase":
      return who ? `${who} has gone quiet on this.` : "Someone has gone quiet on this.";
    case "deadline":
      return risk.alreadyLate
        ? "This deadline has already passed."
        : "This has a deadline this week.";
    default:
      return null;
  }
}
