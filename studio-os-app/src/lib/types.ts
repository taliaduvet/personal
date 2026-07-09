export type TaskStatus = "todo" | "in_progress" | "done";

/** Soft doing plan — day-specific, whole-week bucket, or null (someday). */
export type DoPlan =
  | { kind: "day"; offset: number }
  | { kind: "week"; weekStart: string }
  | null;

export type SubTask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskSheetMeta = {
  priority?: string;
  goal?: string;
  driveLink?: string;
  eventId?: string;
};

export type WaitingOn = {
  personId: string | null;
  personName: string;
  sinceIso: string;
};

export type Task = {
  id: string;
  title: string;
  lifeAreaId: string;
  projectId: string | null;
  workModeId: string | null;
  doPlan: DoPlan;
  deadlineInDays: number | null;
  status: TaskStatus;
  inToday: boolean;
  /** Days from today when marked done. null = not completed. */
  completedAtInDays: number | null;
  /** Precise completion time (app overlay / local). Sheet keeps date-only. */
  completedAtIso?: string | null;
  /** Unix ms when the task was captured. */
  parkedAt: number;
  notes: string;
  subtasks: SubTask[];
  /** Optional person assigned to this task (app overlay, synced via _AppData). */
  personId?: string | null;
  personName?: string | null;
  /** Sheet-only columns preserved on read/write (priority, goal, calendar IDs). */
  sheetMeta?: TaskSheetMeta;
  /** Last session reentry note (app overlay). */
  lastReentryNote?: string | null;
  /** Parked on someone else — leaves Today prominence. */
  waitingOn?: WaitingOn | null;
};

export type LifeArea = { id: string; name: string; color: string };

/** Optional Google Drive folder the user chose for a project. */
export type DriveFolderLink = {
  id: string;
  name: string;
  url: string;
  /** Parent path hint for display, e.g. "Music › Releases" — optional. */
  parentPath?: string | null;
  linkedAt: number;
};

/** Optional Google Doc linked to a project. */
export type DriveDocLink = {
  id: string;
  name: string;
  url: string;
  linkedAt: number;
};

export type Project = {
  id: string;
  name: string;
  lifeAreaId: string;
  why: string | null;
  /** User-linked Drive folder — optional, user picks location in Drive. */
  driveFolder?: DriveFolderLink | null;
  /** User-linked Google Docs — optional. */
  driveDocs?: DriveDocLink[];
  /** People explicitly attached to this project (app overlay). */
  personIds?: string[];
};

export type WorkMode = { id: string; name: string };

export type LensId = "area" | "project" | "when" | "mode" | "waiting";

export type TaskGroup = {
  key: string;
  label: string;
  color?: string;
  tasks: Task[];
};
