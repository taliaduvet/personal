export type TaskStatus = "todo" | "in_progress" | "done";

/**
 * Soft doing plan — day-specific, whole-week bucket, or null (someday).
 *
 * Day plans store an **absolute local date key** (`YYYY-MM-DD`), never a
 * day offset. Offsets are "sticky": a task stored as "in 1 day" silently means
 * a different day tomorrow. Read an offset with `doPlanDayOffset(plan, now)`.
 */
export type DoPlan =
  | { kind: "day"; dateKey: string }
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

/**
 * A task that involves another person, and **which way the obligation runs**.
 *
 * `them` — you're blocked; they owe you. Don't ask the user to work it; chase.
 * `me`   — *someone is waiting on you.* A protected commitment: it gets lead
 *          time, a repeating check-in, and loop-closing.
 *
 * Direction is optional so legacy rows keep working; absent means `them`, which
 * is what `waitingOn` meant before the field existed.
 */
export type WaitingDirection = "them" | "me";

export type WaitingOn = {
  personId: string | null;
  personName: string;
  sinceIso: string;
  direction?: WaitingDirection;
};

export type RecipeMilestone = {
  id: string;
  title: string;
  /** Days relative to anchor (negative = before release). */
  offsetDays: number;
  workModeId?: string | null;
};

export type Recipe = {
  id: string;
  name: string;
  projectId: string | null;
  lifeAreaId: string;
  /** YYYY-MM-DD */
  anchorDate: string;
  milestones: RecipeMilestone[];
  createdAt: number;
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
  /** Generated from a recipe milestone. */
  recipeId?: string | null;
  milestoneId?: string | null;
  /** Needs-respond capture fields (iphone_share / capture flow). */
  needsRespond?: boolean | null;
  respondByDateKey?: string | null;
  urgencyReason?: string | null;
  deadlineDateKey?: string | null;
  source?: string | null;
  /** Recurring task schedule. Completing spawns the next occurrence. */
  recurrence?: Recurrence | null;
  /**
   * Follow-up / nudge system (see docs handoff brief).
   * `startThinkingAtDateKey` — the "Start thinking about" date: the day this
   *   task should begin surfacing. Auto-computed on the backend as deadline
   *   minus estimated lead time, but editable here.
   * `leadTimeDays` / `leadTimeSource` — the lead time behind that date. When
   *   Talia edits the date manually we set source to "manual" so the backend
   *   estimator stops overwriting it.
   * `nudgeType` — "timed" fires at a specific clock moment; "checkin" repeats
   *   until acknowledged.
   * `acknowledgedAt` — ISO time a check-in nudge was acknowledged (stops the
   *   nagging without marking the task done).
   */
  startThinkingAtDateKey?: string | null;
  leadTimeDays?: number | null;
  leadTimeSource?: "auto" | "manual" | null;
  nudgeType?: "timed" | "checkin" | null;
  acknowledgedAt?: string | null;
  /**
   * Loop closing — finishing is not telling. Completing a mix without sending
   * it is the most common way to disappoint someone while doing all the work,
   * so delivery is tracked as its own event. ISO time the person was told.
   */
  deliveredAt?: string | null;
};

export type Recurrence =
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "weekly" }
  | { kind: "everyNDays"; n: number }
  | { kind: "monthly" };

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
