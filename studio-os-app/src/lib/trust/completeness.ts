import type { Task } from "../types";
import { isDateKey } from "../do-plan";
import { addDaysToDateKey, localDateKey } from "../local-date";
import { nextOccurrenceOffset } from "../recurrence";
import { isWaitingTask } from "../waiting-on";
import {
  derivedHandoffDeadline,
  nextCommitmentCheck,
  waitingDirection,
} from "./commitments";

/**
 * THE COMPLETENESS INVARIANT — Trust Core Layer A (see docs/TRUST-CORE.md §5.1).
 *
 * Every active task is in exactly one of two states, always:
 *
 *   1. **triggered** — it has a date on which it comes back to you, or
 *   2. **dormant**   — nothing is scheduled, but it still has an *age*, which
 *                      orders the weekly review sweep.
 *
 * There is no third state. Because every task carries `parkedAt`, age is a
 * universal fallback: the invariant never depends on the user having supplied a
 * date. `disposeTask` is a total function — it cannot return null, and a task
 * cannot fall between the cases.
 *
 * This module is deliberately dumb: dates and arithmetic only. No estimates, no
 * history, no AI, no forecasting. It must keep working on day one with an empty
 * database, because the promise ("nothing you captured falls through") may not
 * depend on anything that can be absent or wrong.
 */

/** Why a task will next come back. Also breaks ties between equal dates. */
export type SurfaceReason =
  | "respond_by"
  | "owed"
  | "handoff"
  | "deadline"
  | "start_thinking"
  | "planned"
  | "recurring"
  | "chase";

/** Lower number = wins a tie on the same date. Obligations to people first. */
const REASON_PRECEDENCE: Record<SurfaceReason, number> = {
  respond_by: 0,
  owed: 1,
  handoff: 2,
  deadline: 3,
  start_thinking: 4,
  planned: 5,
  recurring: 6,
  chase: 7,
};

export type SurfaceTrigger = {
  /** The day this next needs attention (YYYY-MM-DD, local). */
  dateKey: string;
  reason: SurfaceReason;
  /** True when that day has arrived or passed. */
  due: boolean;
};

/**
 * A field whose stored value isn't usable. Surfaced rather than swallowed:
 * a task going dormant because its date was unreadable is exactly the kind of
 * silent hole this layer exists to prevent (principle 9 — announce degradation).
 */
export type DataFault = { field: string; value: unknown };

export type TaskDisposition =
  | { state: "triggered"; trigger: SurfaceTrigger; ageDays: number; faults: DataFault[] }
  | { state: "dormant"; trigger: null; ageDays: number; faults: DataFault[] };

/** The shelf/archive is simply completed work, so "active" is everything else. */
export function isActiveTask(task: Task): boolean {
  return task.status !== "done";
}

/** Whole days since capture. Never negative, even with a clock-skewed future date. */
export function taskAgeDays(task: Task, now: Date = new Date()): number {
  if (!Number.isFinite(task.parkedAt)) return 0;
  const captured = localDateKey(new Date(task.parkedAt));
  if (!isDateKey(captured)) return 0;
  return Math.max(0, daysBetween(captured, localDateKey(now)));
}

/** Whole calendar days from `fromKey` to `toKey` (negative when toKey is earlier). */
function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd).getTime();
  const to = new Date(ty, tm - 1, td).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** Collect unusable date values so they can be reported instead of silently dropped. */
export function taskDataFaults(task: Task): DataFault[] {
  const faults: DataFault[] = [];
  const check = (field: string, value: unknown) => {
    if (value == null) return;
    if (!isDateKey(value)) faults.push({ field, value });
  };
  check("deadlineDateKey", task.deadlineDateKey);
  check("respondByDateKey", task.respondByDateKey);
  check("startThinkingAtDateKey", task.startThinkingAtDateKey);
  if (task.doPlan?.kind === "day" && !isDateKey(task.doPlan.dateKey)) {
    faults.push({ field: "doPlan.dateKey", value: task.doPlan.dateKey });
  }
  if (task.doPlan?.kind === "week" && !isDateKey(task.doPlan.weekStart)) {
    faults.push({ field: "doPlan.weekStart", value: task.doPlan.weekStart });
  }
  if (isWaitingTask(task)) {
    const since = task.waitingOn?.sinceIso;
    if (since != null && Number.isNaN(new Date(since).getTime())) {
      faults.push({ field: "waitingOn.sinceIso", value: since });
    }
  }
  return faults;
}

type Candidate = { dateKey: string; reason: SurfaceReason };

/** Every date on which this task could legitimately come back. */
function surfaceCandidates(task: Task, now: Date): Candidate[] {
  const out: Candidate[] = [];
  const add = (dateKey: unknown, reason: SurfaceReason) => {
    if (isDateKey(dateKey)) out.push({ dateKey, reason });
  };

  add(task.respondByDateKey, "respond_by");
  add(task.deadlineDateKey, "deadline");
  add(task.startThinkingAtDateKey, "start_thinking");

  if (task.doPlan?.kind === "day") add(task.doPlan.dateKey, "planned");
  if (task.doPlan?.kind === "week") add(task.doPlan.weekStart, "planned");

  // A recurring obligation always has a next occurrence, so it can never be
  // dormant — "submit weekly timesheet" with no date on it is still weekly.
  // Only consulted when nothing is explicitly planned; an actual plan is the
  // current occurrence and is necessarily sooner.
  if (task.recurrence && out.every((c) => c.reason !== "planned")) {
    const offset = nextOccurrenceOffset(task.recurrence, task.doPlan, now);
    if (Number.isFinite(offset)) {
      add(addDaysToDateKey(localDateKey(now), offset), "recurring");
    }
  }

  // Your own deadline propagated backwards onto whoever you're blocked on —
  // the date that actually protects the commitment (see commitments.ts).
  add(derivedHandoffDeadline(task), "handoff");

  // Anything involving a person keeps coming back on a repeating cadence:
  // tighter when someone is waiting on you, looser when you're chasing them.
  // Without this, "waiting" becomes a place things quietly go to die.
  if (isWaitingTask(task)) {
    const direction = waitingDirection(task);
    add(nextCommitmentCheck(task, now), direction === "me" ? "owed" : "chase");
  }

  return out;
}

/**
 * The single date on which this task next needs attention — the *earliest*
 * candidate, because that is when it first matters. Ties break toward
 * obligations to other people.
 */
export function nextSurfaceTrigger(task: Task, now: Date = new Date()): SurfaceTrigger | null {
  const candidates = surfaceCandidates(task, now);
  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? a : b;
    return REASON_PRECEDENCE[a.reason] <= REASON_PRECEDENCE[b.reason] ? a : b;
  });

  const todayKey = localDateKey(now);
  return { dateKey: best.dateKey, reason: best.reason, due: best.dateKey <= todayKey };
}

/**
 * Classify a task. **Total function** — every active task lands in exactly one
 * state, which is what makes "nothing falls through" provable rather than
 * asserted (see `completeness.test.ts`).
 */
export function disposeTask(task: Task, now: Date = new Date()): TaskDisposition {
  const ageDays = taskAgeDays(task, now);
  const faults = taskDataFaults(task);
  const trigger = nextSurfaceTrigger(task, now);
  return trigger
    ? { state: "triggered", trigger, ageDays, faults }
    : { state: "dormant", trigger: null, ageDays, faults };
}

export type DisposedTask = { task: Task; disposition: TaskDisposition };

export function disposeAll(tasks: Task[], now: Date = new Date()): DisposedTask[] {
  return tasks
    .filter(isActiveTask)
    .map((task) => ({ task, disposition: disposeTask(task, now) }));
}

/** Everything whose trigger date has arrived — what actually needs you now. */
export function dueNow(tasks: Task[], now: Date = new Date()): DisposedTask[] {
  return disposeAll(tasks, now)
    .filter((d) => d.disposition.state === "triggered" && d.disposition.trigger.due)
    .sort((a, b) => {
      const A = a.disposition.trigger!;
      const B = b.disposition.trigger!;
      if (A.dateKey !== B.dateKey) return A.dateKey < B.dateKey ? -1 : 1;
      return REASON_PRECEDENCE[A.reason] - REASON_PRECEDENCE[B.reason];
    });
}

/** The dormant pile, oldest first — the weekly review's sweep order. */
export function dormant(tasks: Task[], now: Date = new Date()): DisposedTask[] {
  return disposeAll(tasks, now)
    .filter((d) => d.disposition.state === "dormant")
    .sort((a, b) => b.disposition.ageDays - a.disposition.ageDays);
}

/** Tasks holding unreadable dates — for the health surface, never silent. */
export function tasksWithFaults(tasks: Task[], now: Date = new Date()): DisposedTask[] {
  return disposeAll(tasks, now).filter((d) => d.disposition.faults.length > 0);
}
