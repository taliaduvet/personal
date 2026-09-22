"use client";

import { useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import {
  daySlotMapForDays,
  moveTaskToDaySlot,
  tasksInDaySlot,
  unslottedBenchTasksForMode,
} from "@/lib/day-slots";
import { dayFocusIncludes, weekDaySlots, type DayFocus, type WeekFocusDraft } from "@/lib/week-focus";
import type { WeekStartDay } from "@/lib/week";
import type { tasksGroupedByMode } from "@/lib/week-planning-approve";

export type WeekPlaceTasksPanelProps = {
  draft: WeekFocusDraft;
  weekStartsOn: WeekStartDay;
  weekOffset: number;
  groupedApproved: ReturnType<typeof tasksGroupedByMode>;
  onPlaceTask: (modeId: string, taskId: string, dateKey: string | null) => void;
  onOpenTask: (id: string) => void;
};

export function WeekPlaceTasksPanel({
  draft,
  weekStartsOn,
  weekOffset,
  groupedApproved,
  onPlaceTask,
}: WeekPlaceTasksPanelProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const placeButton = (modeId: string, taskId: string) => (
    <button
      type="button"
      onClick={() =>
        setSelectedTaskId((id) => (id === `${modeId}:${taskId}` ? null : `${modeId}:${taskId}`))
      }
      className={[
        "rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
        selectedTaskId === `${modeId}:${taskId}`
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-muted hover:border-accent hover:text-ink",
      ].join(" ")}
    >
      {selectedTaskId === `${modeId}:${taskId}` ? "Placing…" : "Place"}
    </button>
  );

  const groupsWithDays = groupedApproved
    .map((g) => {
      const focus: DayFocus = { kind: "modes", ids: [g.modeId] };
      const slots = weekDaySlots(weekStartsOn, weekOffset).filter((slot) =>
        dayFocusIncludes(draft.days[slot.dateKey]?.focus ?? null, focus)
      );
      return { ...g, slots };
    })
    .filter((g) => g.slots.length > 0);

  if (groupsWithDays.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-canvas/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
        3 · Place tasks on specific days
      </h3>
      <p className="mt-1 text-[11px] text-muted">
        Tap Place on a task, then tap the day it belongs to. Unplaced tasks stay in the pile below —
        nothing is hidden.
      </p>

      <div className="mt-4 space-y-5">
        {groupsWithDays.map((g) => {
          const dateKeys = g.slots.map((s) => s.dateKey);
          const slotMap = daySlotMapForDays(draft.days, dateKeys);
          const unslotted = unslottedBenchTasksForMode(g.tasks, slotMap);

          return (
            <div key={g.modeId}>
              <p className="text-sm font-semibold text-ink">{g.name}</p>

              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${g.slots.length}, minmax(0, 1fr))` }}>
                {g.slots.map((slot) => {
                  const placedIds = slotMap[slot.dateKey] ?? [];
                  const placedTasks = tasksInDaySlot(g.tasks, placedIds);
                  const isDropTarget = Boolean(selectedTaskId);

                  return (
                    <div
                      key={slot.dateKey}
                      className={[
                        "rounded-lg border bg-canvas/30 p-3 transition-colors",
                        isDropTarget
                          ? "cursor-pointer border-dashed border-accent/60 hover:bg-accent-soft/30"
                          : "border-border",
                      ].join(" ")}
                      onClick={() => {
                        if (!selectedTaskId) return;
                        const [modeId, taskId] = selectedTaskId.split(":");
                        onPlaceTask(modeId!, taskId!, slot.dateKey);
                        setSelectedTaskId(null);
                      }}
                      role={isDropTarget ? "button" : undefined}
                      tabIndex={isDropTarget ? 0 : undefined}
                    >
                      <p className="text-[10px] font-semibold uppercase text-faint">
                        {slot.weekday} {slot.dayNum}
                      </p>

                      {placedTasks.length > 0 ? (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {placedTasks.map((task) => (
                            <div key={task.id} className="space-y-1">
                              <TaskCard task={task} hideMode hideProject hideArea todayTiming />
                              <div className="flex justify-end px-1">
                                <button
                                  type="button"
                                  onClick={() => onPlaceTask(g.modeId, task.id, null)}
                                  className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted hover:text-ink"
                                >
                                  Unplace
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-faint">
                          {isDropTarget ? "Tap to place here" : "Nothing placed yet"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedTaskId?.startsWith(`${g.modeId}:`) && (
                <p className="mt-2 text-[11px] text-accent">
                  Tap a day above to place this task · tap Place again to cancel
                </p>
              )}

              {unslotted.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                    Unplaced · {unslotted.length}
                  </p>
                  <div className="mt-2 space-y-2">
                    {unslotted.map((task) => (
                      <div key={task.id} className="space-y-1">
                        <TaskCard task={task} hideMode hideProject hideArea todayTiming />
                        <div className="flex justify-end px-1">{placeButton(g.modeId, task.id)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
