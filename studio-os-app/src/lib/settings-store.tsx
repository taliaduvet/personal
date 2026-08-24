"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { WeekStartDay } from "./week";
import type { Contact } from "./sheet/app-data";
import type { LifeArea, WorkMode } from "./types";
import { LIFE_AREAS as SEED_LIFE_AREAS, WORK_MODES as SEED_WORK_MODES } from "./sample-data";
import { setActiveLifeAreas } from "./life-area-registry";
import { setActiveWorkModes } from "./work-mode-registry";
import {
  notifyAppDataContacts,
  notifyAppDataLifeAreas,
  notifyAppDataWeekPlanning,
} from "./sheet/app-data-notify";

import type { WeekDayFocusEntry, WeekFocusDraft } from "./week-focus";
import type { AllDayDisposition } from "./calendar/types";

const STORAGE_KEY = "studio-os.settings.v2";

/**
 * One-shot marker for the July 2026 life-areas repair.
 *
 * Devices that ran the old sync are holding a life-area list that *looks*
 * edited (seed defaults plus whatever survived) but isn't what the user
 * chose, so the seed check in settings-merge can't spot it. Until this key
 * exists, a device defers to the cloud copy of life areas exactly once. The
 * bridge sets the key only after a cloud merge actually lands, so a device
 * that starts up offline still gets its handoff later.
 */
const LIFE_AREAS_HANDOFF_KEY = "studio-os.life-areas-handoff.v1";

export type WeekPlanningSummary = {
  /** Days with a mode or project focus set. */
  focusDays: number;
  /** Tasks with a specific day assigned this week. */
  placed: number;
  /** Tasks still in the week bucket (no specific day). */
  stillOpen: number;
  /** Tasks pulled into Today during this planning session. */
  pulledToToday: number;
};

export type WeekPlanningRecord = {
  completedAt: string;
  summary: WeekPlanningSummary;
  theme: string | null;
  intention: string | null;
  approvedTaskIds: string[];
  days: Record<string, WeekDayFocusEntry>;
  allDayDispositions?: Record<string, AllDayDisposition>;
};

export type AppSettings = {
  weekStartsOn: WeekStartDay;
  /** Per week-start key — set when user taps Done planning. */
  weekPlanning: Record<string, WeekPlanningRecord>;
  /** Week-start key → ISO date when user declined planning from Review. */
  planningDeclinedAt: Record<string, string>;
  /** Week-start key → unplanned task IDs snapshotted when user dismissed the Today rail nudge. */
  unplannedNudgeDismissedIds: Record<string, string[]>;
  contacts: Contact[];
  lifeAreas: LifeArea[];
  workModes: WorkMode[];
  /** Default lead time before a session's target duration to fire the transition warning. */
  defaultSessionWarnBeforeMs: number;
  /** Elapsed time on an untimed session before the ambient hyperfocus nudge first fires. */
  ambientHyperfocusThresholdMs: number;
  /** How often the ambient nudge re-fires after the first time, until acknowledged. */
  ambientHyperfocusRepeatMs: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOn: 0,
  weekPlanning: {},
  planningDeclinedAt: {},
  unplannedNudgeDismissedIds: {},
  contacts: [],
  lifeAreas: SEED_LIFE_AREAS,
  workModes: SEED_WORK_MODES,
  defaultSessionWarnBeforeMs: 5 * 60_000,
  ambientHyperfocusThresholdMs: 90 * 60_000,
  ambientHyperfocusRepeatMs: 10 * 60_000,
};

type SettingsContextValue = AppSettings & {
  /** True after localStorage settings have been read (avoids SSR/client week-strip mismatch). */
  settingsHydrated: boolean;
  /**
   * True when hydration actually found a stored blob. False means everything
   * here is still DEFAULT_SETTINGS — cloud sync must not treat that as the
   * user's choices and push it up over real data.
   */
  settingsFromStorage: boolean;
  /** True until this device has taken the cloud's life areas once (see LIFE_AREAS_HANDOFF_KEY). */
  lifeAreasHandoffPending: boolean;
  /** Called by the cloud bridge once a cloud settings merge has been applied. */
  consumeLifeAreasHandoff: () => void;
  setWeekStartsOn: (day: WeekStartDay) => void;
  completeWeekPlanning: (
    weekStartKey: string,
    summary: WeekPlanningSummary,
    draft: WeekFocusDraft
  ) => void;
  /** Re-open planning mid-week — clears the done state for that week. */
  reopenWeekPlanning: (weekStartKey: string) => void;
  /** User tapped "not now" on Review handoff — gentle deferral for this week. */
  declineWeekPlanning: (weekStartKey: string) => void;
  clearPlanningDeclined: (weekStartKey: string) => void;
  /** Add tasks to this week's approved list (mid-week approve from Today). */
  addApprovedTasksForWeek: (weekStartKey: string, taskIds: string[]) => void;
  /** Toggle one task on/off this week's approved list. */
  setTaskApprovedForWeek: (weekStartKey: string, taskId: string, approved: boolean) => void;
  /** Dismiss Today unplanned nudge — snapshot current unplanned task IDs for this week. */
  dismissUnplannedNudge: (weekStartKey: string, unplannedTaskIds: string[]) => void;
  /** Patch a single day in the week plan (shape today) without reopening the wizard. */
  patchWeekDayEntry: (
    weekStartKey: string,
    dateKey: string,
    patch: Partial<import("./week-focus").WeekDayFocusEntry>,
    dispositionPatch?: Record<string, AllDayDisposition>
  ) => void;
  /** Replace contacts from a Google Contacts sync. */
  setGoogleContacts: (contacts: Contact[]) => void;
  clearGoogleContacts: () => void;
  /** Merge contacts + week planning from a sheet pull. */
  applyFromSheetAppData: (data: {
    contacts: Contact[];
    weekPlanning: Record<string, WeekPlanningRecord>;
    lifeAreas?: LifeArea[];
  }) => void;
  /** Merge a partial settings snapshot pulled from Supabase cloud. */
  applySettingsFromCloud: (data: Partial<AppSettings>) => void;
  upsertLifeArea: (area: LifeArea) => void;
  removeLifeArea: (id: string) => string | null;
  upsertWorkMode: (mode: WorkMode) => void;
  removeWorkMode: (id: string) => string | null;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [fromStorage, setFromStorage] = useState(false);
  const [handoffPending, setHandoffPending] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        setFromStorage(true);
        setSettings({
          weekStartsOn: parsed.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn,
          weekPlanning: normalizeWeekPlanningMap(parsed.weekPlanning ?? {}),
          planningDeclinedAt:
            parsed.planningDeclinedAt && typeof parsed.planningDeclinedAt === "object"
              ? (parsed.planningDeclinedAt as Record<string, string>)
              : {},
          unplannedNudgeDismissedIds:
            parsed.unplannedNudgeDismissedIds &&
            typeof parsed.unplannedNudgeDismissedIds === "object"
              ? (parsed.unplannedNudgeDismissedIds as Record<string, string[]>)
              : {},
          contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
          lifeAreas: Array.isArray(parsed.lifeAreas) && parsed.lifeAreas.length > 0
            ? parsed.lifeAreas
            : DEFAULT_SETTINGS.lifeAreas,
          workModes: Array.isArray(parsed.workModes) && parsed.workModes.length > 0
            ? parsed.workModes
            : DEFAULT_SETTINGS.workModes,
          defaultSessionWarnBeforeMs:
            typeof parsed.defaultSessionWarnBeforeMs === "number"
              ? parsed.defaultSessionWarnBeforeMs
              : DEFAULT_SETTINGS.defaultSessionWarnBeforeMs,
          ambientHyperfocusThresholdMs:
            typeof parsed.ambientHyperfocusThresholdMs === "number"
              ? parsed.ambientHyperfocusThresholdMs
              : DEFAULT_SETTINGS.ambientHyperfocusThresholdMs,
          ambientHyperfocusRepeatMs:
            typeof parsed.ambientHyperfocusRepeatMs === "number"
              ? parsed.ambientHyperfocusRepeatMs
              : DEFAULT_SETTINGS.ambientHyperfocusRepeatMs,
        });
      }
    } catch {
      /* ignore */
    }
    try {
      setHandoffPending(!localStorage.getItem(LIFE_AREAS_HANDOFF_KEY));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const consumeLifeAreasHandoff = useCallback(() => {
    try {
      localStorage.setItem(LIFE_AREAS_HANDOFF_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setHandoffPending(false);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setActiveLifeAreas(settings.lifeAreas);
  }, [settings.lifeAreas, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setActiveWorkModes(settings.workModes);
  }, [settings.workModes, hydrated]);

  const setWeekStartsOn = useCallback((day: WeekStartDay) => {
    setSettings((s) => ({ ...s, weekStartsOn: day }));
  }, []);

  const completeWeekPlanning = useCallback(
    (weekStartKey: string, summary: WeekPlanningSummary, draft: WeekFocusDraft) => {
      setSettings((s) => {
        const next = {
          ...s,
          weekPlanning: {
            ...s.weekPlanning,
            [weekStartKey]: {
              completedAt: new Date().toISOString(),
              summary,
              theme: draft.theme,
              intention: draft.intention,
              approvedTaskIds: draft.approvedTaskIds,
              days: draft.days,
              allDayDispositions: draft.allDayDispositions,
            },
          },
          planningDeclinedAt: (() => {
            const next = { ...s.planningDeclinedAt };
            delete next[weekStartKey];
            return next;
          })(),
        };
        queueMicrotask(() => notifyAppDataWeekPlanning(next.weekPlanning));
        return next;
      });
    },
    []
  );

  const reopenWeekPlanning = useCallback((weekStartKey: string) => {
    setSettings((s) => {
      const next = { ...s.weekPlanning };
      delete next[weekStartKey];
      const updated = { ...s, weekPlanning: next };
      queueMicrotask(() => notifyAppDataWeekPlanning(updated.weekPlanning));
      return updated;
    });
  }, []);

  const declineWeekPlanning = useCallback((weekStartKey: string) => {
    setSettings((s) => ({
      ...s,
      planningDeclinedAt: {
        ...s.planningDeclinedAt,
        [weekStartKey]: new Date().toISOString().slice(0, 10),
      },
    }));
  }, []);

  const clearPlanningDeclined = useCallback((weekStartKey: string) => {
    setSettings((s) => {
      const next = { ...s.planningDeclinedAt };
      delete next[weekStartKey];
      return { ...s, planningDeclinedAt: next };
    });
  }, []);

  const addApprovedTasksForWeek = useCallback((weekStartKey: string, taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setSettings((s) => {
      const rec = s.weekPlanning[weekStartKey];
      if (!rec) return s;
      const merged = new Set(rec.approvedTaskIds);
      for (const id of taskIds) merged.add(id);
      const weekPlanning = {
        ...s.weekPlanning,
        [weekStartKey]: {
          ...rec,
          approvedTaskIds: [...merged],
        },
      };
      queueMicrotask(() => notifyAppDataWeekPlanning(weekPlanning));
      return { ...s, weekPlanning };
    });
  }, []);

  const setTaskApprovedForWeek = useCallback(
    (weekStartKey: string, taskId: string, approved: boolean) => {
      setSettings((s) => {
        const rec = s.weekPlanning[weekStartKey];
        if (!rec) return s;
        const ids = new Set(rec.approvedTaskIds);
        if (approved) ids.add(taskId);
        else ids.delete(taskId);
        const weekPlanning = {
          ...s.weekPlanning,
          [weekStartKey]: {
            ...rec,
            approvedTaskIds: [...ids],
          },
        };
        queueMicrotask(() => notifyAppDataWeekPlanning(weekPlanning));
        return { ...s, weekPlanning };
      });
    },
    []
  );

  const dismissUnplannedNudge = useCallback(
    (weekStartKey: string, unplannedTaskIds: string[]) => {
      setSettings((s) => ({
        ...s,
        unplannedNudgeDismissedIds: {
          ...s.unplannedNudgeDismissedIds,
          [weekStartKey]: [...unplannedTaskIds],
        },
      }));
    },
    []
  );

  const patchWeekDayEntry = useCallback(
    (
      weekStartKey: string,
      dateKey: string,
      patch: Partial<import("./week-focus").WeekDayFocusEntry>,
      dispositionPatch?: Record<string, AllDayDisposition>
    ) => {
      setSettings((s) => {
        const existing = s.weekPlanning[weekStartKey];
        const base: WeekPlanningRecord = existing ?? {
          completedAt: new Date().toISOString(),
          summary: { focusDays: 0, placed: 0, stillOpen: 0, pulledToToday: 0 },
          theme: null,
          intention: null,
          approvedTaskIds: [],
          days: {},
          allDayDispositions: {},
        };
        const prevDay = base.days[dateKey] ?? { focus: null, note: "" };
        const nextDay: import("./week-focus").WeekDayFocusEntry = {
          ...prevDay,
          ...patch,
          shapeBlocks: patch.shapeBlocks
            ? { ...prevDay.shapeBlocks, ...patch.shapeBlocks }
            : prevDay.shapeBlocks,
          shapeBlockTasks: patch.shapeBlockTasks
            ? { ...prevDay.shapeBlockTasks, ...patch.shapeBlockTasks }
            : prevDay.shapeBlockTasks,
          deferredTaskIds: patch.deferredTaskIds ?? prevDay.deferredTaskIds,
        };
        const weekPlanning = {
          ...s.weekPlanning,
          [weekStartKey]: {
            ...base,
            days: { ...base.days, [dateKey]: nextDay },
            allDayDispositions: dispositionPatch
              ? { ...(base.allDayDispositions ?? {}), ...dispositionPatch }
              : base.allDayDispositions,
          },
        };
        queueMicrotask(() => notifyAppDataWeekPlanning(weekPlanning));
        return { ...s, weekPlanning };
      });
    },
    []
  );

  const setGoogleContacts = useCallback((contacts: Contact[]) => {
    setSettings((s) => {
      queueMicrotask(() => notifyAppDataContacts(contacts));
      return { ...s, contacts };
    });
  }, []);

  const clearGoogleContacts = useCallback(() => {
    setSettings((s) => {
      queueMicrotask(() => notifyAppDataContacts([]));
      return { ...s, contacts: [] };
    });
  }, []);

  const applyFromSheetAppData = useCallback(
    (data: {
      contacts: Contact[];
      weekPlanning: Record<string, WeekPlanningRecord>;
      lifeAreas?: LifeArea[];
    }) => {
      setSettings((s) => ({
        ...s,
        contacts: data.contacts.length > 0 ? data.contacts : s.contacts,
        lifeAreas: data.lifeAreas && data.lifeAreas.length > 0 ? data.lifeAreas : s.lifeAreas,
        weekPlanning:
          Object.keys(data.weekPlanning).length > 0
            ? { ...s.weekPlanning, ...data.weekPlanning }
            : s.weekPlanning,
      }));
    },
    []
  );

  const applySettingsFromCloud = useCallback((data: Partial<AppSettings>) => {
    setSettings((s) => {
      // Only overwrite keys the cloud actually carries — a blob written by an
      // older build is missing fields, and spreading those in as undefined
      // would blank them on this device.
      const next = { ...s };
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) (next as Record<string, unknown>)[k] = v;
      }
      return next;
    });
  }, []);

  const upsertLifeArea = useCallback((area: LifeArea) => {
    setSettings((s) => {
      const idx = s.lifeAreas.findIndex((a) => a.id === area.id);
      const lifeAreas =
        idx >= 0
          ? s.lifeAreas.map((a) => (a.id === area.id ? area : a))
          : [...s.lifeAreas, area];
      queueMicrotask(() => notifyAppDataLifeAreas(lifeAreas));
      return { ...s, lifeAreas };
    });
  }, []);

  const removeLifeArea = useCallback((id: string): string | null => {
    let err: string | null = null;
    setSettings((s) => {
      if (s.lifeAreas.length <= 1) {
        err = "Keep at least one life area.";
        return s;
      }
      const lifeAreas = s.lifeAreas.filter((a) => a.id !== id);
      queueMicrotask(() => notifyAppDataLifeAreas(lifeAreas));
      return { ...s, lifeAreas };
    });
    return err;
  }, []);

  const upsertWorkMode = useCallback((mode: WorkMode) => {
    setSettings((s) => {
      const idx = s.workModes.findIndex((m) => m.id === mode.id);
      const workModes =
        idx >= 0
          ? s.workModes.map((m) => (m.id === mode.id ? mode : m))
          : [...s.workModes, mode];
      return { ...s, workModes };
    });
  }, []);

  const removeWorkMode = useCallback((id: string): string | null => {
    let err: string | null = null;
    setSettings((s) => {
      if (s.workModes.length <= 1) {
        err = "Keep at least one mode.";
        return s;
      }
      const workModes = s.workModes.filter((m) => m.id !== id);
      return { ...s, workModes };
    });
    return err;
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        settingsHydrated: hydrated,
        settingsFromStorage: fromStorage,
        lifeAreasHandoffPending: handoffPending,
        consumeLifeAreasHandoff,
        setWeekStartsOn,
        completeWeekPlanning,
        reopenWeekPlanning,
        declineWeekPlanning,
        clearPlanningDeclined,
        addApprovedTasksForWeek,
        setTaskApprovedForWeek,
        dismissUnplannedNudge,
        patchWeekDayEntry,
        setGoogleContacts,
        clearGoogleContacts,
        applyFromSheetAppData,
        applySettingsFromCloud,
        upsertLifeArea,
        removeLifeArea,
        upsertWorkMode,
        removeWorkMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

function normalizeWeekPlanningMap(
  raw: Record<string, Partial<WeekPlanningRecord>>
): Record<string, WeekPlanningRecord> {
  const out: Record<string, WeekPlanningRecord> = {};
  for (const [key, rec] of Object.entries(raw)) {
    if (!rec?.completedAt || !rec.summary) continue;
    out[key] = {
      completedAt: rec.completedAt,
      summary: {
        focusDays: rec.summary.focusDays ?? 0,
        placed: rec.summary.placed ?? 0,
        stillOpen: rec.summary.stillOpen ?? 0,
        pulledToToday: rec.summary.pulledToToday ?? 0,
      },
      theme: rec.theme ?? null,
      intention: rec.intention ?? null,
      approvedTaskIds: Array.isArray(rec.approvedTaskIds) ? rec.approvedTaskIds : [],
      days: rec.days ?? {},
      allDayDispositions: rec.allDayDispositions ?? {},
    };
  }
  return out;
}
