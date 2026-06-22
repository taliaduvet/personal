import { offsetFromToday, weekPlan } from "@/lib/do-plan";
import type { WeekStartDay } from "@/lib/week";
import { weekKey } from "@/lib/week";
import type { DoPlan, Project, Task, TaskStatus, TaskSheetMeta } from "@/lib/types";
import { parseSheetDate, sheetDateToDayOffset, sheetDateToUnixMs } from "./dates";
import { PROJECTS_COL, TASKS_COL } from "./schema";

const DOING_DAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const CATEGORY_TO_WORK_MODE: Record<string, string> = {
  Grant: "admin",
  Release: "creative",
  Touring: "outreach",
  Promo: "outreach",
  Admin: "admin",
};

const CATEGORY_TO_LIFE_AREA: Record<string, string> = {
  Grant: "music",
  Release: "music",
  Touring: "music",
  Promo: "music",
  Admin: "home",
};

const PROJECT_COLOR_TO_LIFE_AREA: Record<string, string> = {
  "#3c8262": "music",
  "#3d6f9f": "music",
  "#6a5dc0": "music",
  "#bc6740": "music",
  "#69737e": "home",
  "#5b61e8": "music",
};

const STATUS_TO_APP: Record<string, TaskStatus> = {
  done: "done",
  "in progress": "in_progress",
  "to do": "todo",
  "not started": "todo",
};

function cellStr(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeColor(value: unknown): string {
  return cellStr(value).toLowerCase();
}

function mapStatus(raw: string): TaskStatus {
  return STATUS_TO_APP[raw.trim().toLowerCase()] ?? "todo";
}

function mapWorkMode(category: string): string | null {
  return CATEGORY_TO_WORK_MODE[category.trim()] ?? null;
}

function lifeAreaFromCategory(category: string): string {
  return CATEGORY_TO_LIFE_AREA[category.trim()] ?? "music";
}

function lifeAreaFromProjectColor(color: string): string {
  return PROJECT_COLOR_TO_LIFE_AREA[normalizeColor(color)] ?? "music";
}

/** Next calendar occurrence of a short weekday name (Mon–Sun). */
export function nextWeekdayOffset(dayShort: string, from = new Date()): number {
  const target = DOING_DAY_TO_DOW[dayShort.trim()];
  if (target === undefined) return 0;

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const todayDow = today.getDay();

  let diff = target - todayDow;
  if (diff < 0) diff += 7;
  return diff;
}

/** Offset from today for a doing-day within a target-week anchor date (usually Monday). */
export function doingDayInTargetWeekOffset(doingDay: string, targetWeek: Date): number {
  const anchor = new Date(targetWeek);
  anchor.setHours(0, 0, 0, 0);

  const targetDow = DOING_DAY_TO_DOW[doingDay.trim()];
  if (targetDow === undefined) return offsetFromToday(anchor);

  const anchorDow = anchor.getDay();
  const daysFromAnchor = (targetDow - anchorDow + 7) % 7;
  const doingDate = new Date(anchor);
  doingDate.setDate(doingDate.getDate() + daysFromAnchor);
  return offsetFromToday(doingDate);
}

export function mapSheetDoPlan(
  doingDay: string,
  targetWeekRaw: unknown,
  weekStartsOn: WeekStartDay
): DoPlan {
  const targetWeek = parseSheetDate(targetWeekRaw);
  const doing = doingDay.trim();

  if (targetWeek) {
    if (doing) {
      return { kind: "day", offset: doingDayInTargetWeekOffset(doing, targetWeek) };
    }
    const key = weekKey(weekStartsOn, 0);
    const targetKey = targetWeek.toISOString().slice(0, 10);
    return weekPlan(targetKey || key);
  }

  if (doing) {
    return { kind: "day", offset: nextWeekdayOffset(doing) };
  }

  return null;
}

export function mapProjectRow(row: unknown[]): Project | null {
  const name = cellStr(row[PROJECTS_COL.PROJECT]);
  const id = cellStr(row[PROJECTS_COL.PROJECT_ID]);
  if (!name && !id) return null;
  if (!id) return null;

  const color = cellStr(row[PROJECTS_COL.COLOR]);
  const detail = cellStr(row[PROJECTS_COL.DETAIL]);

  return {
    id,
    name: name || "Untitled project",
    lifeAreaId: lifeAreaFromProjectColor(color),
    why: detail || null,
  };
}

export type ProjectNameLookup = Map<string, string>;

export function buildProjectNameLookup(projects: Project[]): ProjectNameLookup {
  const map = new Map<string, string>();
  for (const p of projects) {
    map.set(p.name.trim().toLowerCase(), p.id);
  }
  return map;
}

export function mapTaskRow(
  row: unknown[],
  projectByName: ProjectNameLookup,
  projectsById: Map<string, Project>,
  weekStartsOn: WeekStartDay
): Task | null {
  const title = cellStr(row[TASKS_COL.TASK]);
  const id = cellStr(row[TASKS_COL.TASK_ID]);
  if (!title && !id) return null;
  if (!id) return null;

  const category = cellStr(row[TASKS_COL.CATEGORY]);
  const projectName = cellStr(row[TASKS_COL.PROJECT]);
  const projectId = projectName
    ? (projectByName.get(projectName.toLowerCase()) ?? null)
    : null;

  const project = projectId ? projectsById.get(projectId) : undefined;
  const lifeAreaId = project?.lifeAreaId ?? lifeAreaFromCategory(category);

  const status = mapStatus(cellStr(row[TASKS_COL.STATUS]));
  const deadlineInDays = sheetDateToDayOffset(row[TASKS_COL.DEADLINE]);
  const completedAtInDays = sheetDateToDayOffset(row[TASKS_COL.COMPLETED_AT]);
  const parkedAt = sheetDateToUnixMs(row[TASKS_COL.CREATED_AT]) ?? Date.now();

  const doPlan = mapSheetDoPlan(
    cellStr(row[TASKS_COL.DOING_DAY]),
    row[TASKS_COL.TARGET_WEEK],
    weekStartsOn
  );

  const sheetMeta: TaskSheetMeta = {
    priority: cellStr(row[TASKS_COL.PRIORITY]) || undefined,
    goal: cellStr(row[TASKS_COL.GOAL]) || undefined,
    driveLink: cellStr(row[TASKS_COL.DRIVE]) || undefined,
    eventId: cellStr(row[TASKS_COL.EVENT_ID]) || undefined,
  };

  return {
    id,
    title: title || "Untitled task",
    lifeAreaId,
    projectId,
    workModeId: mapWorkMode(category),
    doPlan,
    deadlineInDays,
    status,
    inToday: false,
    completedAtInDays: status === "done" ? (completedAtInDays ?? 0) : completedAtInDays,
    parkedAt,
    notes: cellStr(row[TASKS_COL.NOTES]),
    subtasks: [],
    sheetMeta,
  };
}

export function parseSettingsRows(rows: unknown[][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = cellStr(row[0]);
    if (!key || key.toLowerCase() === "key") continue;
    const val = row[1];
    out[key] = val == null ? "" : String(val).trim();
  }
  return out;
}

export function headersMatch(actual: unknown[], expected: readonly string[]): boolean {
  if (actual.length < expected.length) return false;
  return expected.every((header, i) => cellStr(actual[i]).toLowerCase() === header.toLowerCase());
}
