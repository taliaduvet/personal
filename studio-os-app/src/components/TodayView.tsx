"use client";

import { useCallback, useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { useTodayAssignment } from "@/lib/use-today-assignment";
import { useTodayCaptures } from "@/lib/use-today-captures";
import { weekKey } from "@/lib/week";
import { moveTaskToShapeBlock } from "@/lib/day-shape";
import {
  dateKeyFromOffset,
  focusLabel,
  mergeWeekFocusDraft,
  partitionInTodayByFocus,
  tasksForTodayModeBench,
  todayFocusEntry,
  weekDaySlots,
  type DayFocus,
  type DayShapeBlock,
} from "@/lib/week-focus";
import { getActiveLifeAreas } from "@/lib/life-area-registry";
import { shouldShowUnplannedNudge, unplannedModeTasks } from "@/lib/unplanned-nudge";
import { TodayScreen, type LiftedItem, type LifeAreaRailItem } from "@/components/today/TodayScreen";
import { isLiftedToday, formatLiftedTime } from "@/lib/completed-at";
import { computeDayCommitment } from "@/lib/calendar/commitment";
import { useWeekCalendarEvents } from "@/lib/calendar/use-week-calendar";
import { useCalendarAccessToken } from "@/lib/calendar/use-calendar-access-token";
import { allDayDispositionKey, type AllDayDisposition } from "@/lib/calendar/types";
import type { DayShapePanelProps } from "@/components/today/DayShapePanel";
import type { Task } from "@/lib/types";

export function TodayView() {
  const { tasks: all, completeTask, addTask } = useTasks();
  const { addToToday } = useTodayAssignment();
  const { chips: caughtToday, capture: recordCapture } = useTodayCaptures();
  const {
    weekStartsOn,
    weekPlanning,
    unplannedNudgeDismissedIds,
    addApprovedTasksForWeek,
    dismissUnplannedNudge,
    patchWeekDayEntry,
  } = useSettings();
  const [shapeOpen, setShapeOpen] = useState(false);
  const { token: calendarToken } = useCalendarAccessToken();

  const weekKeyNow = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const record = weekPlanning[weekKeyNow];
  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const approved = useMemo(
    () => new Set(record?.approvedTaskIds ?? []),
    [record?.approvedTaskIds]
  );

  const weekDraft = useMemo(
    () =>
      mergeWeekFocusDraft(
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
      ),
    [record, slots]
  );

  const todayFocus = useMemo(() => todayFocusEntry(weekDraft, weekStartsOn), [weekDraft, weekStartsOn]);
  const hasModeDay = todayFocus.focus !== null;
  const isOpenDay = !hasModeDay;

  const modeBench = useMemo(() => {
    if (!todayFocus.focus) return [];
    return tasksForTodayModeBench(all, todayFocus.focus, weekStartsOn, approved);
  }, [all, todayFocus.focus, weekStartsOn, approved]);

  const { outsideFocus: alsoToday } = useMemo(
    () => partitionInTodayByFocus(all, todayFocus.focus),
    [all, todayFocus.focus]
  );

  const openDayTasks = useMemo(
    () => all.filter((t) => t.inToday && t.status !== "done"),
    [all]
  );

  const openDayTasksByArea = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const active = all.filter((t) => t.status !== "done" && !t.inToday);
    for (const t of active) {
      if (!t.lifeAreaId) continue;
      if (!map[t.lifeAreaId]) map[t.lifeAreaId] = [];
      map[t.lifeAreaId].push(t);
    }
    return map;
  }, [all]);

  const lifted = useMemo((): LiftedItem[] => {
    return all
      .filter((t) => isLiftedToday(t))
      .map((t) => ({
        id: t.id,
        title: t.title,
        timeLabel: formatLiftedTime(t),
      }));
  }, [all]);

  const lifeAreas = useMemo((): LifeAreaRailItem[] => {
    const active = all.filter((t) => t.status !== "done");
    return getActiveLifeAreas().map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      openCount: active.filter((t) => t.lifeAreaId === a.id).length,
    })).filter((a) => a.openCount > 0);
  }, [all]);

  const unplannedAll = useMemo(() => {
    if (!todayFocus.focus || todayFocus.focus.kind !== "mode") return [];
    return unplannedModeTasks(all, todayFocus.focus.id, approved, weekStartsOn);
  }, [all, todayFocus.focus, approved, weekStartsOn]);

  const unplannedVisible = useMemo(() => {
    const ids = unplannedAll.map((t) => t.id);
    const dismissed = unplannedNudgeDismissedIds[weekKeyNow];
    if (!shouldShowUnplannedNudge(ids, dismissed)) return [];
    return unplannedAll;
  }, [unplannedAll, unplannedNudgeDismissedIds, weekKeyNow]);

  const handleApproveUnplanned = useCallback(
    (taskIds: string[]) => {
      addApprovedTasksForWeek(weekKeyNow, taskIds);
    },
    [addApprovedTasksForWeek, weekKeyNow]
  );

  const handleDismissUnplanned = useCallback(() => {
    dismissUnplannedNudge(
      weekKeyNow,
      unplannedAll.map((t) => t.id)
    );
  }, [dismissUnplannedNudge, weekKeyNow, unplannedAll]);

  const handleCapture = useCallback(
    (text: string) => {
      recordCapture(text);
      addTask(text);
    },
    [recordCapture, addTask]
  );

  const handleAssignOpenDay = useCallback(
    (taskId: string) => {
      addToToday(taskId);
    },
    [addToToday]
  );

  const benchCount = (hasModeDay ? modeBench.length : openDayTasks.length) + (hasModeDay ? alsoToday.length : 0);

  const shapeBenchTasks = useMemo(() => {
    if (hasModeDay) return [...modeBench, ...alsoToday];
    return openDayTasks;
  }, [hasModeDay, modeBench, alsoToday, openDayTasks]);

  const todaySlotLabel = slots.find((s) => s.isToday);
  const dateLabel = todaySlotLabel
    ? `${todaySlotLabel.weekday === "Today" ? "Today" : todaySlotLabel.weekday} · ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const plannedLabel = record?.completedAt
    ? `you planned this ${new Date(record.completedAt).toLocaleDateString(undefined, { weekday: "long" })}`
    : "from your week plan";

  const todayDateKey = dateKeyFromOffset(0);
  const todaySlot = slots.find((s) => s.isToday) ?? slots[0];
  const todayEntry = weekDraft.days[todayDateKey] ?? { focus: null, note: "" };
  const allDayDispositions = record?.allDayDispositions ?? {};

  const calendar = useWeekCalendarEvents(
    calendarToken,
    todayDateKey,
    todayDateKey,
    shapeOpen
  );
  const dayCommitment = useMemo(
    () => computeDayCommitment(todayDateKey, calendar.events, allDayDispositions),
    [todayDateKey, calendar.events, allDayDispositions]
  );

  const handleDayFocus = useCallback(
    (focus: DayFocus | null) => {
      patchWeekDayEntry(weekKeyNow, todayDateKey, { focus });
    },
    [patchWeekDayEntry, weekKeyNow, todayDateKey]
  );

  const handleDayNote = useCallback(
    (note: string) => {
      patchWeekDayEntry(weekKeyNow, todayDateKey, { note });
    },
    [patchWeekDayEntry, weekKeyNow, todayDateKey]
  );

  const handleAllDayDisposition = useCallback(
    (dateKey: string, eventId: string, value: AllDayDisposition) => {
      patchWeekDayEntry(
        weekKeyNow,
        dateKey,
        {},
        { [allDayDispositionKey(dateKey, eventId)]: value }
      );
    },
    [patchWeekDayEntry, weekKeyNow]
  );

  const handleAssignTaskToBlock = useCallback(
    (taskId: string, block: DayShapeBlock | null) => {
      const next = moveTaskToShapeBlock(todayEntry.shapeBlockTasks, taskId, block);
      patchWeekDayEntry(weekKeyNow, todayDateKey, { shapeBlockTasks: next });
    },
    [patchWeekDayEntry, weekKeyNow, todayDateKey, todayEntry.shapeBlockTasks]
  );

  const dayShape: DayShapePanelProps = {
    slot: todaySlot,
    entry: todayEntry,
    commitment: dayCommitment,
    calendarLoading: calendar.loading,
    calendarError: calendar.error,
    calendarConnected: calendar.connected,
    allDayDispositions,
    benchTasks: shapeBenchTasks,
    weekStartsOn,
    onFocus: handleDayFocus,
    onNote: handleDayNote,
    onAllDayDisposition: handleAllDayDisposition,
    onAssignTaskToBlock: handleAssignTaskToBlock,
  };

  return (
    <TodayScreen
      dateLabel={dateLabel}
      benchCount={benchCount}
      liftedCount={lifted.length}
      theme={weekDraft.theme}
      modeDayLabel={hasModeDay && todayFocus.focus ? `${focusLabel(todayFocus.focus).toLowerCase()} day` : null}
      plannedLabel={hasModeDay ? plannedLabel : null}
      isOpenDay={isOpenDay}
      modeBench={modeBench}
      alsoToday={alsoToday}
      openDayTasks={openDayTasks}
      lifted={lifted}
      lifeAreas={lifeAreas}
      unplannedTasks={unplannedVisible}
      unplannedModeName={
        hasModeDay && todayFocus.focus ? focusLabel(todayFocus.focus).toLowerCase() : null
      }
      onApproveUnplanned={handleApproveUnplanned}
      onDismissUnplanned={handleDismissUnplanned}
      caughtToday={caughtToday}
      onCapture={handleCapture}
      openDayTasksByArea={openDayTasksByArea}
      approvedTaskIds={approved}
      onAssignOpenDay={handleAssignOpenDay}
      onComplete={completeTask}
      shapeOpen={shapeOpen}
      onShapeOpenChange={setShapeOpen}
      dayShape={dayShape}
    />
  );
}
