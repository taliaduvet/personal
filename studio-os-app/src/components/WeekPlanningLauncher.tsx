"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekKey, weekRange } from "@/lib/week";
import { computeWeekPlanningSummary } from "@/lib/week-planning";
import { countFocusDays, mergeWeekFocusDraft, weekDaySlots } from "@/lib/week-focus";
import { defaultApprovedTaskIds } from "@/lib/week-planning-approve";
import { WeekPlanningOverlay } from "@/components/WeekPlanningOverlay";

export type PlanningOpenOptions = {
  intentionReminder?: string;
  initialStep?: 1 | 2 | 3 | 4;
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

  const weekKeyNow = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const record = weekPlanning[weekKeyNow];

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
      return { ...merged, approvedTaskIds: defaultApprovedTaskIds(tasks, weekStartsOn) };
    }
    return merged;
  }, [record, slots, tasks, weekStartsOn]);

  const openPlanning = useCallback((opts?: PlanningOpenOptions) => {
    setOptions(opts ?? {});
    setOpen(true);
  }, []);

  const handleDone = useCallback(
    (draft: typeof initialDraft) => {
      completeWeekPlanning(
        weekKeyNow,
        computeWeekPlanningSummary(tasks, weekStartsOn, countFocusDays(draft)),
        draft
      );
      setOpen(false);
      setOptions({});
    },
    [completeWeekPlanning, tasks, weekKeyNow, weekStartsOn]
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
