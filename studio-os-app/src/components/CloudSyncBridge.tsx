"use client";

import { useEffect, useRef } from "react";
import { isSampleTaskId, useTasks, type WeekReviewNotes } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { useSettings, type AppSettings } from "@/lib/settings-store";
import { useSheet } from "@/lib/sheet-store";
import { isCloudPrimary, setDataSource } from "@/lib/data-source";
import type { Recipe, Task, Project } from "@/lib/types";
import type { ActivityLogEntry } from "@/lib/activity-log";
import { getSupabase } from "@/lib/supabase/session";
import { ensurePushSubscribed } from "@/lib/push";
import { mergeSettings, pickLifeAreas } from "@/lib/settings-merge";
import { hasPendingCloudOp } from "@/lib/supabase/cloud-push-queue";
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
 * (first pull prefers what you already see on this device so nothing is lost;
 * later pulls prefer cloud for multi-device), seed any local-only rows up,
 * then freeze Google Sheet writeback once the app vault is active.
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
    workModes,
    defaultSessionWarnBeforeMs,
    ambientHyperfocusThresholdMs,
    ambientHyperfocusRepeatMs,
    settingsHydrated,
    settingsFromStorage,
    lifeAreasHandoffPending,
    consumeLifeAreasHandoff,
    applySettingsFromCloud,
  } = settingsCtx;
  const { freezeForCloudCutover } = useSheet();

  const currentSettings: AppSettings = {
    weekStartsOn,
    weekPlanning,
    planningDeclinedAt,
    unplannedNudgeDismissedIds,
    contacts,
    lifeAreas,
    workModes,
    defaultSessionWarnBeforeMs,
    ambientHyperfocusThresholdMs,
    ambientHyperfocusRepeatMs,
  };

  const armedRef = useRef(false);
  const pulledRef = useRef(false);
  const pullingRef = useRef(false);
  const cutoverDoneRef = useRef(isCloudPrimary());

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
    settingsFromStorage,
    lifeAreasHandoffPending,
  });
  localRef.current = {
    tasks,
    projects,
    recipes,
    activityLog,
    reviewNotes,
    logbookLines,
    settings: currentSettings,
    settingsFromStorage,
    lifeAreasHandoffPending,
  };

  const applyersRef = useRef({
    replaceTasksFromSheet,
    replaceProjectsFromSheet,
    applyRecipesFromSheet,
    applyActivityLogFromSheet,
    applyReviewNotesFromSheet,
    applyLogbookLinesFromSheet,
    applySettingsFromCloud,
    consumeLifeAreasHandoff,
    freezeForCloudCutover,
  });
  applyersRef.current = {
    replaceTasksFromSheet,
    replaceProjectsFromSheet,
    applyRecipesFromSheet,
    applyActivityLogFromSheet,
    applyReviewNotesFromSheet,
    applyLogbookLinesFromSheet,
    applySettingsFromCloud,
    consumeLifeAreasHandoff,
    freezeForCloudCutover,
  };

  const mergeCloud = (cloud: CloudState, seedLocalOnlyUp: boolean) => {
    const local = localRef.current;
    const a = applyersRef.current;

    // --- Tasks: union by id. First seed prefers local (what you see); later pulls prefer cloud.
    const cloudAliveById = new Map(
      cloud.tasks
        .filter((r) => !r.deleted && !isSampleTaskId(r.id))
        .map((r) => [r.id, r.data] as const)
    );
    const localSyncable = local.tasks.filter(taskSyncable);
    const localById = new Map(localSyncable.map((t) => [t.id, t]));
    const taskIds = new Set([...cloudAliveById.keys(), ...localById.keys()]);
    const mergedTasks: Task[] = [];
    for (const id of taskIds) {
      const L = localById.get(id);
      const C = cloudAliveById.get(id);
      if (L && C) {
        if (seedLocalOnlyUp) {
          mergedTasks.push(L);
          queueCloudTask(L);
        } else if (hasPendingCloudOp("sos_tasks", id)) {
          // A push for this task hasn't landed yet — the cloud row is stale.
          // Keep local (e.g. a completion) rather than let the pull undo it.
          mergedTasks.push(L);
        } else {
          mergedTasks.push(C);
        }
      } else if (L) {
        mergedTasks.push(L);
        if (seedLocalOnlyUp) queueCloudTask(L);
      } else if (C) {
        mergedTasks.push(C);
      }
    }
    a.replaceTasksFromSheet(mergedTasks);

    // --- Projects
    const cloudAliveProjects = cloud.projects
      .filter((r) => !r.deleted && projectSyncable(r.data))
      .map((r) => r.data);
    const cloudProjectById = new Map(cloudAliveProjects.map((p) => [p.id, p]));
    const localProjects = local.projects.filter(projectSyncable);
    const localProjectById = new Map(localProjects.map((p) => [p.id, p]));
    const projectIds = new Set([...cloudProjectById.keys(), ...localProjectById.keys()]);
    const mergedProjects: Project[] = [];
    for (const id of projectIds) {
      const L = localProjectById.get(id);
      const C = cloudProjectById.get(id);
      if (L && C) {
        if (seedLocalOnlyUp) {
          mergedProjects.push(L);
          queueCloudProject(L);
        } else if (hasPendingCloudOp("sos_projects", id)) {
          mergedProjects.push(L);
        } else {
          mergedProjects.push(C);
        }
      } else if (L) {
        mergedProjects.push(L);
        if (seedLocalOnlyUp) queueCloudProject(L);
      } else if (C) {
        mergedProjects.push(C);
      }
    }
    if (mergedProjects.length > 0) {
      a.replaceProjectsFromSheet(mergedProjects);
    }

    // --- Recipes
    const cloudAliveRecipes = cloud.recipes.filter((r) => !r.deleted).map((r) => r.data);
    const cloudRecipeById = new Map(cloudAliveRecipes.map((r) => [r.id, r]));
    const localRecipeById = new Map(local.recipes.map((r) => [r.id, r]));
    const recipeIds = new Set([...cloudRecipeById.keys(), ...localRecipeById.keys()]);
    const mergedRecipes: Recipe[] = [];
    for (const id of recipeIds) {
      const L = localRecipeById.get(id);
      const C = cloudRecipeById.get(id);
      if (L && C) {
        if (seedLocalOnlyUp) {
          mergedRecipes.push(L);
          queueCloudRecipe(L);
        } else if (hasPendingCloudOp("sos_recipes", id)) {
          mergedRecipes.push(L);
        } else {
          mergedRecipes.push(C);
        }
      } else if (L) {
        mergedRecipes.push(L);
        if (seedLocalOnlyUp) queueCloudRecipe(L);
      } else if (C) {
        mergedRecipes.push(C);
      }
    }
    if (mergedRecipes.length > 0) {
      a.applyRecipesFromSheet(mergedRecipes);
    }

    a.applyActivityLogFromSheet(cloud.activityLog);
    if (seedLocalOnlyUp) {
      const cloudEntryIds = new Set(cloud.activityLog.map((e) => e.id));
      local.activityLog
        .filter((e) => !cloudEntryIds.has(e.id))
        .forEach(queueCloudActivityEntry);
    }

    const mergedReviews = seedLocalOnlyUp
      ? { ...cloud.reviews, ...local.reviewNotes }
      : { ...local.reviewNotes, ...cloud.reviews };
    a.applyReviewNotesFromSheet(mergedReviews);
    if (seedLocalOnlyUp) {
      Object.entries(local.reviewNotes).forEach(([k, v]) => queueCloudReview(k, v));
    }

    const mergedLogbook = seedLocalOnlyUp
      ? { ...cloud.logbook, ...local.logbookLines }
      : { ...local.logbookLines, ...cloud.logbook };
    a.applyLogbookLinesFromSheet(mergedLogbook);
    if (seedLocalOnlyUp) {
      Object.entries(local.logbookLines).forEach(([k, v]) => queueCloudLogbookLine(k, v));
    }

    // --- Settings. A pull can outrun the 800ms push debounce, so if this
    // device still owes the cloud a settings write, its copy is the newer one
    // and applying the pull would undo the edit that queued it.
    if (hasPendingCloudOp("sos_settings", "singleton")) {
      // nothing to apply — the queued local write is authoritative
    } else if (seedLocalOnlyUp) {
      // Cutover: this device's copy wins, but only if it came from storage.
      // A cold device is holding DEFAULT_SETTINGS, which is not a choice.
      const mergedSettings = mergeSettings(
        local.settings,
        cloud.settings,
        local.settingsFromStorage,
        local.lifeAreasHandoffPending
      );
      a.applySettingsFromCloud(mergedSettings);
      queueCloudSettings(mergedSettings);
      if (cloud.settings) a.consumeLifeAreasHandoff();
    } else if (cloud.settings) {
      a.applySettingsFromCloud({
        ...cloud.settings,
        lifeAreas: pickLifeAreas(
          local.settings.lifeAreas,
          cloud.settings.lifeAreas,
          false,
          local.lifeAreasHandoffPending
        ),
      });
      a.consumeLifeAreasHandoff();
    }

    pulledRef.current = true;

    if (seedLocalOnlyUp && !cutoverDoneRef.current) {
      cutoverDoneRef.current = true;
      setDataSource("cloud");
      a.freezeForCloudCutover();
    }
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
    if (!tasksHydrated || !settingsHydrated) return;
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await runPull(true);
      // Self-heal push: if this device already granted permission but its
      // subscription never persisted (or the browser rotated it), re-save it now
      // that we know there's an authenticated session for RLS.
      if (!cancelled) void ensurePushSubscribed();
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
  }, [tasksHydrated, settingsHydrated]);

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
