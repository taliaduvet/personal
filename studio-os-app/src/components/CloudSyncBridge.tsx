"use client";

import { useEffect, useRef } from "react";
import { isSampleTaskId, useTasks, type WeekReviewNotes } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { useSettings, type AppSettings } from "@/lib/settings-store";
import type { Recipe, Task, Project } from "@/lib/types";
import type { ActivityLogEntry } from "@/lib/activity-log";
import { getSupabase } from "@/lib/supabase/session";
import {
  pullCloudState,
  queueCloudActivityDelete,
  queueCloudActivityEntry,
  queueCloudLogbookDelete,
  queueCloudLogbookLine,
  queueCloudProject,
  queueCloudProjectTombstone,
  queueCloudRecipe,
  queueCloudRecipeTombstone,
  queueCloudReview,
  queueCloudSettings,
  queueCloudTask,
  queueCloudTaskTombstone,
  type CloudState,
} from "@/lib/supabase/cloud-sync";

/**
 * Cloud sync bridge — Supabase is the durable source of truth; localStorage
 * stays the instant working copy.
 *
 * On sign-in: pull the user's cloud state, merge it into the local stores
 * (cloud wins per row; local rows the cloud has never seen survive and are
 * pushed up), then arm the diff watchers.
 *
 * Re-pulls on tab focus / visibility so iPhone Share captures appear without
 * a full remount. Dispatch `studio-os:cloud-pull` to force a pull (e.g. Brief me).
 */

/** Seed project ids from sample-data — never treat as real user projects. */
const SAMPLE_PROJECT_IDS = new Set([
  "spring-ep",
  "fall-tour",
  "factor-grant",
  "day-job",
  "apartment",
]);

/** Only tasks with a real title sync — blank drafts + demo seeds stay local. */
function taskSyncable(t: Task): boolean {
  return t.title.trim().length > 0 && !isSampleTaskId(t.id);
}

function projectSyncable(p: Project): boolean {
  return !SAMPLE_PROJECT_IDS.has(p.id);
}

export const CLOUD_PULL_EVENT = "studio-os:cloud-pull";

export function CloudSyncBridge() {
  const {
    tasks,
    tasksHydrated,
    recipes,
    reviewNotes,
    activityLog,
    logbookLines,
    replaceTasksFromSheet,
    applyRecipesFromSheet,
    applyReviewNotesFromSheet,
    applyActivityLogFromSheet,
    applyLogbookLinesFromSheet,
  } = useTasks();
  const { projects, replaceProjectsFromSheet } = useProjects();
  const settingsCtx = useSettings();
  const {
    weekStartsOn,
    weekPlanning,
    planningDeclinedAt,
    unplannedNudgeDismissedIds,
    contacts,
    lifeAreas,
    applySettingsFromCloud,
  } = settingsCtx;

  const currentSettings: AppSettings = {
    weekStartsOn,
    weekPlanning,
    planningDeclinedAt,
    unplannedNudgeDismissedIds,
    contacts,
    lifeAreas,
  };

  const armedRef = useRef(false);
  const pulledRef = useRef(false);
  const pullingRef = useRef(false);

  const prevTasks = useRef<Task[]>(tasks);
  const prevProjects = useRef<Project[]>(projects);
  const prevRecipes = useRef<Recipe[]>(recipes);
  const prevActivity = useRef<ActivityLogEntry[]>(activityLog);
  const prevReviews = useRef<Record<string, WeekReviewNotes>>(reviewNotes);
  const prevLogbook = useRef<Record<string, string>>(logbookLines);
  const prevSettingsJson = useRef<string>(JSON.stringify(currentSettings));

  const localRef = useRef({
    tasks,
    projects,
    recipes,
    activityLog,
    reviewNotes,
    logbookLines,
    settings: currentSettings,
  });
  localRef.current = {
    tasks,
    projects,
    recipes,
    activityLog,
    reviewNotes,
    logbookLines,
    settings: currentSettings,
  };

  const applyersRef = useRef({
    replaceTasksFromSheet,
    replaceProjectsFromSheet,
    applyRecipesFromSheet,
    applyActivityLogFromSheet,
    applyReviewNotesFromSheet,
    applyLogbookLinesFromSheet,
    applySettingsFromCloud,
  });
  applyersRef.current = {
    replaceTasksFromSheet,
    replaceProjectsFromSheet,
    applyRecipesFromSheet,
    applyActivityLogFromSheet,
    applyReviewNotesFromSheet,
    applyLogbookLinesFromSheet,
    applySettingsFromCloud,
  };

  const mergeCloud = (cloud: CloudState, seedLocalOnlyUp: boolean) => {
    const local = localRef.current;
    const a = applyersRef.current;

    const cloudTaskIds = new Set(cloud.tasks.map((r) => r.id));
    const aliveTasks = cloud.tasks
      .filter((r) => !r.deleted && !isSampleTaskId(r.id))
      .map((r) => r.data);
    const localOnlyTasks = local.tasks.filter((t) => !cloudTaskIds.has(t.id) && taskSyncable(t));
    a.replaceTasksFromSheet([...localOnlyTasks, ...aliveTasks]);
    if (seedLocalOnlyUp) localOnlyTasks.forEach(queueCloudTask);

    const cloudProjectIds = new Set(cloud.projects.map((r) => r.id));
    const aliveProjects = cloud.projects
      .filter((r) => !r.deleted && projectSyncable(r.data))
      .map((r) => r.data);
    const localOnlyProjects = local.projects.filter(
      (p) => !cloudProjectIds.has(p.id) && projectSyncable(p)
    );
    if (aliveProjects.length > 0 || localOnlyProjects.length > 0) {
      a.replaceProjectsFromSheet([...aliveProjects, ...localOnlyProjects]);
    }
    if (seedLocalOnlyUp) localOnlyProjects.forEach(queueCloudProject);

    const cloudRecipeIds = new Set(cloud.recipes.map((r) => r.id));
    const aliveRecipes = cloud.recipes.filter((r) => !r.deleted).map((r) => r.data);
    const localOnlyRecipes = local.recipes.filter((r) => !cloudRecipeIds.has(r.id));
    a.applyRecipesFromSheet([...aliveRecipes, ...localOnlyRecipes]);
    if (seedLocalOnlyUp) localOnlyRecipes.forEach(queueCloudRecipe);

    a.applyActivityLogFromSheet(cloud.activityLog);
    if (seedLocalOnlyUp) {
      const cloudEntryIds = new Set(cloud.activityLog.map((e) => e.id));
      local.activityLog
        .filter((e) => !cloudEntryIds.has(e.id))
        .forEach(queueCloudActivityEntry);
    }

    const mergedReviews = { ...local.reviewNotes, ...cloud.reviews };
    a.applyReviewNotesFromSheet(mergedReviews);
    if (seedLocalOnlyUp) {
      Object.entries(local.reviewNotes)
        .filter(([k]) => !(k in cloud.reviews))
        .forEach(([k, v]) => queueCloudReview(k, v));
    }

    const mergedLogbook = { ...local.logbookLines, ...cloud.logbook };
    a.applyLogbookLinesFromSheet(mergedLogbook);
    if (seedLocalOnlyUp) {
      Object.entries(local.logbookLines)
        .filter(([k]) => !(k in cloud.logbook))
        .forEach(([k, v]) => queueCloudLogbookLine(k, v));
    }

    if (cloud.settings) {
      a.applySettingsFromCloud(cloud.settings);
    } else if (seedLocalOnlyUp) {
      queueCloudSettings(local.settings);
    }

    pulledRef.current = true;
  };

  const runPull = async (seedLocalOnlyUp: boolean) => {
    if (pullingRef.current) return false;
    const supabase = getSupabase();
    if (!supabase) return false;
    pullingRef.current = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;
      const cloud = await pullCloudState();
      if (!cloud) return false;
      mergeCloud(cloud, seedLocalOnlyUp);
      return true;
    } finally {
      pullingRef.current = false;
    }
  };

  // Wait for localStorage hydrate so first pull doesn't upload demo seeds.
  useEffect(() => {
    if (!tasksHydrated) return;
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await runPull(true);
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runPull(false);
      }
    };
    const onFocus = () => {
      void runPull(false);
    };
    const onCustom = () => {
      void runPull(false);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener(CLOUD_PULL_EVENT, onCustom);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CLOUD_PULL_EVENT, onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksHydrated]);

  useEffect(() => {
    const prev = prevTasks.current;
    prevTasks.current = tasks;
    if (!armedRef.current || prev === tasks) return;
    const prevById = new Map(prev.map((t) => [t.id, t]));
    for (const t of tasks) {
      const before = prevById.get(t.id);
      prevById.delete(t.id);
      if (before !== t && taskSyncable(t)) queueCloudTask(t);
    }
    for (const [id, gone] of prevById) {
      if (taskSyncable(gone)) queueCloudTaskTombstone(id);
    }
  }, [tasks]);

  useEffect(() => {
    const prev = prevProjects.current;
    prevProjects.current = projects;
    if (!armedRef.current || prev === projects) return;
    const prevById = new Map(prev.map((p) => [p.id, p]));
    for (const p of projects) {
      const before = prevById.get(p.id);
      prevById.delete(p.id);
      if (before !== p) queueCloudProject(p);
    }
    for (const id of prevById.keys()) queueCloudProjectTombstone(id);
  }, [projects]);

  useEffect(() => {
    const prev = prevRecipes.current;
    prevRecipes.current = recipes;
    if (!armedRef.current || prev === recipes) return;
    const prevById = new Map(prev.map((r) => [r.id, r]));
    for (const r of recipes) {
      const before = prevById.get(r.id);
      prevById.delete(r.id);
      if (before !== r) queueCloudRecipe(r);
    }
    for (const id of prevById.keys()) queueCloudRecipeTombstone(id);
  }, [recipes]);

  useEffect(() => {
    const prev = prevActivity.current;
    prevActivity.current = activityLog;
    if (!armedRef.current || prev === activityLog) return;
    const prevIds = new Set(prev.map((e) => e.id));
    const nextIds = new Set(activityLog.map((e) => e.id));
    for (const e of activityLog) {
      if (!prevIds.has(e.id)) queueCloudActivityEntry(e);
    }
    for (const e of prev) {
      if (!nextIds.has(e.id)) queueCloudActivityDelete(e.id);
    }
  }, [activityLog]);

  useEffect(() => {
    const prev = prevReviews.current;
    prevReviews.current = reviewNotes;
    if (!armedRef.current || prev === reviewNotes) return;
    for (const [k, v] of Object.entries(reviewNotes)) {
      const before = prev[k];
      if (!before || before.reflection !== v.reflection || before.intentions !== v.intentions) {
        queueCloudReview(k, v);
      }
    }
  }, [reviewNotes]);

  useEffect(() => {
    const prev = prevLogbook.current;
    prevLogbook.current = logbookLines;
    if (!armedRef.current || prev === logbookLines) return;
    for (const [k, v] of Object.entries(logbookLines)) {
      if (prev[k] !== v) queueCloudLogbookLine(k, v);
    }
    for (const k of Object.keys(prev)) {
      if (!(k in logbookLines)) queueCloudLogbookDelete(k);
    }
  }, [logbookLines]);

  const settingsJson = JSON.stringify(currentSettings);
  useEffect(() => {
    const prev = prevSettingsJson.current;
    prevSettingsJson.current = settingsJson;
    if (!armedRef.current || prev === settingsJson) return;
    queueCloudSettings(JSON.parse(settingsJson) as AppSettings);
  }, [settingsJson]);

  useEffect(() => {
    if (pulledRef.current && !armedRef.current) {
      armedRef.current = true;
    }
  });

  return null;
}
