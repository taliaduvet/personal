import { dateKeyStartMs, localDateKey } from "./local-date";
import type { Task } from "./types";

/** Whether an ISO timestamp falls on the local calendar day for `offset` (0 = today). */
export function isCompletedOnDay(iso: string, dayOffset = 0): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  return localDateKey(d) === localDateKey(target);
}

export function isLiftedToday(task: Task): boolean {
  if (task.status !== "done") return false;
  if (task.completedAtIso) return isCompletedOnDay(task.completedAtIso, 0);
  return task.completedAtInDays === 0;
}

/** Human label for the Lifted today rail. */
export function formatLiftedTime(task: Task): string {
  if (task.completedAtIso) {
    const d = new Date(task.completedAtIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }
  if (task.completedAtInDays === 0) return "earlier today";
  return "earlier";
}

export function completionIsoNow(): string {
  return new Date().toISOString();
}
