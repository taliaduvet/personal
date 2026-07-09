import type { Task, Project } from "@/lib/types";
import type { Contact, AppDataStore } from "./app-data";
import { projectToLinksOverlay, taskToOverlay } from "./app-data";
import type { WeekPlanningRecord } from "@/lib/settings-store";

type AppDataHandlers = {
  patch: (fn: (store: AppDataStore) => void) => void;
};

let handlers: AppDataHandlers | null = null;

export function registerAppDataPush(next: AppDataHandlers | null) {
  handlers = next;
}

export function notifyAppDataTask(task: Task) {
  handlers?.patch((store) => {
    store.tasks.set(task.id, taskToOverlay(task));
  });
}

export function notifyAppDataProject(project: Project) {
  handlers?.patch((store) => {
    store.projects.set(project.id, projectToLinksOverlay(project));
  });
}

export function notifyAppDataLifeAreas(lifeAreas: import("@/lib/types").LifeArea[]) {
  handlers?.patch((store) => {
    store.lifeAreas = lifeAreas;
  });
}

export function notifyAppDataContacts(contacts: Contact[]) {
  handlers?.patch((store) => {
    store.contacts = contacts;
  });
}

export function notifyAppDataWeekPlanning(weekPlanning: Record<string, WeekPlanningRecord>) {
  handlers?.patch((store) => {
    store.weekPlanning = new Map(Object.entries(weekPlanning));
  });
}

export function notifyAppDataReviews(reviews: Record<string, { reflection: string; intentions: string }>) {
  handlers?.patch((store) => {
    store.reviews = reviews;
  });
}

export function notifyAppDataActivityLog(activityLog: import("@/lib/activity-log").ActivityLogEntry[]) {
  handlers?.patch((store) => {
    store.activityLog = activityLog;
  });
}

export function notifyAppDataLogbookLines(logbookLines: Record<string, string>) {
  handlers?.patch((store) => {
    store.logbookLines = logbookLines;
  });
}

export function notifyAppDataRecipes(recipes: import("@/lib/types").Recipe[]) {
  handlers?.patch((store) => {
    store.recipes = recipes;
  });
}

export function queueAppDataTaskUpsert(task: Task) {
  if (!task.title.trim()) return;
  queueMicrotask(() => notifyAppDataTask(task));
}
