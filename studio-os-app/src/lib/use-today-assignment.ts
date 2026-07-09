"use client";

import { useCallback } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekKey } from "@/lib/week";

/** Add to Today also approves for this week when a plan exists. */
export function useTodayAssignment() {
  const { sendToToday, updateTask } = useTasks();
  const { weekStartsOn, weekPlanning, addApprovedTasksForWeek } = useSettings();
  const weekKeyNow = weekKey(weekStartsOn, 0);

  const addToToday = useCallback(
    (taskId: string) => {
      if (weekPlanning[weekKeyNow]) {
        addApprovedTasksForWeek(weekKeyNow, [taskId]);
      }
      sendToToday(taskId);
    },
    [weekPlanning, weekKeyNow, addApprovedTasksForWeek, sendToToday]
  );

  const removeFromToday = useCallback(
    (taskId: string) => {
      updateTask(taskId, { inToday: false });
    },
    [updateTask]
  );

  const toggleToday = useCallback(
    (taskId: string, inToday: boolean) => {
      if (inToday) removeFromToday(taskId);
      else addToToday(taskId);
    },
    [addToToday, removeFromToday]
  );

  return { addToToday, removeFromToday, toggleToday };
}
