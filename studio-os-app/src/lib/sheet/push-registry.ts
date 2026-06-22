import type { Task } from "@/lib/types";

type PushHandlers = {
  upsert: (task: Task) => void;
  delete: (taskId: string) => void;
  replaceId: (oldId: string, newId: string, task: Task) => void;
};

let handlers: PushHandlers | null = null;
let pushEnabled = false;

export function registerSheetPush(next: PushHandlers | null) {
  handlers = next;
  pushEnabled = next !== null;
}

export function isSheetPushActive(): boolean {
  return pushEnabled;
}

export function notifySheetTaskUpsert(task: Task) {
  handlers?.upsert(task);
}

export function notifySheetTaskDelete(taskId: string) {
  handlers?.delete(taskId);
}

/** Defer sheet push until after the current React render/commit. */
export function queueSheetTaskUpsert(task: Task) {
  if (!shouldPushTask(task)) return;
  queueMicrotask(() => notifySheetTaskUpsert(task));
}

export function queueSheetTaskDelete(taskId: string) {
  queueMicrotask(() => notifySheetTaskDelete(taskId));
}

export function notifySheetTaskIdReplaced(oldId: string, newId: string, task: Task) {
  handlers?.replaceId(oldId, newId, task);
}

export function shouldPushTask(task: Task): boolean {
  return task.title.trim().length > 0;
}

export function createTaskId(): string {
  if (pushEnabled && typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function patchTouchesSheet(patch: Partial<Task>): boolean {
  const keys = Object.keys(patch);
  if (keys.length === 0) return false;
  return !keys.every((k) => k === "subtasks" || k === "inToday" || k === "personId" || k === "personName");
}

export function patchTouchesAppData(patch: Partial<Task>): boolean {
  const keys = Object.keys(patch);
  return keys.some((k) => k === "inToday" || k === "subtasks" || k === "personId" || k === "personName");
}
