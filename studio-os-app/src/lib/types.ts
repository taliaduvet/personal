export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  lifeAreaId: string;
  /** null = not part of a project (loose task / fresh capture) */
  projectId: string | null;
  /** null = no work-mode tagged */
  workModeId: string | null;
  /**
   * Soft "plan to do" date, in days from today. This is for self-accountability,
   * NOT pressure — a past doing date rolls forward calmly ("carried"), never
   * shamed as overdue. null = someday / no plan yet.
   */
  doDateInDays: number | null;
  /**
   * Hard deadline, in days from today. Reserved for real EXTERNAL dependencies
   * (grant cutoff, a collaborator is waiting). Most tasks have none. null = no
   * external deadline.
   */
  deadlineInDays: number | null;
  status: TaskStatus;
  /** Lifted into the curated Today surface (hidden from the Lot). */
  inToday: boolean;
};

export type LifeArea = { id: string; name: string; color: string };
export type Project = { id: string; name: string; lifeAreaId: string };
export type WorkMode = { id: string; name: string };

export type Goal = {
  id: string;
  name: string;
  lifeAreaId: string;
  /** Tie the goal to one project, or null to span the whole life area. */
  projectId: string | null;
  /** Soft milestone date, in days from today. null = no target date / someday. */
  targetInDays: number | null;
};

export type LensId = "area" | "project" | "when" | "mode";

export type TaskGroup = {
  key: string;
  label: string;
  color?: string;
  tasks: Task[];
};
