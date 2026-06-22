"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { SubTask, Task } from "./types";
import { TASKS, PROJECTS } from "./sample-data";
import { parseTaskTitle } from "./parse";

const STORAGE_KEY = "studio-os.tasks.v4";

function normalizeTask(t: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "",
    projectId: null,
    workModeId: null,
    doDateInDays: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    ...t,
    notes: t.notes ?? "",
    subtasks: t.subtasks ?? [],
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type TasksContextValue = {
  tasks: Task[];
  /** Capture with smart parse; opens Quick Edit for chip confirmation. Returns new id. */
  addTask: (title: string) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  sendToToday: (id: string) => void;
  removeFromToday: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  /** Quick Edit bottom sheet (fast filing). */
  quickEditId: string | null;
  openQuickEdit: (id: string) => void;
  closeQuickEdit: () => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => TASKS.map(normalizeTask));
  const [hydrated, setHydrated] = useState(false);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Task[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed.map(normalizeTask));
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks, hydrated]);

  const addTask = useCallback((title: string) => {
    const parsed = parseTaskTitle(title);
    const id = newId("t");
    const task = normalizeTask({
      id,
      title: parsed.title,
      lifeAreaId: parsed.lifeAreaId,
      projectId: parsed.projectId,
      workModeId: parsed.workModeId,
      doDateInDays: parsed.doDateInDays,
      deadlineInDays: parsed.deadlineInDays,
      status: "todo",
      inToday: false,
      notes: "",
      subtasks: [],
    });
    setTasks((ts) => [task, ...ts]);
    setQuickEditId(id);
    return id;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        // Project always sets life area
        if (patch.projectId !== undefined && patch.projectId !== null) {
          const p = PROJECTS.find((x) => x.id === patch.projectId);
          if (p) next.lifeAreaId = p.lifeAreaId;
        }
        return next;
      })
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    setQuickEditId((cur) => (cur === id ? null : cur));
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: "done" } : t)));
  }, []);

  const openQuickEdit = useCallback((id: string) => setQuickEditId(id), []);
  const closeQuickEdit = useCallback(() => setQuickEditId(null), []);

  const sendToToday = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, inToday: true } : t)));
  }, []);

  const removeFromToday = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, inToday: false } : t)));
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    const sub: SubTask = { id: newId("s"), title: clean, done: false };
    setTasks((ts) =>
      ts.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t))
    );
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, done: !s.done } : s
              ),
            }
          : t
      )
    );
  }, []);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        sendToToday,
        removeFromToday,
        addSubtask,
        toggleSubtask,
        quickEditId,
        openQuickEdit,
        closeQuickEdit,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
}
