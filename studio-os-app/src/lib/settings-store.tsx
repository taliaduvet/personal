"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { WeekStartDay } from "./week";
import type { Contact } from "./sheet/app-data";
import type { LifeArea } from "./types";
import { LIFE_AREAS as SEED_LIFE_AREAS } from "./sample-data";
import { setActiveLifeAreas } from "./life-area-registry";
import {
  notifyAppDataContacts,
  notifyAppDataLifeAreas,
  notifyAppDataWeekPlanning,
} from "./sheet/app-data-notify";

import type { WeekDayFocusEntry, WeekFocusDraft } from "./week-focus";
import type { AllDayDisposition } from "./calendar/types";

const STORAGE_KEY = "studio-os.settings.v2";

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
  days: Record<string, WeekDayFocusEntry>;
  allDayDispositions?: Record<string, AllDayDisposition>;
};

export type AppSettings = {
  weekStartsOn: WeekStartDay;
  /** Per week-start key — set when user taps Done planning. */
  weekPlanning: Record<string, WeekPlanningRecord>;
  contacts: Contact[];
  lifeAreas: LifeArea[];
};

const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOn: 0,
  weekPlanning: {},
  contacts: [],
  lifeAreas: SEED_LIFE_AREAS,
};

type SettingsContextValue = AppSettings & {
  setWeekStartsOn: (day: WeekStartDay) => void;
  completeWeekPlanning: (
    weekStartKey: string,
    summary: WeekPlanningSummary,
    draft: WeekFocusDraft
  ) => void;
  /** Re-open planning mid-week — clears the done state for that week. */
  reopenWeekPlanning: (weekStartKey: string) => void;
  /** Replace contacts from a Google Contacts sync. */
  setGoogleContacts: (contacts: Contact[]) => void;
  clearGoogleContacts: () => void;
  /** Merge contacts + week planning from a sheet pull. */
  applyFromSheetAppData: (data: {
    contacts: Contact[];
    weekPlanning: Record<string, WeekPlanningRecord>;
    lifeAreas?: LifeArea[];
  }) => void;
  upsertLifeArea: (area: LifeArea) => void;
  removeLifeArea: (id: string) => string | null;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        setSettings({
          weekStartsOn: parsed.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn,
          weekPlanning: normalizeWeekPlanningMap(parsed.weekPlanning ?? {}),
          contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
          lifeAreas: Array.isArray(parsed.lifeAreas) && parsed.lifeAreas.length > 0
            ? parsed.lifeAreas
            : DEFAULT_SETTINGS.lifeAreas,
        });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
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
              days: draft.days,
              allDayDispositions: draft.allDayDispositions,
            },
          },
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

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setWeekStartsOn,
        completeWeekPlanning,
        reopenWeekPlanning,
        setGoogleContacts,
        clearGoogleContacts,
        applyFromSheetAppData,
        upsertLifeArea,
        removeLifeArea,
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
      days: rec.days ?? {},
      allDayDispositions: rec.allDayDispositions ?? {},
    };
  }
  return out;
}
