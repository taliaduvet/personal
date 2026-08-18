import type { Task, WaitingDirection } from "../types";
import { isDateKey } from "../do-plan";
import { addDaysToDateKey, localDateKey } from "../local-date";

/**
 * PROTECTED COMMITMENTS — Trust Core Layer A (docs/TRUST-CORE.md §5.1).
 *
 * Obligations to other people are a first-class class, not a tag. They are the
 * direct answer to "am I letting someone down?", so they get the strongest
 * guarantee in the system: they surface with lead time, they repeat until dealt
 * with, and they are never allowed to go dormant.
 *
 * Deterministic throughout — dates and arithmetic only. Nothing here may depend
 * on an estimate, a forecast, or history.
 */

/** Someone waiting on you resurfaces on a tighter loop than someone you chase. */
export const OWED_CHECK_DAYS = 3;
/** Days of silence before you're prompted to chase someone else. */
export const CHASE_CHECK_DAYS = 7;
/**
 * How long another person gets to come back to you before *your* deadline is at
 * risk. Deliberately a flat, generous constant: the honest alternative would be
 * an effort estimate, and §3.7 established we cannot earn one.
 */
export const HANDOFF_LEAD_DAYS = 7;

/** Legacy rows predate the field; `waitingOn` used to mean "I'm blocked on them". */
export function waitingDirection(task: Task): WaitingDirection | null {
  const w = task.waitingOn;
  if (!w?.personName?.trim()) return null;
  return w.direction === "me" ? "me" : "them";
}

/** Someone is waiting on *you*. */
export function isOwedToSomeone(task: Task): boolean {
  return waitingDirection(task) === "me";
}

/** You are blocked on someone else. */
export function isBlockedOnSomeone(task: Task): boolean {
  return waitingDirection(task) === "them";
}

/**
 * A commitment to another person, by any route: an explicit "waiting on me",
 * a reply you owe, or a dated piece of work with a person attached.
 */
export function isProtectedCommitment(task: Task): boolean {
  if (task.status === "done") return false;
  if (isOwedToSomeone(task)) return true;
  if (task.needsRespond) return true;
  return Boolean(commitmentPerson(task)) && isDateKey(task.deadlineDateKey);
}

/** Who the commitment is to, if anyone. */
export function commitmentPerson(task: Task): string | null {
  const waiting = task.waitingOn?.personName?.trim();
  if (waiting) return waiting;
  const person = task.personName?.trim();
  return person ? person : null;
}

/**
 * The next date in a repeating check-in that started on `sinceKey`.
 *
 * A one-shot "since + N" date goes permanently overdue once passed and never
 * advances, so it stops being a *check-in* and becomes a stuck flag. This rolls
 * forward to the next N-day boundary strictly after today, so the loop keeps
 * its cadence however long it runs.
 */
export function nextRecurringCheck(
  sinceKey: string,
  everyDays: number,
  todayKey: string
): string | null {
  if (!isDateKey(sinceKey) || !isDateKey(todayKey)) return null;
  if (!Number.isFinite(everyDays) || everyDays <= 0) return null;
  const elapsed = wholeDaysBetween(sinceKey, todayKey);
  if (elapsed < 0) return addDaysToDateKey(sinceKey, everyDays);
  const periods = Math.floor(elapsed / everyDays) + 1;
  return addDaysToDateKey(sinceKey, periods * everyDays);
}

function wholeDaysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000
  );
}

/** The day a person's `waitingOn` clock started, in local terms. */
export function waitingSinceKey(task: Task): string | null {
  const since = task.waitingOn?.sinceIso;
  if (!since) return null;
  const ms = new Date(since).getTime();
  if (Number.isNaN(ms)) return null;
  return localDateKey(new Date(ms));
}

/**
 * When this commitment next needs attention, on a repeating cadence.
 * Tighter for things you owe than for things you're chasing.
 */
export function nextCommitmentCheck(task: Task, now: Date = new Date()): string | null {
  const direction = waitingDirection(task);
  if (!direction) return null;
  const sinceKey = waitingSinceKey(task);
  if (!sinceKey) return null;
  const every = direction === "me" ? OWED_CHECK_DAYS : CHASE_CHECK_DAYS;
  return nextRecurringCheck(sinceKey, every, localDateKey(now));
}

/**
 * Your deadline, propagated backwards onto the person you're waiting on.
 *
 * If the grant is due on the 14th and it needs Sam's letter, Sam's deadline is
 * the 7th — and that is the date worth protecting, because discovering it on
 * the 13th is too late. Returns null unless you are genuinely blocked on
 * someone *and* hold a real deadline.
 */
export function derivedHandoffDeadline(task: Task): string | null {
  if (!isBlockedOnSomeone(task)) return null;
  if (!isDateKey(task.deadlineDateKey)) return null;
  return addDaysToDateKey(task.deadlineDateKey, -HANDOFF_LEAD_DAYS);
}

export type HandoffRisk = {
  task: Task;
  person: string;
  /** The day they need to come back to you. */
  theirDeadline: string;
  /** Your own deadline that it protects. */
  yourDeadline: string;
  /** True once their deadline has arrived or passed. */
  overdue: boolean;
};

/** Everything where someone else's silence is now putting your deadline at risk. */
export function handoffRisks(tasks: Task[], now: Date = new Date()): HandoffRisk[] {
  const todayKey = localDateKey(now);
  const out: HandoffRisk[] = [];
  for (const task of tasks) {
    if (task.status === "done") continue;
    const theirDeadline = derivedHandoffDeadline(task);
    const person = commitmentPerson(task);
    if (!theirDeadline || !person) continue;
    out.push({
      task,
      person,
      theirDeadline,
      yourDeadline: task.deadlineDateKey as string,
      overdue: theirDeadline <= todayKey,
    });
  }
  return out.sort((a, b) => a.theirDeadline.localeCompare(b.theirDeadline));
}

/**
 * LOOP CLOSING — completing is not delivering.
 *
 * A finished task that involved another person, which you never told them
 * about, is work done *and* a person disappointed. Delivery is its own event,
 * so it gets its own surface. Only applies where a person is actually attached.
 */
export function needsDelivery(task: Task): boolean {
  if (task.status !== "done") return false;
  if (task.deliveredAt) return false;
  return Boolean(commitmentPerson(task));
}

export function pendingDelivery(tasks: Task[]): Task[] {
  return tasks.filter(needsDelivery);
}
