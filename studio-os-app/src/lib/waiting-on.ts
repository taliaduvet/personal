import type { Task } from "./types";

export function isWaitingTask(task: Task): boolean {
  return Boolean(task.waitingOn?.personName?.trim());
}

export function quietDaysSince(task: Task, now = new Date()): number {
  const sinceIso = task.waitingOn?.sinceIso;
  if (!sinceIso) return 0;
  const since = new Date(sinceIso);
  since.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - since.getTime()) / 86_400_000));
}

export function quietLabel(days: number): string {
  if (days <= 0) return "quiet today";
  if (days === 1) return "quiet 1 day";
  return `quiet ${days} days`;
}

export function needsNudge(task: Task, now = new Date()): boolean {
  return isWaitingTask(task) && quietDaysSince(task, now) >= 7;
}

export function nudgeCopyText(task: Task): string {
  const name = task.waitingOn?.personName?.trim() || "there";
  return `Hey ${name} — just checking in on "${task.title}". No rush, but let me know when you have a moment.`;
}

export function waitingTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== "done" && isWaitingTask(t))
    .sort((a, b) => quietDaysSince(b) - quietDaysSince(a));
}

export function waitingCount(tasks: Task[]): number {
  return waitingTasks(tasks).length;
}
