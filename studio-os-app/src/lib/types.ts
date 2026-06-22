export type TaskStatus = "todo" | "in_progress" | "done";

export type SubTask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  id: string;
  title: string;
  lifeAreaId: string;
  projectId: string | null;
  workModeId: string | null;
  doDateInDays: number | null;
  deadlineInDays: number | null;
  status: TaskStatus;
  inToday: boolean;
  /** Days from today when marked done. null = not completed. */
  completedAtInDays: number | null;
  notes: string;
  subtasks: SubTask[];
};

export type LifeArea = { id: string; name: string; color: string };

export type Project = {
  id: string;
  name: string;
  lifeAreaId: string;
  why: string | null;
};

export type WorkMode = { id: string; name: string };

export type LensId = "area" | "project" | "when" | "mode";

export type TaskGroup = {
  key: string;
  label: string;
  color?: string;
  tasks: Task[];
};
