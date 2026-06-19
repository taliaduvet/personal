"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Task } from "./types";
import { TASKS } from "./sample-data";

/**
 * One shared task list for the whole app. Captures in the Inbox flow straight
 * into the Lot, Today, search, and the Dashboard — and persist across reloads
 * so a written-down thought is genuinely "safe".
 *
 * Bump the version suffix whenever the sample seed changes so stale local data
 * doesn't mask new demo content during the build phase.
 */
const STORAGE_KEY = "studio-os.tasks.v1";

type TasksContextValue = {
  tasks: Task[];
  /** Quick capture: a loose, unsorted thought with no area/project/date yet. */
  addTask: (title: string) => void;
  completeTask: (id: string) => void;
  sendToToday: (id: string) => void;
  removeFromToday: (id: string) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  // Seed with sample data for both SSR and the first client render (keeps
  // hydration stable); swap in any saved list right after mount.
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Task[];
        if (Array.isArray(parsed) && parsed.length > 0) setTasks(parsed);
      }
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* ignore quota/unavailable storage */
    }
  }, [tasks, hydrated]);

  const addTask = useCallback((title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setTasks((ts) => [
      {
        id: `t-${Date.now()}`,
        title: clean,
        lifeAreaId: "", // unsorted until triaged
        projectId: null,
        workModeId: null,
        doDateInDays: null,
        deadlineInDays: null,
        status: "todo",
        inToday: false,
      },
      ...ts,
    ]);
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: "done" } : t)));
  }, []);

  const sendToToday = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, inToday: true } : t)));
  }, []);

  const removeFromToday = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, inToday: false } : t)));
  }, []);

  return (
    <TasksContext.Provider value={{ tasks, addTask, completeTask, sendToToday, removeFromToday }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
}
