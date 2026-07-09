import type { LifeArea, SubTask, Task } from "@/lib/types";
import type { DriveDocLink, DriveFolderLink, Project } from "@/lib/types";
import type { WeekPlanningRecord } from "@/lib/settings-store";

export const APP_DATA_TAB = "_AppData";

export type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export type TaskAppOverlay = {
  inToday?: boolean;
  subtasks?: SubTask[];
  personId?: string | null;
  personName?: string | null;
  completedAtIso?: string | null;
};

export type WeekReviewNotesBlob = { reflection: string; intentions: string };

export type ProjectLinksOverlay = {
  folder?: DriveFolderLink | null;
  docs?: DriveDocLink[];
  personIds?: string[];
};

export type AppDataStore = {
  tasks: Map<string, TaskAppOverlay>;
  projects: Map<string, ProjectLinksOverlay>;
  weekPlanning: Map<string, WeekPlanningRecord>;
  contacts: Contact[];
  lifeAreas: LifeArea[];
  reviews: Record<string, WeekReviewNotesBlob>;
};

export function emptyAppDataStore(): AppDataStore {
  return {
    tasks: new Map(),
    projects: new Map(),
    weekPlanning: new Map(),
    contacts: [],
    lifeAreas: [],
    reviews: {},
  };
}

const TASK_PREFIX = "task:";
const PROJECT_PREFIX = "project:";
const WEEK_PREFIX = "week:";
const CONTACTS_KEY = "contacts";
const LIFE_AREAS_KEY = "lifeAreas";
const REVIEWS_KEY = "reviews";

function cellStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function parseAppDataRows(rows: unknown[][]): AppDataStore {
  const store = emptyAppDataStore();

  for (let i = 1; i < rows.length; i++) {
    const key = cellStr(rows[i]?.[0]);
    const val = rows[i]?.[1];
    if (!key || key.toLowerCase() === "key") continue;

    if (key === CONTACTS_KEY) {
      try {
        store.contacts = JSON.parse(String(val)) as Contact[];
      } catch {
        /* ignore */
      }
      continue;
    }

    if (key === LIFE_AREAS_KEY) {
      try {
        store.lifeAreas = JSON.parse(String(val)) as LifeArea[];
      } catch {
        /* ignore */
      }
      continue;
    }

    if (key === REVIEWS_KEY) {
      try {
        store.reviews = JSON.parse(String(val)) as Record<string, WeekReviewNotesBlob>;
      } catch {
        /* ignore */
      }
      continue;
    }

    if (key.startsWith(TASK_PREFIX)) {
      try {
        store.tasks.set(key.slice(TASK_PREFIX.length), JSON.parse(String(val)) as TaskAppOverlay);
      } catch {
        /* ignore */
      }
      continue;
    }

    if (key.startsWith(PROJECT_PREFIX)) {
      try {
        store.projects.set(key.slice(PROJECT_PREFIX.length), JSON.parse(String(val)) as ProjectLinksOverlay);
      } catch {
        /* ignore */
      }
      continue;
    }

    if (key.startsWith(WEEK_PREFIX)) {
      try {
        store.weekPlanning.set(key.slice(WEEK_PREFIX.length), JSON.parse(String(val)) as WeekPlanningRecord);
      } catch {
        /* ignore */
      }
    }
  }

  return store;
}

export function appDataRowsFromStore(store: AppDataStore): (string | number)[][] {
  const rows: (string | number)[][] = [["Key", "Value"]];

  if (store.contacts.length > 0) {
    rows.push([CONTACTS_KEY, JSON.stringify(store.contacts)]);
  }

  if (store.lifeAreas.length > 0) {
    rows.push([LIFE_AREAS_KEY, JSON.stringify(store.lifeAreas)]);
  }

  if (Object.keys(store.reviews).length > 0) {
    rows.push([REVIEWS_KEY, JSON.stringify(store.reviews)]);
  }

  for (const [id, overlay] of store.tasks) {
    rows.push([`${TASK_PREFIX}${id}`, JSON.stringify(overlay)]);
  }
  for (const [id, links] of store.projects) {
    rows.push([`${PROJECT_PREFIX}${id}`, JSON.stringify(links)]);
  }
  for (const [weekKey, rec] of store.weekPlanning) {
    rows.push([`${WEEK_PREFIX}${weekKey}`, JSON.stringify(rec)]);
  }

  return rows;
}

export function mergeTaskOverlay(task: Task, overlay?: TaskAppOverlay): Task {
  if (!overlay) return task;
  return {
    ...task,
    inToday: overlay.inToday ?? task.inToday,
    subtasks: overlay.subtasks ?? task.subtasks,
    personId: overlay.personId ?? task.personId ?? null,
    personName: overlay.personName ?? task.personName ?? null,
    completedAtIso: overlay.completedAtIso ?? task.completedAtIso ?? null,
  };
}

export function taskToOverlay(task: Task): TaskAppOverlay {
  const overlay: TaskAppOverlay = {
    inToday: task.inToday,
    subtasks: task.subtasks,
    personId: task.personId ?? null,
    personName: task.personName ?? null,
  };
  if (task.completedAtIso) overlay.completedAtIso = task.completedAtIso;
  return overlay;
}

export function mergeProjectLinks(project: Project, overlay?: ProjectLinksOverlay): Project {
  if (!overlay) return project;
  return {
    ...project,
    driveFolder: overlay.folder ?? project.driveFolder ?? null,
    driveDocs: overlay.docs ?? project.driveDocs ?? [],
    personIds: overlay.personIds ?? project.personIds ?? [],
  };
}

export function projectToLinksOverlay(project: Project): ProjectLinksOverlay {
  return {
    folder: project.driveFolder ?? null,
    docs: project.driveDocs ?? [],
    personIds: project.personIds ?? [],
  };
}

export function overlayTouchesAppData(patch: Partial<Task>): boolean {
  const keys = Object.keys(patch);
  return keys.some(
    (k) =>
      k === "inToday" ||
      k === "subtasks" ||
      k === "personId" ||
      k === "personName" ||
      k === "completedAtIso"
  );
}
