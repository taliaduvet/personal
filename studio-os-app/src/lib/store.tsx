"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SubTask, Task, WaitingOn, Recipe, RecipeMilestone } from "./types";
import { TASKS } from "./sample-data";
import { isInboxTask } from "./lenses";
import { normalizeDoPlan } from "./do-plan";
import { completionIsoNow } from "./completed-at";
import { useProjects } from "./projects-store";
import {
  createTaskId,
  queueSheetTaskDelete,
  queueSheetTaskUpsert,
  patchTouchesSheet,
  patchTouchesAppData,
} from "./sheet/push-registry";
import { queueAppDataTaskUpsert, notifyAppDataReviews, notifyAppDataActivityLog, notifyAppDataTask, notifyAppDataLogbookLines, notifyAppDataRecipes } from "./sheet/app-data-notify";
import { applyRecipeMilestones, shiftRecipeTasks } from "./recipes";
import {
  appendActivityLogEntry,
  mergeActivityLogs,
  newActivityLogId,
  type ActivityLogEntry,
} from "./activity-log";
import { getCompletionContext } from "./completion-context";
import { resolveCompletionAttribution } from "./completion-attribution";
import { endSessionForTaskFromBridge } from "./session-bridge";

const STORAGE_KEY = "studio-os.tasks.v7";
const REVIEW_KEY = "studio-os.reviews.v1";
const ACTIVITY_LOG_KEY = "studio-os.activityLog.v1";
const LOGBOOK_KEY = "studio-os.logbook.v1";
const RECIPES_KEY = "studio-os.recipes.v1";

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
    if (t.status === "done") {
      next.completedAtInDays = null;
      next.completedAtIso = null;
    }
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
  /** Replace review notes from a Sheet pull. */
  applyReviewNotesFromSheet: (incoming: Record<string, WeekReviewNotes>) => void;
  /** Append-only studio memory log. */
  activityLog: ActivityLogEntry[];
  appendActivityLog: (entry: ActivityLogEntry) => void;
  applyActivityLogFromSheet: (incoming: ActivityLogEntry[]) => void;
  /** After a sheet append assigns a stable UUID to a new task. */
  replaceTaskId: (oldId: string, newId: string, task: Task) => void;
  setTaskWaiting: (id: string, person: { personId: string | null; personName: string }) => void;
  clearTaskWaiting: (id: string) => void;
  logbookLines: Record<string, string>;
  saveLogbookLine: (dateKey: string, line: string) => void;
  applyLogbookLinesFromSheet: (incoming: Record<string, string>) => void;
  applyRecipesFromSheet: (incoming: Recipe[]) => void;
  recipes: Recipe[];
  saveRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  applyRecipe: (recipeId: string) => void;
  updateRecipeAnchor: (recipeId: string, anchorDate: string) => void;
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
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [logbookLines, setLogbookLines] = useState<Record<string, string>>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);

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
      const logRaw = localStorage.getItem(ACTIVITY_LOG_KEY);
      if (logRaw) {
        setActivityLog(JSON.parse(logRaw) as ActivityLogEntry[]);
      }
      const logbookRaw = localStorage.getItem(LOGBOOK_KEY);
      if (logbookRaw) {
        setLogbookLines(JSON.parse(logbookRaw) as Record<string, string>);
      }
      const recipesRaw = localStorage.getItem(RECIPES_KEY);
      if (recipesRaw) {
        setRecipes(JSON.parse(recipesRaw) as Recipe[]);
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
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(activityLog));
      localStorage.setItem(LOGBOOK_KEY, JSON.stringify(logbookLines));
      localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
    } catch {
      /* ignore */
    }
  }, [tasks, reviewNotes, activityLog, logbookLines, recipes, hydrated]);

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

  const appendActivityLog = useCallback((entry: ActivityLogEntry) => {
    setActivityLog((prev) => {
      const next = appendActivityLogEntry(prev, entry);
      queueMicrotask(() => notifyAppDataActivityLog(next));
      return next;
    });
  }, []);

  const completeTask = useCallback((id: string) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;

    const ctx = getCompletionContext();
    const shapeBlock = ctx.shapeBlockForTask(id);
    const attribution = resolveCompletionAttribution(id, current, {
      activeSessionTaskId: ctx.activeSession?.taskId ?? null,
      activeSessionStartLogId: ctx.activeSession?.startLogId ?? null,
      shapeBlock,
    });

    endSessionForTaskFromBridge(id, { forCompletion: true });

    const completedAtIso = completionIsoNow();

    const next: Task = {
      ...current,
      status: "done",
      completedAtInDays: 0,
      completedAtIso,
      inToday: false,
    };
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    queueSheetTaskUpsert(next);
    queueAppDataTaskUpsert(next);

    appendActivityLog({
      id: newActivityLogId(),
      atIso: completedAtIso,
      kind: "task_complete",
      taskId: id,
      completedAtIso,
      attribution: attribution.attribution,
      sessionId: attribution.sessionId,
      shapeBlock: attribution.shapeBlock,
    });
  }, [appendActivityLog]);

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
    const next: Task = { ...current, inToday: true };
    if (current.waitingOn) next.waitingOn = null;
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    queueAppDataTaskUpsert(next);
  }, []);

  const setTaskWaiting = useCallback((id: string, person: { personId: string | null; personName: string }) => {
    const name = person.personName.trim();
    if (!name) return;
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const waitingOn: WaitingOn = {
      personId: person.personId,
      personName: name,
      sinceIso: new Date().toISOString(),
    };
    const next: Task = {
      ...current,
      inToday: false,
      personId: person.personId ?? current.personId ?? null,
      personName: name,
      waitingOn,
    };
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    notifyAppDataTask(next);
    queueAppDataTaskUpsert(next);
  }, []);

  const clearTaskWaiting = useCallback((id: string) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const next: Task = { ...current, waitingOn: null };
    setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
    notifyAppDataTask(next);
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
    const sub = current.subtasks.find((s) => s.id === subtaskId);
    const nextDone = sub ? !sub.done : false;
    const next = {
      ...current,
      subtasks: current.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s
      ),
    };
    setTasks((ts) => ts.map((t) => (t.id === taskId ? next : t)));
    queueAppDataTaskUpsert(next);
    appendActivityLog({
      id: newActivityLogId(),
      atIso: new Date().toISOString(),
      kind: "subtask_toggle",
      taskId,
      subtaskId,
      done: nextDone,
    });
  }, [appendActivityLog]);

  const saveReviewNotes = useCallback((key: string, patch: Partial<WeekReviewNotes>) => {
    setReviewNotes((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] ?? { reflection: "", intentions: "" }),
          ...patch,
        },
      };
      queueMicrotask(() => notifyAppDataReviews(next));
      return next;
    });
  }, []);

  const applyReviewNotesFromSheet = useCallback((incoming: Record<string, WeekReviewNotes>) => {
    if (Object.keys(incoming).length === 0) return;
    setReviewNotes(incoming);
  }, []);

  const applyActivityLogFromSheet = useCallback((incoming: ActivityLogEntry[]) => {
    if (incoming.length === 0) return;
    setActivityLog((prev) => mergeActivityLogs(prev, incoming));
  }, []);

  const saveLogbookLine = useCallback((dateKey: string, line: string) => {
    setLogbookLines((prev) => {
      const clean = line.trim();
      const next = { ...prev };
      if (!clean) delete next[dateKey];
      else next[dateKey] = clean;
      queueMicrotask(() => notifyAppDataLogbookLines(next));
      return next;
    });
  }, []);

  const applyLogbookLinesFromSheet = useCallback((incoming: Record<string, string>) => {
    if (Object.keys(incoming).length === 0) return;
    setLogbookLines(incoming);
  }, []);

  const applyRecipesFromSheet = useCallback((incoming: Recipe[]) => {
    if (incoming.length === 0) return;
    setRecipes(incoming);
  }, []);

  const saveRecipe = useCallback((recipe: Recipe) => {
    setRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      const next = idx >= 0 ? prev.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...prev];
      queueMicrotask(() => notifyAppDataRecipes(next));
      return next;
    });
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      queueMicrotask(() => notifyAppDataRecipes(next));
      return next;
    });
  }, []);

  const applyRecipe = useCallback(
    (recipeId: string) => {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;
      setTasks((ts) => {
        const { nextTasks, created } = applyRecipeMilestones(recipe, ts, (milestone: RecipeMilestone) =>
          normalizeTask({
            id: newId("t"),
            title: milestone.title,
            lifeAreaId: recipe.lifeAreaId,
            projectId: recipe.projectId,
            workModeId: milestone.workModeId ?? null,
            status: "todo",
            recipeId: recipe.id,
            milestoneId: milestone.id,
          })
        );
        for (const t of created) {
          queueAppDataTaskUpsert(t);
          queueSheetTaskUpsert(t);
        }
        for (const t of nextTasks) {
          if (t.recipeId === recipe.id) queueAppDataTaskUpsert(t);
        }
        return nextTasks;
      });
    },
    [recipes]
  );

  const updateRecipeAnchor = useCallback(
    (recipeId: string, anchorDate: string) => {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;
      const updated = { ...recipe, anchorDate };
      setRecipes((prev) => {
        const next = prev.map((r) => (r.id === recipeId ? updated : r));
        queueMicrotask(() => notifyAppDataRecipes(next));
        return next;
      });
      setTasks((ts) => {
        const next = shiftRecipeTasks(updated, ts);
        for (const t of next) {
          if (t.recipeId === recipeId) queueAppDataTaskUpsert(t);
        }
        return next;
      });
    },
    [recipes]
  );

  const replaceTasksFromSheet = useCallback((incoming: Task[]) => {
    setTasks((current) => {
      const localById = new Map(current.map((t) => [t.id, t]));
      return incoming.map((row) => {
        const next = normalizeTask(row);
        const local = localById.get(row.id);
        if (local?.waitingOn && !next.waitingOn) {
          next.waitingOn = local.waitingOn;
          next.inToday = false;
        }
        if (local?.recipeId && !next.recipeId) next.recipeId = local.recipeId;
        if (local?.milestoneId && !next.milestoneId) next.milestoneId = local.milestoneId;
        return next;
      });
    });
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
        applyReviewNotesFromSheet,
        activityLog,
        appendActivityLog,
        applyActivityLogFromSheet,
        replaceTasksFromSheet,
        replaceTaskId,
        setTaskWaiting,
        clearTaskWaiting,
        logbookLines,
        saveLogbookLine,
        applyLogbookLinesFromSheet,
        recipes,
        saveRecipe,
        deleteRecipe,
        applyRecipe,
        updateRecipeAnchor,
        applyRecipesFromSheet,
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
