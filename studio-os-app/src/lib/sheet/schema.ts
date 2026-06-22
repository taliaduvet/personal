/** Mirrors studio-os/Config.gs — do not drift from the Sheet contract. */

export const SCHEMA_VERSION = "1.1.0";
export const SUPPORTED_SCHEMA_VERSIONS = ["1.0.0", "1.1.0"] as const;

/** Master template users copy before connecting (option A onboarding). */
export const TEMPLATE_SHEET_ID = "1_ocyGlmj-pdT5A4G61kXOYpC1LUtKopYfoGIi-5IhMo";

export const TEMPLATE_COPY_URL = `https://docs.google.com/spreadsheets/d/${TEMPLATE_SHEET_ID}/copy`;

export const TAB = {
  TASKS: "Tasks",
  PROJECTS: "Projects",
  SETTINGS: "_Settings",
  APP_DATA: "_AppData",
} as const;

export const TASKS_HEADERS = [
  "Task",
  "Category",
  "Project",
  "Priority",
  "Hard Deadline",
  "Target Week",
  "Doing Day",
  "Status",
  "Notes",
  "Drive Link",
  "Goal",
  "Calendar Event ID",
  "Task ID",
  "Created At",
  "Completed At",
] as const;

export const PROJECTS_HEADERS = [
  "Project",
  "Detail",
  "Status",
  "Target Date",
  "Color",
  "Goal",
  "Project ID",
] as const;

/** 0-based column indices for Tasks rows. */
export const TASKS_COL = {
  TASK: 0,
  CATEGORY: 1,
  PROJECT: 2,
  PRIORITY: 3,
  DEADLINE: 4,
  TARGET_WEEK: 5,
  DOING_DAY: 6,
  STATUS: 7,
  NOTES: 8,
  DRIVE: 9,
  GOAL: 10,
  EVENT_ID: 11,
  TASK_ID: 12,
  CREATED_AT: 13,
  COMPLETED_AT: 14,
} as const;

/** 0-based column indices for Projects rows. */
export const PROJECTS_COL = {
  PROJECT: 0,
  DETAIL: 1,
  STATUS: 2,
  TARGET_DATE: 3,
  COLOR: 4,
  GOAL: 5,
  PROJECT_ID: 6,
} as const;

export const SHEET_RANGES = {
  tasks: `${TAB.TASKS}!A1:O`,
  projects: `${TAB.PROJECTS}!A1:G`,
  settings: `${TAB.SETTINGS}!A1:B`,
  appData: `${TAB.APP_DATA}!A1:B`,
} as const;
