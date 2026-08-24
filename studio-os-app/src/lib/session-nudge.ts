import type { ActiveSession } from "./sessions";

/**
 * Pure timing logic for the session transition-warning + ambient-hyperfocus
 * nudges. Kept free of React/timers so it's unit-testable; `sessions-store.tsx`
 * wires these into `setTimeout`s.
 *
 * Two independent paths, deliberately not conflated:
 *  - "timed" — only meaningful when `targetDurationMs` is set. Each of
 *    warning/times-up fires at most once (one-shot latches).
 *  - "ambient" — only meaningful when `targetDurationMs` is NOT set. Fires
 *    repeatedly at `ambientRepeatMs` cadence once `ambientThresholdMs`
 *    elapses, until `ambientAcknowledgedAtIso` is set.
 */

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Lead time can never exceed the target itself. */
export function clampWarnBeforeMs(targetDurationMs: number, warnBeforeMs: number): number {
  return Math.min(Math.max(0, warnBeforeMs), Math.max(0, targetDurationMs));
}

/** Which unfired timed event (if any) is due right now. */
export function timedNudgeDue(session: ActiveSession, nowMs: number): "warning" | "times-up" | null {
  const target = session.targetDurationMs;
  const startMs = toMs(session.startedAtIso);
  if (!target || target <= 0 || startMs === null) return null;

  const warnBeforeMs = clampWarnBeforeMs(target, session.warnBeforeMs ?? 0);
  const warnAt = startMs + target - warnBeforeMs;
  const zeroAt = startMs + target;

  if (!session.warningFiredAtIso && nowMs >= warnAt) return "warning";
  if (!session.timesUpFiredAtIso && nowMs >= zeroAt) return "times-up";
  return null;
}

/** ms until the next unfired timed event, clamped >= 0; null if nothing pending. */
export function msUntilNextTimedEvent(session: ActiveSession, nowMs: number): number | null {
  const target = session.targetDurationMs;
  const startMs = toMs(session.startedAtIso);
  if (!target || target <= 0 || startMs === null) return null;

  const warnBeforeMs = clampWarnBeforeMs(target, session.warnBeforeMs ?? 0);
  const warnAt = startMs + target - warnBeforeMs;
  const zeroAt = startMs + target;

  if (!session.warningFiredAtIso) return Math.max(0, warnAt - nowMs);
  if (!session.timesUpFiredAtIso) return Math.max(0, zeroAt - nowMs);
  return null;
}

/** True if the ambient (untimed-session) nudge should fire right now. */
export function ambientNudgeDue(session: ActiveSession, nowMs: number): boolean {
  if (session.targetDurationMs) return false;
  if (session.ambientAcknowledgedAtIso) return false;
  const threshold = session.ambientThresholdMs;
  const startMs = toMs(session.startedAtIso);
  if (!threshold || threshold <= 0 || startMs === null) return false;

  const lastFiredMs = toMs(session.ambientLastFiredAtIso);
  if (lastFiredMs === null) return nowMs >= startMs + threshold;

  const repeatMs = session.ambientRepeatMs && session.ambientRepeatMs > 0 ? session.ambientRepeatMs : threshold;
  return nowMs >= lastFiredMs + repeatMs;
}

/** ms until the next ambient fire, clamped >= 0; null if not applicable. */
export function msUntilNextAmbientEvent(session: ActiveSession, nowMs: number): number | null {
  if (session.targetDurationMs) return null;
  if (session.ambientAcknowledgedAtIso) return null;
  const threshold = session.ambientThresholdMs;
  const startMs = toMs(session.startedAtIso);
  if (!threshold || threshold <= 0 || startMs === null) return null;

  const lastFiredMs = toMs(session.ambientLastFiredAtIso);
  if (lastFiredMs === null) return Math.max(0, startMs + threshold - nowMs);

  const repeatMs = session.ambientRepeatMs && session.ambientRepeatMs > 0 ? session.ambientRepeatMs : threshold;
  return Math.max(0, lastFiredMs + repeatMs - nowMs);
}

export type SessionNudgeKind = "warning" | "times-up" | "ambient-checkin";

/** Human copy for a fired nudge — shared by the in-app banner and the OS notification, so they can't drift. */
export function nudgeMessage(kind: SessionNudgeKind, taskTitle: string): string {
  const t = taskTitle.trim() || "this";
  if (kind === "warning") return `5 min left on ${t} — start wrapping up?`;
  if (kind === "times-up") return `Time's up on ${t}.`;
  return `You've been sitting with ${t} a while — need a reset?`;
}
