"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SubTask, Task } from "./types";
import { TASKS } from "./sample-data";
import { isInboxTask } from "./lenses";
import { normalizeDoPlan } from "./do-plan";
import { useProjects } from "./projects-store";
import {
  createTaskId,
  queueSheetTaskDelete,
  queueSheetTaskUpsert,
  patchTouchesSheet,
  patchTouchesAppData,
} from "./sheet/push-registry";
import { queueAppDataTaskUpsert } from "./sheet/app-data-notify";

const STORAGE_KEY = "studio-os.tasks.v7";
const REVIEW_KEY = "studio-os.reviews.v1";

export type WeekReviewNotes = { reflection: string; intentions: string };

function normalizeTask(
  t: Partial<Task> & Pick<Task, "id" | "title"> & { doDateInDays?: number | null; parkedAt?: number }
): Task {
  const { doDateInDays, doPlan: rawPlan, parkedAt, ...rest } = t;
  return {
    lifeAreaId: "",
    projectId: null,
    workModeId: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    ...rest,
    doPlan: normalizeDoPlan(rawPlan, doDateInDays),
    parkedAt: parkedAt ?? Date.now(),
    notes: t.notes ?? "",
    subtasks: t.subtasks ?? [],
    completedAtInDays: t.completedAtInDays ?? (t.status === "done" ? 0 : null),
  };
}

function newId(prefix: string): string {
  if (prefix === "t") return createTaskId();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function applyTaskPatch(
  t: Task,
  patch: Partial<Task>,
  projects: { id: string; lifeAreaId: string }[]
): Task {
  const next = normalizeTask({ ...t, ...patch });
  if (patch.status === "done") {
    next.completedAtInDays = next.completedAtInDays ?? 0;
  }
  if (patch.status === "todo" || patch.status === "in_progress") {
    if (t.status === "done") next.completedAtInDays = null;
  }
  if (patch.projectId !== undefined && patch.projectId !== null) {
    const p = projects.find((x) => x.id === patch.projectId);
    if (p) next.lifeAreaId = p.lifeAreaId;
  }
  return next;
}

type TasksContextValue = {
  tasks: Task[];
  /** Capture with smart parse; opens Quick Edit for chip confirmation. Returns new id. */
  addTask: (title: string) => string;
  /** Blank task — opens Quick Edit in place; lands in Inbox until classified. */
  createBlankTask: () => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  sendToToday: (id: string) => void;
  removeFromToday: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  /** Quick Edit bottom sheet (fast filing). */
  quickEditId: string | null;
  /** True while capturing a new task — live parse, Enter to confirm. */
  quickEditCapture: boolean;
  /** Raw capture text when the sheet opens (New button or Inbox add). */
  captureDraft: string | null;
  openQuickEdit: (id: string) => void;
  closeQuickEdit: () => void;
  /** Weekly review notes keyed by week start date (YYYY-MM-DD). */
  reviewNotes: Record<string, WeekReviewNotes>;
  saveReviewNotes: (weekKey: string, patch: Partial<WeekReviewNotes>) => void;
  /** Replace tasks from a Sheet pull — preserves app-local inToday + subtasks. */
  replaceTasksFromSheet: (incoming: Task[]) => void;
  /** After a sheet append assigns a stable UUID to a new task. */
  replaceTaskId: (oldId: string, newId: string, task: Task) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { projects } = useProjects();
  const [tasks, setTasks] = useState<Task[]>(() => TASKS.map(normalizeTask));
  const [hydrated, setHydrated] = useState(false);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditCapture, setQuickEditCapture] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<string | null>(null);
  const quickEditIdRef = useRef<string | null>(null);
  quickEditIdRef.current = quickEditId;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const [reviewNotes, setReviewNotes] = useState<Record<string, WeekReviewNotes>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Task[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed.map(normalizeTask));
        }
      }
      const reviews = localStorage.getItem(REVIEW_KEY);
      if (reviews) {
        setReviewNotes(JSON.parse(reviews) as Record<string, WeekReviewNotes>);
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
      localStorage.setItem(REVIEW_KEY, JSON.stringify(reviewNotes));
    } catch {
      /* ignore */
    }
  }, [tasks, reviewNotes, hydrated]);

  const addTask = useCallback((title: string) => {
    const raw = title.trim();
    if (!raw) return "";
    const id = newId("t");
    const task = normalizeTask({
      id,
      title: "",
      status: "todo",
      inToday: false,
      notes: "",
      subtasks: [],
    });
    setTasks((ts) => [task, ...ts]);
    setCaptureDraft(raw);
    setQuickEditCapture(true);
    setQuickEditId(id);
    return id;
  }, []);

  const createBlankTask = useCallback(() => {
    const id = newId("t");
    const task = normalizeTask({
      id,
      title: "",
      status: "todo",
      inToday: false,
      notes: "",
      subtasks: [],
    });
    setTasks((ts) => [task, ...ts]);
    setCaptureDraft("");
    setQuickEditCapture(true);
    setQuickEditId(id);
    return id;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const next = applyTaskPatch(current, patch, projects);
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    if (patchTouchesSheet(patch)) queueSheetTaskUpsert(next);
    if (patchTouchesAppData(patch)) queueAppDataTaskUpsert(next);
  }, [projects]);

  const deleteTask = useCallback((id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    queueSheetTaskDelete(id);
    setQuickEditId((cur) => (cur === id ? null : cur));
    setQuickEditCapture(false);
    setCaptureDraft(null);
  }, []);

  const completeTask = useCallback((id: string) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const next: Task = { ...current, status: "done", completedAtInDays: 0, inToday: false };
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    queueSheetTaskUpsert(next);
    queueAppDataTaskUpsert(next);
  }, []);

  const openQuickEdit = useCallback((id: string) => {
    setQuickEditCapture(false);
    setCaptureDraft(null);
    setQuickEditId(id);
  }, []);
  const closeQuickEdit = useCallback(() => {
    const id = quickEditIdRef.current;
    setQuickEditId(null);
    setQuickEditCapture(false);
    setCaptureDraft(null);
    if (!id) return;
    setTasks((ts) => {
      const t = ts.find((x) => x.id === id);
      if (t && !t.title.trim() && isInboxTask(t)) {
        return ts.filter((x) => x.id !== id);
      }
      return ts;
    });
  }, []);

  const sendToToday = useCallback((id: string) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const next = { ...current, inToday: true };
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    queueAppDataTaskUpsert(next);
  }, []);

  const removeFromToday = useCallback((id: string) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const next = { ...current, inToday: false };
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    queueAppDataTaskUpsert(next);
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    const sub: SubTask = { id: newId("s"), title: clean, done: false };
    const current = tasksRef.current.find((t) => t.id === taskId);
    if (!current) return;
    const next = { ...current, subtasks: [...current.subtasks, sub] };
    setTasks((ts) => ts.map((t) => (t.id === taskId ? next : t)));
    queueAppDataTaskUpsert(next);
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const current = tasksRef.current.find((t) => t.id === taskId);
    if (!current) return;
    const next = {
      ...current,
      subtasks: current.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s
      ),
    };
    setTasks((ts) => ts.map((t) => (t.id === taskId ? next : t)));
    queueAppDataTaskUpsert(next);
  }, []);

  const saveReviewNotes = useCallback((key: string, patch: Partial<WeekReviewNotes>) => {
    setReviewNotes((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { reflection: "", intentions: "" }),
        ...patch,
      },
    }));
  }, []);

  const replaceTasksFromSheet = useCallback((incoming: Task[]) => {
    setTasks(incoming.map(normalizeTask));
  }, []);

  const replaceTaskId = useCallback((oldId: string, newId: string, task: Task) => {
    setTasks((ts) =>
      ts.map((t) => (t.id === oldId ? normalizeTask({ ...task, id: newId }) : t))
    );
    setQuickEditId((cur) => (cur === oldId ? newId : cur));
  }, []);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        createBlankTask,
        updateTask,
        deleteTask,
        completeTask,
        sendToToday,
        removeFromToday,
        addSubtask,
        toggleSubtask,
        quickEditId,
        quickEditCapture,
        captureDraft,
        openQuickEdit,
        closeQuickEdit,
        reviewNotes,
        saveReviewNotes,
        replaceTasksFromSheet,
        replaceTaskId,
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
