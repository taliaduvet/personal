"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { WeekStartDay } from "./week";

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
};

const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOn: 0,
  weekPlanning: {},
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

  const setWeekStartsOn = useCallback((day: WeekStartDay) => {
    setSettings((s) => ({ ...s, weekStartsOn: day }));
  }, []);

  const completeWeekPlanning = useCallback(
    (weekStartKey: string, summary: WeekPlanningSummary, draft: WeekFocusDraft) => {
      setSettings((s) => ({
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
      }));
    },
    []
  );

  const reopenWeekPlanning = useCallback((weekStartKey: string) => {
    setSettings((s) => {
      const next = { ...s.weekPlanning };
      delete next[weekStartKey];
      return { ...s, weekPlanning: next };
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setWeekStartsOn,
        completeWeekPlanning,
        reopenWeekPlanning,
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
