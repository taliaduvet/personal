export type ActiveSession = {
  taskId: string;
  projectId: string | null;
  startedAtIso: string;
  startLogId: string;
};

export const ACTIVE_SESSION_KEY = "studio-os.activeSession.v1";

export function sessionElapsedMs(session: ActiveSession, nowMs = Date.now()): number {
  const start = new Date(session.startedAtIso).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, nowMs - start);
}

export function formatSessionElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "<1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed?.taskId || !parsed.startedAtIso || !parsed.startLogId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}
