import type { WeekStartDay } from "@/lib/week";
import type { Project, Task } from "@/lib/types";
import { fetchSheetData, fetchSpreadsheetTitle } from "./client";
import {
  buildProjectNameLookup,
  headersMatch,
  mapProjectRow,
  mapTaskRow,
  parseSettingsRows,
} from "./map";
import { PROJECTS_HEADERS, SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS, TASKS_HEADERS } from "./schema";
import {
  emptyAppDataStore,
  mergeProjectLinks,
  mergeTaskOverlay,
  parseAppDataRows,
  type AppDataStore,
} from "./app-data";

export type SheetPullResult = {
  sheetTitle: string;
  settings: Record<string, string>;
  projects: Project[];
  tasks: Task[];
  appData: AppDataStore;
};

export type SheetValidationError = {
  code: "missing_tab" | "bad_headers" | "bad_schema";
  message: string;
};

export function validateSheetData(raw: {
  tasks: unknown[][];
  projects: unknown[][];
  settings: unknown[][];
}): SheetValidationError | null {
  if (raw.tasks.length === 0) {
    return {
      code: "missing_tab",
      message: "Could not read the Tasks tab. Run Build / Rebuild in the Sheet menu first.",
    };
  }

  const taskHeaders = raw.tasks[0] ?? [];
  if (!headersMatch(taskHeaders, TASKS_HEADERS)) {
    return {
      code: "bad_headers",
      message:
        "This doesn't look like a Studio OS sheet — Tasks headers don't match. Copy the official template and try again.",
    };
  }

  if (raw.projects.length === 0) {
    return {
      code: "missing_tab",
      message: "Could not read the Projects tab. Run Build / Rebuild in the Sheet menu first.",
    };
  }

  const projectHeaders = raw.projects[0] ?? [];
  if (!headersMatch(projectHeaders, PROJECTS_HEADERS)) {
    return {
      code: "bad_headers",
      message: "Projects headers don't match the Studio OS template.",
    };
  }

  const settings = parseSettingsRows(raw.settings.slice(1));
  const version = settings.schemaVersion?.trim();
  if (version && !SUPPORTED_SCHEMA_VERSIONS.includes(version as (typeof SUPPORTED_SCHEMA_VERSIONS)[number])) {
    return {
      code: "bad_schema",
      message: `Sheet schema is ${version}; this app supports ${SUPPORTED_SCHEMA_VERSIONS.join(" or ")}.`,
    };
  }

  return null;
}

export function mapSheetData(
  raw: { tasks: unknown[][]; projects: unknown[][]; settings: unknown[][]; appData: unknown[][] },
  weekStartsOn: WeekStartDay
): { projects: Project[]; tasks: Task[]; settings: Record<string, string>; appData: AppDataStore } {
  const settings = parseSettingsRows(raw.settings.slice(1));
  const appData = raw.appData.length > 0 ? parseAppDataRows(raw.appData) : emptyAppDataStore();

  const projects = raw.projects
    .slice(1)
    .map(mapProjectRow)
    .filter((p): p is Project => p !== null)
    .map((p) => mergeProjectLinks(p, appData.projects.get(p.id)));

  const projectByName = buildProjectNameLookup(projects);
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const tasks = raw.tasks
    .slice(1)
    .map((row) => mapTaskRow(row, projectByName, projectsById, weekStartsOn))
    .filter((t): t is Task => t !== null)
    .map((t) => mergeTaskOverlay(t, appData.tasks.get(t.id)));

  return { projects, tasks, settings, appData };
}

export async function pullFromSheet(
  sheetId: string,
  token: string,
  weekStartsOn: WeekStartDay
): Promise<SheetPullResult> {
  const [sheetTitle, raw] = await Promise.all([
    fetchSpreadsheetTitle(sheetId, token),
    fetchSheetData(sheetId, token),
  ]);

  const validationError = validateSheetData(raw);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const { projects, tasks, settings, appData } = mapSheetData(raw, weekStartsOn);

  return { sheetTitle, settings, projects, tasks, appData };
}
