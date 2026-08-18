import type { Task } from "../types";
import {
  dormant,
  dueNow,
  tasksWithFaults,
  type DisposedTask,
  type SurfaceReason,
} from "./completeness";
import { commitmentPerson, handoffRisks, pendingDelivery, type HandoffRisk } from "./commitments";
import { localDateKey } from "../local-date";

/**
 * THE STATE OF THINGS — the single answer to "is everything held?".
 *
 * This is the payload behind both the in-app panel and (later) the one daily
 * message. It is deliberately a pure function of tasks + clock so the same
 * summary can be rendered on screen, pushed, or emailed without divergence.
 *
 * Note the deliberate asymmetry: things needing action are listed, while the
 * dormant pile is only *counted*. Dormant work is safe by definition — it has
 * been captured and it will be swept at review — so surfacing it here would
 * manufacture pressure the user doesn't need (principles 3 and 13).
 */
export type TrustSummary = {
  /**
   * The safety net: things at risk of being lost, that the planning system
   * isn't already handling. This — and only this — is what earns a push.
   */
  needsYou: DisposedTask[];
  /**
   * Planned for a past day and still not done, so it has fallen off Today.
   * Shown quietly: a "doing by" slipping is information, not an alarm (§6.1).
   */
  slipped: DisposedTask[];
  /**
   * Planned for today. Today's job, not the trust core's — listing it here
   * would just be a second Today view wearing an alarming hat.
   */
  scheduledToday: DisposedTask[];
  /** Someone else's silence is putting one of your deadlines at risk. */
  handoffs: HandoffRisk[];
  /** Finished work the person was never told about. */
  awaitingDelivery: Task[];
  /** Captured, safe, nothing scheduled — swept at the weekly review. */
  dormantCount: number;
  oldestDormantDays: number;
  /** Tasks holding unreadable dates. Never silent (principle 9). */
  faultCount: number;
  /** Everything is genuinely held and nothing needs you right now. */
  allClear: boolean;
  /** Active tasks being held in total — the "I've got it" number. */
  heldCount: number;
};

export function summarize(tasks: Task[], now: Date = new Date()): TrustSummary {
  const todayKey = localDateKey(now);
  const due = dueNow(tasks, now);
  const handoffs = handoffRisks(tasks, now).filter((h) => h.overdue);
  const awaitingDelivery = pendingDelivery(tasks);
  const sleeping = dormant(tasks, now);
  const faults = tasksWithFaults(tasks, now);

  // The load-bearing distinction. A task planned for today is already on Today;
  // repeating it here would make this a second Today view rather than a safety
  // net — and would bury the genuine risks under routine work.
  const needsYou: DisposedTask[] = [];
  const slipped: DisposedTask[] = [];
  const scheduledToday: DisposedTask[] = [];

  for (const item of due) {
    const trigger = item.disposition.state === "triggered" ? item.disposition.trigger : null;
    if (trigger?.reason === "planned") {
      (trigger.dateKey < todayKey ? slipped : scheduledToday).push(item);
    } else {
      needsYou.push(item);
    }
  }

  return {
    needsYou,
    slipped,
    scheduledToday,
    handoffs,
    awaitingDelivery,
    dormantCount: sleeping.length,
    oldestDormantDays: sleeping[0]?.disposition.ageDays ?? 0,
    faultCount: faults.length,
    // Slipped plans deliberately do NOT block the all-clear: nothing has been
    // lost, it is visible, and §6.1 says a doing-by slipping is information
    // rather than an alarm. Only genuine risk blocks it.
    //
    // Undelivered work DOES block it. Finishing something and never sending it
    // is a person left waiting, which is exactly the silent failure the promise
    // in §1 rules out — "sent ✓" is not cosmetic. This is only safe to depend
    // on because `DeliveryPrompt` asks at completion, so an item sitting here
    // means genuinely undelivered rather than merely un-annotated.
    allClear:
      needsYou.length === 0 &&
      handoffs.length === 0 &&
      faults.length === 0 &&
      awaitingDelivery.length === 0,
    heldCount: tasks.filter((t) => t.status !== "done").length,
  };
}

/**
 * Plain, non-demanding phrasing for why something surfaced.
 *
 * Informational, never imperative (principle 3, §7). "Reply owed to Sam" states
 * a fact; "You must reply to Sam" issues an order, and orders are the thing that
 * makes this kind of system get avoided.
 */
export function reasonLabel(reason: SurfaceReason, task: Task): string {
  const person = commitmentPerson(task);
  switch (reason) {
    case "respond_by":
      return person ? `reply owed to ${person}` : "reply owed";
    case "owed":
      return person ? `${person} is waiting on you` : "someone is waiting on you";
    case "handoff":
      return person ? `needs ${person} to come back to you` : "waiting on someone else";
    case "chase":
      return person ? `${person} has been quiet` : "waiting on someone";
    case "deadline":
      return "deadline";
    case "start_thinking":
      return "worth starting";
    case "planned":
      return "you planned this";
    case "recurring":
      return "comes round again";
  }
}

/** How overdue, in plain words. Neutral — a fact, never a scolding. */
export function overdueLabel(dateKey: string, todayKey: string): string | null {
  if (dateKey >= todayKey) return null;
  const [dy, dm, dd] = dateKey.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const days = Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(dy, dm - 1, dd).getTime()) / 86_400_000
  );
  if (days <= 0) return null;
  if (days === 1) return "since yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
