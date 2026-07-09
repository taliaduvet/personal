"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import {
  formatSessionElapsed,
  loadActiveSession,
  saveActiveSession,
  sessionElapsedMs,
  type ActiveSession,
} from "@/lib/sessions";

type SessionsContextValue = {
  activeSession: ActiveSession | null;
  activeTaskTitle: string | null;
  startSession: (taskId: string, projectId: string | null) => void;
  requestEndSession: () => void;
  confirmEndSession: (reentryNote: string) => void;
  endSessionOpen: boolean;
  closeEndSession: () => void;
  elapsedMs: number;
  elapsedLabel: string;
  isTaskInSession: (taskId: string) => boolean;
};

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { tasks, updateTask, appendActivityLog } = useTasks();
  const { weekStartsOn, weekPlanning } = useSettings();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [tick, setTick] = useState(0);

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
    (taskId: string, projectId: string | null) => {
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
        return { taskId, projectId, startedAtIso, startLogId };
      });
      setEndSessionOpen(false);
    },
    [appendActivityLog, finishSession, updateTask]
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
  };

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions must be used within SessionsProvider");
  return ctx;
}
