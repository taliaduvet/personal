"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekKey, weekRange } from "@/lib/week";
import { computeWeekPlanningSummary } from "@/lib/week-planning";
import { countFocusDays, mergeWeekFocusDraft, normalizeDayFocus, weekDaySlots } from "@/lib/week-focus";
import { defaultApprovedTaskIds } from "@/lib/week-planning-approve";
import { WeekPlanningOverlay } from "@/components/WeekPlanningOverlay";

export type PlanningOpenOptions = {
  intentionReminder?: string;
  initialStep?: 1 | 2 | 3 | 4;
  /** 0 = this week (default), 1 = next week. This week's plan is untouched either way. */
  weekOffset?: number;
};

type LauncherContextValue = {
  openPlanning: (opts?: PlanningOpenOptions) => void;
};

const WeekPlanningLauncherContext = createContext<LauncherContextValue | null>(null);

export function WeekPlanningLauncherProvider({ children }: { children: React.ReactNode }) {
  const { tasks } = useTasks();
  const { weekStartsOn, weekPlanning, completeWeekPlanning } = useSettings();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PlanningOpenOptions>({});

  const weekOffset = options.weekOffset ?? 0;
  const targetWeekKey = useMemo(() => weekKey(weekStartsOn, weekOffset), [weekStartsOn, weekOffset]);
  const slots = useMemo(() => weekDaySlots(weekStartsOn, weekOffset), [weekStartsOn, weekOffset]);
  const record = weekPlanning[targetWeekKey];

  const initialDraft = useMemo(() => {
    const merged = mergeWeekFocusDraft(
      record
        ? {
            theme: record.theme,
            intention: record.intention,
            approvedTaskIds: record.approvedTaskIds,
            days: record.days,
            allDayDispositions: record.allDayDispositions,
          }
        : undefined,
      slots
    );
    if (merged.approvedTaskIds.length === 0) {
      return { ...merged, approvedTaskIds: defaultApprovedTaskIds(tasks, weekStartsOn, weekOffset) };
    }
    return merged;
  }, [record, slots, tasks, weekStartsOn, weekOffset]);

  const openPlanning = useCallback((opts?: PlanningOpenOptions) => {
    setOptions(opts ?? {});
    setOpen(true);
  }, []);

  const handleDone = useCallback(
    (draft: typeof initialDraft) => {
      const normalizedDays = Object.fromEntries(
        Object.entries(draft.days).map(([key, entry]) => [
          key,
          { ...entry, focus: normalizeDayFocus(entry.focus) },
        ])
      );
      completeWeekPlanning(
        targetWeekKey,
        computeWeekPlanningSummary(tasks, weekStartsOn, countFocusDays(draft), weekOffset),
        { ...draft, days: normalizedDays }
      );
      setOpen(false);
      setOptions({});
    },
    [completeWeekPlanning, tasks, targetWeekKey, weekStartsOn, weekOffset]
  );

  return (
    <WeekPlanningLauncherContext.Provider value={{ openPlanning }}>
      {children}
      <WeekPlanningOverlay
        open={open}
        onClose={() => {
          setOpen(false);
          setOptions({});
        }}
        initialDraft={initialDraft}
        initialStep={options.initialStep ?? 1}
        intentionReminder={options.intentionReminder}
        weekOffset={weekOffset}
        onDone={handleDone}
      />
    </WeekPlanningLauncherContext.Provider>
  );
}

export function useWeekPlanningLauncher(): LauncherContextValue {
  const ctx = useContext(WeekPlanningLauncherContext);
  if (!ctx) throw new Error("useWeekPlanningLauncher must be used within WeekPlanningLauncherProvider");
  return ctx;
}

/** Week label for cards — shared helper. */
export function useCurrentWeekLabel() {
  const { weekStartsOn } = useSettings();
  return useMemo(() => weekRange(weekStartsOn, 0).label, [weekStartsOn]);
}
