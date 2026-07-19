import type { LifeArea, Project, Recipe, Task } from "@/lib/types";
import type { ActivityLogEntry } from "@/lib/activity-log";
import type { WeekReviewNotes } from "@/lib/store";
import { formatStudioDuration } from "@/lib/studio-time";
import { localDateKey } from "@/lib/local-date";

/**
 * Data-portability export: everything the app knows, rendered as
 * human-readable tabs for a brand-new spreadsheet in the user's Drive.
 * Pure builder — the Sheets API write lives in export-write.ts.
 */

export type ExportTab = { title: string; rows: string[][] };
export type ExportSpec = { title: string; tabs: ExportTab[] };

export type ExportInput = {
  tasks: Task[];
  projects: Project[];
  recipes: Recipe[];
  activityLog: ActivityLogEntry[];
  reviewNotes: Record<string, WeekReviewNotes>;
  logbookLines: Record<string, string>;
  lifeAreas: LifeArea[];
};

/** Relative day offset → absolute YYYY-MM-DD, anchored to export time. */
function offsetToDate(offset: number | null | undefined, now: Date): string {
  if (offset === null || offset === undefined) return "";
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return localDateKey(d);
}

function doPlanLabel(task: Task, now: Date): string {
  const plan = task.doPlan;
  if (!plan) return "";
  if (plan.kind === "day") return offsetToDate(plan.offset, now);
  return `week of ${plan.weekStart}`;
}

function subtasksLabel(task: Task): string {
  if (task.subtasks.length === 0) return "";
  return task.subtasks.map((s) => `${s.done ? "[x]" : "[ ]"} ${s.title}`).join("; ");
}

export function buildExportSpec(input: ExportInput, now = new Date()): ExportSpec {
  const areaName = new Map(input.lifeAreas.map((a) => [a.id, a.name]));
  const projectName = new Map(input.projects.map((p) => [p.id, p.name]));
  const taskTitle = new Map(input.tasks.map((t) => [t.id, t.title]));

  const tasksRows: string[][] = [
    ["Title", "Status", "Life area", "Project", "Do plan", "Deadline", "Completed", "Mode", "Waiting on", "Notes", "Subtasks"],
    ...input.tasks
      .filter((t) => t.title.trim().length > 0)
      .map((t) => [
        t.title,
        t.status === "in_progress" ? "in progress" : t.status,
        areaName.get(t.lifeAreaId) ?? "",
        t.projectId ? (projectName.get(t.projectId) ?? t.projectId) : "",
        doPlanLabel(t, now),
        t.deadlineDateKey ?? offsetToDate(t.deadlineInDays, now),
        t.completedAtIso ? t.completedAtIso.slice(0, 10) : offsetToDate(t.completedAtInDays, now),
        t.workModeId ?? "",
        t.waitingOn?.personName ?? "",
        t.notes,
        subtasksLabel(t),
      ]),
  ];

  const projectsRows: string[][] = [
    ["Name", "Life area", "Why"],
    ...input.projects.map((p) => [
      p.name,
      areaName.get(p.lifeAreaId) ?? "",
      p.why ?? "",
    ]),
  ];

  const sessionsRows: string[][] = [
    ["When", "Kind", "Task", "Duration", "Note"],
    ...input.activityLog
      .filter((e) => e.kind === "session_end" || e.kind === "task_complete" || e.kind === "day_close_retro")
      .map((e) => {
        const when = e.atIso.slice(0, 16).replace("T", " ");
        if (e.kind === "session_end") {
          return [when, "session", taskTitle.get(e.taskId) ?? e.taskId, formatStudioDuration(e.durationMs), e.reentryNote ?? ""];
        }
        if (e.kind === "task_complete") {
          return [when, "completed", taskTitle.get(e.taskId) ?? e.taskId, "", ""];
        }
        return [
          when,
          "day close",
          (e.taskId && (taskTitle.get(e.taskId) ?? e.taskId)) || "",
          e.durationMs ? formatStudioDuration(e.durationMs) : "",
          e.reviewNote ?? "",
        ];
      }),
  ];

  const reviewsRows: string[][] = [
    ["Week", "Reflection", "Next week intentions"],
    ...Object.entries(input.reviewNotes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, notes]) => [week, notes.reflection, notes.intentions]),
  ];

  const logbookRows: string[][] = [
    ["Date", "Line"],
    ...Object.entries(input.logbookLines)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, line]) => [date, line]),
  ];

  const recipesRows: string[][] = [
    ["Recipe", "Life area", "Project", "Anchor date", "Milestone", "Offset days", "Mode"],
    ...input.recipes.flatMap((r) =>
      r.milestones.map((m) => [
        r.name,
        areaName.get(r.lifeAreaId) ?? "",
        r.projectId ? (projectName.get(r.projectId) ?? r.projectId) : "",
        r.anchorDate,
        m.title,
        String(m.offsetDays),
        m.workModeId ?? "",
      ])
    ),
  ];

  return {
    title: `Studio OS Export — ${localDateKey(now)}`,
    tabs: [
      { title: "Tasks", rows: tasksRows },
      { title: "Projects", rows: projectsRows },
      { title: "Sessions", rows: sessionsRows },
      { title: "Weekly Reviews", rows: reviewsRows },
      { title: "Logbook", rows: logbookRows },
      { title: "Recipes", rows: recipesRows },
    ],
  };
}
