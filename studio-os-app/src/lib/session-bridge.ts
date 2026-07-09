import type { ActiveSession } from "./sessions";

export type EndSessionOptions = {
  /** When ending because the task is being completed — do not touch task status. */
  forCompletion?: boolean;
};

export type SessionBridge = {
  getActiveSession: () => ActiveSession | null;
  endSessionForTask: (taskId: string, options?: EndSessionOptions) => void;
};

let bridge: SessionBridge | null = null;

export function registerSessionBridge(next: SessionBridge | null) {
  bridge = next;
}

export function getActiveSessionFromBridge(): ActiveSession | null {
  return bridge?.getActiveSession() ?? null;
}

export function endSessionForTaskFromBridge(taskId: string, options?: EndSessionOptions) {
  bridge?.endSessionForTask(taskId, options);
}
