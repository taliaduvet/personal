"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekKey } from "@/lib/week";
import { dateKeyFromOffset } from "@/lib/week-focus";
import { shapeBlockForTask } from "@/lib/day-shape";
import { registerCompletionContext } from "@/lib/completion-context";
import { registerSessionBridge } from "@/lib/session-bridge";
import { newActivityLogId } from "@/lib/activity-log";
import { playBeep as playAudioCue } from "@/lib/audio-cue";
import {
  ambientNudgeDue,
  clampWarnBeforeMs,
  msUntilNextAmbientEvent,
  msUntilNextTimedEvent,
  timedNudgeDue,
} from "@/lib/session-nudge";
import {
  formatSessionElapsed,
  loadActiveSession,
  saveActiveSession,
  sessionElapsedMs,
  type ActiveSession,
} from "@/lib/sessions";

export type SessionNudgeKind = "warning" | "times-up" | "ambient-checkin";

type SessionsContextValue = {
  activeSession: ActiveSession | null;
  activeTaskTitle: string | null;
  startSession: (
    taskId: string,
    projectId: string | null,
    options?: { targetDurationMs?: number; warnBeforeMs?: number }
  ) => void;
  requestEndSession: () => void;
  confirmEndSession: (reentryNote: string) => void;
  endSessionOpen: boolean;
  closeEndSession: () => void;
  elapsedMs: number;
  elapsedLabel: string;
  isTaskInSession: (taskId: string) => boolean;
  /** Which nudge (if any) is currently being shown by SessionNudgeBanner. */
  activeNudge: SessionNudgeKind | null;
  /** Hide the current nudge without acknowledging it — a timed one won't reappear (one-shot); an ambient one will, at the next repeat interval. */
  dismissNudge: () => void;
  /** Stops the ambient nudge from resurfacing for the rest of this session. */
  acknowledgeAmbientNudge: () => void;
};

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { tasks, updateTask, appendActivityLog } = useTasks();
  const {
    weekStartsOn,
    weekPlanning,
    defaultSessionWarnBeforeMs,
    ambientHyperfocusThresholdMs,
    ambientHyperfocusRepeatMs,
  } = useSettings();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [activeNudge, setActiveNudge] = useState<SessionNudgeKind | null>(null);

  const nudgeTimeoutRef = useRef<number | null>(null);
  const nudgeAudioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setActiveSession(loadActiveSession());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveActiveSession(activeSession);
  }, [activeSession, hydrated]);

  useEffect(() => {
    if (!activeSession) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [activeSession]);

  // A genuinely new session (different task or restart) clears any leftover banner.
  // Deliberately NOT keyed on the latch fields below — those change *because* a
  // nudge just fired, and clearing here would wipe the banner we just showed.
  useEffect(() => {
    setActiveNudge(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.taskId, activeSession?.startedAtIso]);

  // Arms (and re-arms) a single precise setTimeout for the next unfired
  // timed or ambient nudge — decoupled from the 60s display tick above.
  useEffect(() => {
    if (nudgeTimeoutRef.current !== null) {
      window.clearTimeout(nudgeTimeoutRef.current);
      nudgeTimeoutRef.current = null;
    }
    if (!activeSession) return;

    const session = activeSession;
    const now = Date.now();
    const delay = msUntilNextTimedEvent(session, now) ?? msUntilNextAmbientEvent(session, now);
    if (delay === null) return;

    nudgeTimeoutRef.current = window.setTimeout(() => {
      const nowMs = Date.now();
      const timedKind = timedNudgeDue(session, nowMs);
      if (timedKind) {
        playAudioCue(() => (nudgeAudioCtxRef.current ??= new AudioContext()), timedKind === "times-up" ? "end" : "phase");
        setActiveNudge(timedKind);
        setActiveSession({
          ...session,
          ...(timedKind === "warning"
            ? { warningFiredAtIso: new Date(nowMs).toISOString() }
            : { timesUpFiredAtIso: new Date(nowMs).toISOString() }),
        });
        return;
      }
      if (ambientNudgeDue(session, nowMs)) {
        playAudioCue(() => (nudgeAudioCtxRef.current ??= new AudioContext()), "phase");
        setActiveNudge("ambient-checkin");
        setActiveSession({ ...session, ambientLastFiredAtIso: new Date(nowMs).toISOString() });
      }
    }, delay);

    return () => {
      if (nudgeTimeoutRef.current !== null) {
        window.clearTimeout(nudgeTimeoutRef.current);
        nudgeTimeoutRef.current = null;
      }
    };
  }, [
    activeSession?.taskId,
    activeSession?.startedAtIso,
    activeSession?.targetDurationMs,
    activeSession?.warnBeforeMs,
    activeSession?.warningFiredAtIso,
    activeSession?.timesUpFiredAtIso,
    activeSession?.ambientThresholdMs,
    activeSession?.ambientRepeatMs,
    activeSession?.ambientLastFiredAtIso,
    activeSession?.ambientAcknowledgedAtIso,
  ]);

  const dismissNudge = useCallback(() => setActiveNudge(null), []);

  const acknowledgeAmbientNudge = useCallback(() => {
    setActiveSession((current) => (current ? { ...current, ambientAcknowledgedAtIso: new Date().toISOString() } : current));
    setActiveNudge(null);
  }, []);

  const todayShapeBlockTasks = useMemo(() => {
    const key = weekKey(weekStartsOn, 0);
    const todayKey = dateKeyFromOffset(0);
    return weekPlanning[key]?.days[todayKey]?.shapeBlockTasks;
  }, [weekPlanning, weekStartsOn]);

  const finishSession = useCallback(
    (session: ActiveSession, reentryNote?: string, options?: { skipStatusUpdate?: boolean }) => {
      const endedAtIso = new Date().toISOString();
      const durationMs = sessionElapsedMs(session);
      appendActivityLog({
        id: newActivityLogId(),
        atIso: endedAtIso,
        kind: "session_end",
        taskId: session.taskId,
        projectId: session.projectId,
        startedAtIso: session.startedAtIso,
        durationMs,
        reentryNote: reentryNote?.trim() || undefined,
      });
      if (options?.skipStatusUpdate) return;
      const note = reentryNote?.trim();
      if (note) {
        updateTask(session.taskId, { lastReentryNote: note, status: "in_progress" });
      } else {
        updateTask(session.taskId, { status: "in_progress" });
      }
    },
    [appendActivityLog, updateTask]
  );

  const endSessionForTask = useCallback(
    (taskId: string, options?: { forCompletion?: boolean }) => {
      setActiveSession((current) => {
        if (!current || current.taskId !== taskId) return current;
        finishSession(current, undefined, { skipStatusUpdate: options?.forCompletion });
        return null;
      });
      setEndSessionOpen(false);
    },
    [finishSession]
  );

  const startSession = useCallback(
    (
      taskId: string,
      projectId: string | null,
      options?: { targetDurationMs?: number; warnBeforeMs?: number }
    ) => {
      setActiveSession((current) => {
        if (current?.taskId === taskId) return current;
        if (current) finishSession(current);
        const startedAtIso = new Date().toISOString();
        const startLogId = newActivityLogId();
        appendActivityLog({
          id: startLogId,
          atIso: startedAtIso,
          kind: "session_start",
          taskId,
          projectId,
        });
        updateTask(taskId, { status: "in_progress" });

        const next: ActiveSession = { taskId, projectId, startedAtIso, startLogId };
        if (options?.targetDurationMs) {
          next.targetDurationMs = options.targetDurationMs;
          next.warnBeforeMs = clampWarnBeforeMs(
            options.targetDurationMs,
            options.warnBeforeMs ?? defaultSessionWarnBeforeMs
          );
        } else {
          next.ambientThresholdMs = ambientHyperfocusThresholdMs;
          next.ambientRepeatMs = ambientHyperfocusRepeatMs;
        }
        return next;
      });
      setEndSessionOpen(false);
    },
    [
      appendActivityLog,
      finishSession,
      updateTask,
      defaultSessionWarnBeforeMs,
      ambientHyperfocusThresholdMs,
      ambientHyperfocusRepeatMs,
    ]
  );

  const requestEndSession = useCallback(() => {
    if (!activeSession) return;
    setEndSessionOpen(true);
  }, [activeSession]);

  const confirmEndSession = useCallback(
    (reentryNote: string) => {
      if (!activeSession) return;
      finishSession(activeSession, reentryNote);
      setActiveSession(null);
      setEndSessionOpen(false);
    },
    [activeSession, finishSession]
  );

  const closeEndSession = useCallback(() => {
    setEndSessionOpen(false);
  }, []);

  const activeTaskTitle = useMemo(() => {
    if (!activeSession) return null;
    return tasks.find((t) => t.id === activeSession.taskId)?.title ?? "In session";
  }, [activeSession, tasks]);

  const elapsedMs = useMemo(() => {
    void tick;
    return activeSession ? sessionElapsedMs(activeSession) : 0;
  }, [activeSession, tick]);
  const elapsedLabel = formatSessionElapsed(elapsedMs);

  useEffect(() => {
    registerSessionBridge({
      getActiveSession: () => activeSession,
      endSessionForTask,
    });
    return () => registerSessionBridge(null);
  }, [activeSession, endSessionForTask]);

  useEffect(() => {
    registerCompletionContext(() => ({
      activeSession,
      shapeBlockForTask: (taskId) => shapeBlockForTask(taskId, todayShapeBlockTasks),
    }));
    return () => registerCompletionContext(null);
  }, [activeSession, todayShapeBlockTasks]);

  const value: SessionsContextValue = {
    activeSession,
    activeTaskTitle,
    startSession,
    requestEndSession,
    confirmEndSession,
    endSessionOpen,
    closeEndSession,
    elapsedMs,
    elapsedLabel,
    isTaskInSession: (taskId) => activeSession?.taskId === taskId,
    activeNudge,
    dismissNudge,
    acknowledgeAmbientNudge,
  };

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions must be used within SessionsProvider");
  return ctx;
}
