"use client";

import { useState } from "react";
import { CalendarConnect } from "@/components/CalendarConnect";
import { WORK_MODES } from "@/lib/sample-data";
import { useProjects } from "@/lib/projects-store";
import { commitmentBarFill } from "@/lib/calendar/commitment";
import type { AllDayDisposition, DayCommitment } from "@/lib/calendar/types";
import { allDayDispositionKey } from "@/lib/calendar/types";
import {
  DAY_SHAPE_BLOCKS,
  eventsByShapeBlock,
  normalizeShapeBlockTasks,
  tasksInShapeBlock,
  unassignedShapeBenchTasks,
} from "@/lib/day-shape";
import { formatLocalTimeRange } from "@/lib/local-date";
import {
  focusLabel,
  type DayFocus,
  type DayShapeBlock,
  type WeekDayFocusEntry,
  type WeekDaySlot,
} from "@/lib/week-focus";
import type { Task } from "@/lib/types";
import type { WeekStartDay } from "@/lib/week";

export type DayShapePanelProps = {
  slot: WeekDaySlot;
  entry: WeekDayFocusEntry;
  commitment: DayCommitment;
  calendarLoading: boolean;
  calendarError: string | null;
  calendarConnected: boolean;
  allDayDispositions: Record<string, AllDayDisposition>;
  benchTasks: Task[];
  weekStartsOn: WeekStartDay;
  onFocus: (focus: DayFocus | null) => void;
  onNote: (note: string) => void;
  onAllDayDisposition: (dateKey: string, eventId: string, value: AllDayDisposition) => void;
  onAssignTaskToBlock: (taskId: string, block: DayShapeBlock | null) => void;
};

export function DayShapePanel({
  slot,
  entry,
  commitment,
  calendarLoading,
  calendarError,
  calendarConnected,
  allDayDispositions,
  benchTasks,
  onFocus,
  onNote,
  onAllDayDisposition,
  onAssignTaskToBlock,
}: DayShapePanelProps) {
  const { projects } = useProjects();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const shapeBlockTasks = normalizeShapeBlockTasks(entry.shapeBlockTasks);
  const eventsByBlock = eventsByShapeBlock(commitment.timedEvents);
  const unassigned = unassignedShapeBenchTasks(benchTasks, entry.shapeBlockTasks);
  const hasPlannedFocus = entry.focus !== null;

  const dateLabel =
    slot.offset === 0
      ? "Today"
      : slot.offset === 1
        ? "Tomorrow"
        : `${slot.weekday}, ${slot.dayNum}`;

  const handleBlockClick = (block: DayShapeBlock) => {
    if (!selectedTaskId) return;
    onAssignTaskToBlock(selectedTaskId, block);
    setSelectedTaskId(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-accent/25 bg-accent-soft/20">
      <div className="max-h-[min(70dvh,560px)] overflow-y-auto">
        <header className="border-b border-line px-4 py-3">
          <h3 className="font-display text-base font-semibold text-ink">{dateLabel}</h3>
          {commitment.blocked ? (
            <p className="mt-0.5 text-sm font-medium text-[#bc6740]">Marked as blocked</p>
          ) : commitment.timedHours > 0 ? (
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-medium text-ink">{commitment.timedHours}h</span> on calendar
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted">Light calendar day</p>
          )}
          {commitment.timedHours > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${commitmentBarFill(commitment.timedHours) * 100}%` }}
              />
            </div>
          )}
        </header>

        <div className="space-y-4 px-4 py-3">
          {calendarLoading && <p className="text-xs text-muted">Loading calendar…</p>}
          {calendarError && <p className="text-xs text-[#bc6740]">{calendarError}</p>}
          {!calendarConnected && !calendarLoading && <CalendarConnect compact />}

          {hasPlannedFocus ? (
            <p className="text-sm text-ink">
              <span className="font-medium">{focusLabel(entry.focus)}</span>
              <span className="text-muted"> · from your week plan</span>
            </p>
          ) : (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Day focus</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WORK_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onFocus({ kind: "mode", id: m.id })}
                    className={[
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      entry.focus?.kind === "mode" && entry.focus.id === m.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-muted hover:border-accent hover:text-ink",
                    ].join(" ")}
                  >
                    {m.name}
                  </button>
                ))}
                {projects.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onFocus({ kind: "project", id: p.id })}
                    className={[
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      entry.focus?.kind === "project" && entry.focus.id === p.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-muted hover:border-accent hover:text-ink",
                    ].join(" ")}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onFocus(null)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-faint hover:text-muted"
                >
                  Open
                </button>
              </div>
            </section>
          )}

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">Day note</span>
            <textarea
              value={entry.note}
              onChange={(e) => onNote(e.target.value)}
              rows={2}
              placeholder="Optional — e.g. studio after lunch"
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
              maxLength={400}
            />
          </label>

          {unassigned.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                Bench · tap a task, then a time block
              </p>
              <ul className="mt-2 space-y-1">
                {unassigned.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTaskId((id) => (id === task.id ? null : task.id))
                      }
                      className={[
                        "w-full rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                        selectedTaskId === task.id
                          ? "border-accent bg-accent-soft text-ink"
                          : "border-border bg-surface text-muted hover:border-accent hover:text-ink",
                      ].join(" ")}
                    >
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              Your day
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {DAY_SHAPE_BLOCKS.map((block) => {
                const blockTasks = tasksInShapeBlock(benchTasks, shapeBlockTasks[block]);
                const blockEvents = eventsByBlock[block];
                const isDropTarget = Boolean(selectedTaskId);

                return (
                  <div
                    key={block}
                    className={[
                      "rounded-lg border bg-surface p-3 transition-colors",
                      isDropTarget
                        ? "cursor-pointer border-dashed border-accent/60 hover:bg-accent-soft/30"
                        : "border-border",
                    ].join(" ")}
                    onClick={() => isDropTarget && handleBlockClick(block)}
                    onKeyDown={(e) => {
                      if (isDropTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleBlockClick(block);
                      }
                    }}
                    role={isDropTarget ? "button" : undefined}
                    tabIndex={isDropTarget ? 0 : undefined}
                  >
                    <p className="text-[10px] font-semibold uppercase text-faint">{block}</p>
                    {hasPlannedFocus && (
                      <p className="mt-0.5 text-[11px] text-muted">
                        {focusLabel(entry.focus).toLowerCase()}
                      </p>
                    )}

                    {block === "morning" && commitment.allDayEvents.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {commitment.allDayEvents.map((ev) => {
                          const key = allDayDispositionKey(slot.dateKey, ev.id);
                          const disposition = allDayDispositions[key] ?? "ignore";
                          return (
                            <li
                              key={ev.id}
                              className="rounded-md border border-line bg-canvas/50 px-2 py-1.5 text-xs"
                            >
                              <p className="font-medium text-ink">{ev.summary}</p>
                              <p className="text-[10px] text-faint">All day</p>
                              <select
                                value={disposition}
                                onChange={(e) =>
                                  onAllDayDisposition(
                                    slot.dateKey,
                                    ev.id,
                                    e.target.value as AllDayDisposition
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 w-full rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-ink"
                              >
                                <option value="ignore">Ignore for load</option>
                                <option value="blocks">Blocks whole day</option>
                              </select>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {blockEvents.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {blockEvents.map((ev) => (
                          <li
                            key={ev.id}
                            className="rounded-md border border-line bg-canvas/50 px-2 py-1.5 text-xs"
                          >
                            <span className="font-medium text-muted">
                              {formatLocalTimeRange(ev.startMs, ev.endMs)}
                            </span>
                            <p className="mt-0.5 text-sm text-ink">{ev.summary}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {blockTasks.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {blockTasks.map((task) => (
                          <li
                            key={task.id}
                            className={[
                              "flex items-start gap-1 rounded-md border px-2 py-1.5 text-xs",
                              selectedTaskId === task.id
                                ? "border-accent bg-accent-soft"
                                : "border-line bg-canvas/40",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskId((id) => (id === task.id ? null : task.id));
                              }}
                              className="min-w-0 flex-1 text-left text-ink"
                            >
                              {task.title}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignTaskToBlock(task.id, null);
                                if (selectedTaskId === task.id) setSelectedTaskId(null);
                              }}
                              className="shrink-0 text-faint hover:text-muted"
                              aria-label={`Remove ${task.title} from ${block}`}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {blockEvents.length === 0 &&
                      blockTasks.length === 0 &&
                      !(block === "morning" && commitment.allDayEvents.length > 0) && (
                        <p className="mt-2 text-xs text-faint">—</p>
                      )}
                  </div>
                );
              })}
            </div>
          </section>

          {selectedTaskId && (
            <p className="text-xs text-accent">
              Tap a time block to place this task · tap the task again to cancel
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
