"use client";

import type { Recipe, Task, Project } from "@/lib/types";
import type { ActivityLogEntry } from "@/lib/activity-log";
import type { WeekReviewNotes } from "@/lib/store";
import type { AppSettings } from "@/lib/settings-store";
import { getSupabase } from "./session";
import { queueCloudDelete, queueCloudUpsert } from "./cloud-push-queue";

/**
 * Cloud persistence for the sos_ tables (Supabase = source of truth).
 *
 * Entity tables (tasks/projects/recipes) store whole app objects as jsonb
 * with tombstones; reviews/logbook are keyed rows; the activity log is
 * append-mostly; settings is a singleton. user_id is never sent — the
 * database defaults it to auth.uid() and RLS scopes every read/write.
 */

export type CloudState = {
  tasks: { id: string; data: Task; deleted: boolean }[];
  projects: { id: string; data: Project; deleted: boolean }[];
  recipes: { id: string; data: Recipe; deleted: boolean }[];
  activityLog: ActivityLogEntry[];
  reviews: Record<string, WeekReviewNotes>;
  logbook: Record<string, string>;
  settings: Partial<AppSettings> | null;
};

/** Pull the signed-in user's full cloud state. Null = signed out / failed. */
export async function pullCloudState(): Promise<CloudState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [tasks, projects, recipes, activity, reviews, logbook, settings] = await Promise.all([
    supabase.from("sos_tasks").select("id,data,deleted"),
    supabase.from("sos_projects").select("id,data,deleted"),
    supabase.from("sos_recipes").select("id,data,deleted"),
    supabase.from("sos_activity_log").select("data"),
    supabase.from("sos_reviews").select("week_key,reflection,intentions"),
    supabase.from("sos_logbook").select("date_key,line"),
    supabase.from("sos_settings").select("data").maybeSingle(),
  ]);

  const failed =
    tasks.error || projects.error || recipes.error || activity.error || reviews.error ||
    logbook.error || settings.error;
  if (failed) {
    console.warn("[cloud-sync] pull failed:", failed.message);
    return null;
  }

  const reviewMap: Record<string, WeekReviewNotes> = {};
  for (const r of reviews.data ?? []) {
    reviewMap[r.week_key as string] = {
      reflection: (r.reflection as string) ?? "",
      intentions: (r.intentions as string) ?? "",
    };
  }
  const logbookMap: Record<string, string> = {};
  for (const l of logbook.data ?? []) {
    logbookMap[l.date_key as string] = (l.line as string) ?? "";
  }

  return {
    tasks: (tasks.data ?? []) as CloudState["tasks"],
    projects: (projects.data ?? []) as CloudState["projects"],
    recipes: (recipes.data ?? []) as CloudState["recipes"],
    activityLog: (activity.data ?? []).map((r) => r.data as ActivityLogEntry),
    reviews: reviewMap,
    logbook: logbookMap,
    settings: (settings.data?.data as Partial<AppSettings>) ?? null,
  };
}

// Enqueue helpers — thin wrappers so the bridge reads declaratively. --------

export function queueCloudTask(task: Task) {
  queueCloudUpsert("sos_tasks", task.id, { id: task.id, data: task, deleted: false });
}

export function queueCloudTaskTombstone(id: string) {
  queueCloudUpsert("sos_tasks", id, { id, data: {}, deleted: true });
}

export function queueCloudProject(project: Project) {
  queueCloudUpsert("sos_projects", project.id, { id: project.id, data: project, deleted: false });
}

export function queueCloudProjectTombstone(id: string) {
  queueCloudUpsert("sos_projects", id, { id, data: {}, deleted: true });
}

export function queueCloudRecipe(recipe: Recipe) {
  queueCloudUpsert("sos_recipes", recipe.id, { id: recipe.id, data: recipe, deleted: false });
}

export function queueCloudRecipeTombstone(id: string) {
  queueCloudUpsert("sos_recipes", id, { id, data: {}, deleted: true });
}

export function queueCloudActivityEntry(entry: ActivityLogEntry) {
  queueCloudUpsert("sos_activity_log", entry.id, {
    id: entry.id,
    at: entry.atIso,
    data: entry,
  });
}

export function queueCloudActivityDelete(id: string) {
  queueCloudDelete("sos_activity_log", "id", id);
}

export function queueCloudReview(weekKey: string, notes: WeekReviewNotes) {
  queueCloudUpsert("sos_reviews", weekKey, {
    week_key: weekKey,
    reflection: notes.reflection,
    intentions: notes.intentions,
  });
}

export function queueCloudLogbookLine(dateKey: string, line: string) {
  queueCloudUpsert("sos_logbook", dateKey, { date_key: dateKey, line });
}

export function queueCloudLogbookDelete(dateKey: string) {
  queueCloudDelete("sos_logbook", "date_key", dateKey);
}

export function queueCloudSettings(settings: AppSettings) {
  queueCloudUpsert("sos_settings", "singleton", { data: settings });
}
