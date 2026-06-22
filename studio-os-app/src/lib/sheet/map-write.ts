import { dateWithOffset } from "@/lib/do-plan";
import type { WeekStartDay } from "@/lib/week";
import type { DoPlan, Project, Task, TaskStatus } from "@/lib/types";
import { dayOffsetToSheetSerial, unixMsToSheetSerial } from "./dates";
import { TASKS_COL } from "./schema";

const DOW_TO_DOING_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const WORK_MODE_TO_CATEGORY: Record<string, string> = {
  admin: "Admin",
  creative: "Release",
  outreach: "Promo",
  errands: "Admin",
};

const STATUS_TO_SHEET: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

function mondayOfWeekContaining(date: Date, weekStartsOn: WeekStartDay): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceStart = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - daysSinceStart);
  return d;
}

function doPlanToTargetWeekAndDay(
  plan: DoPlan,
  weekStartsOn: WeekStartDay
): { targetWeek: number | ""; doingDay: string } {
  if (plan === null) return { targetWeek: "", doingDay: "" };

  if (plan.kind === "week") {
    const anchor = new Date(`${plan.weekStart}T12:00:00`);
    anchor.setHours(0, 0, 0, 0);
    return { targetWeek: dateToSerial(anchor), doingDay: "" };
  }

  const day = dateWithOffset(plan.offset);
  const weekStart = mondayOfWeekContaining(day, weekStartsOn);
  return {
    targetWeek: dateToSerial(weekStart),
    doingDay: DOW_TO_DOING_DAY[day.getDay()],
  };
}

function dateToSerial(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const utcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return utcMs / 86_400_000 + 25569;
}

function categoryForTask(task: Task): string {
  if (task.workModeId && WORK_MODE_TO_CATEGORY[task.workModeId]) {
    return WORK_MODE_TO_CATEGORY[task.workModeId];
  }
  return "Admin";
}

function projectNameForTask(task: Task, projects: Project[]): string {
  if (!task.projectId) return "";
  return projects.find((p) => p.id === task.projectId)?.name ?? "";
}

/** Build a full Tasks row (columns A–O) for batchUpdate. */
export function taskToSheetRow(
  task: Task,
  projects: Project[],
  weekStartsOn: WeekStartDay
): (string | number)[] {
  const meta = task.sheetMeta ?? {};
  const { targetWeek, doingDay } = doPlanToTargetWeekAndDay(task.doPlan, weekStartsOn);
  const deadline = dayOffsetToSheetSerial(task.deadlineInDays);
  const completed =
    task.status === "done"
      ? dayOffsetToSheetSerial(task.completedAtInDays ?? 0)
      : "";
  const created = unixMsToSheetSerial(task.parkedAt);

  const row = new Array(TASKS_COL.COMPLETED_AT + 1).fill("");
  row[TASKS_COL.TASK] = task.title;
  row[TASKS_COL.CATEGORY] = categoryForTask(task);
  row[TASKS_COL.PROJECT] = projectNameForTask(task, projects);
  row[TASKS_COL.PRIORITY] = meta.priority ?? "Med";
  row[TASKS_COL.DEADLINE] = deadline;
  row[TASKS_COL.TARGET_WEEK] = targetWeek;
  row[TASKS_COL.DOING_DAY] = doingDay;
  row[TASKS_COL.STATUS] = STATUS_TO_SHEET[task.status];
  row[TASKS_COL.NOTES] = task.notes;
  row[TASKS_COL.DRIVE] = meta.driveLink ?? "";
  row[TASKS_COL.GOAL] = meta.goal ?? "";
  row[TASKS_COL.EVENT_ID] = meta.eventId ?? "";
  row[TASKS_COL.TASK_ID] = task.id;
  row[TASKS_COL.CREATED_AT] = created;
  row[TASKS_COL.COMPLETED_AT] = completed;
  return row;
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSheetTaskId(id: string): boolean {
  return UUID_RE.test(id);
}

export function newSheetTaskId(): string {
  return crypto.randomUUID();
}
