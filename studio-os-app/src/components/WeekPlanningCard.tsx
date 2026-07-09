"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekKey, weekRange } from "@/lib/week";
import { weekPlanningMode } from "@/lib/week-planning";
import {
  focusShortLabel,
  mergeWeekFocusDraft,
  weekDaySlots,
} from "@/lib/week-focus";
import { useWeekPlanningLauncher } from "@/components/WeekPlanningLauncher";
import { deadlinesInWeek } from "@/lib/week-focus";

export function WeekPlanningCard() {
  const { tasks } = useTasks();
  const { weekStartsOn, weekPlanning, planningDeclinedAt } = useSettings();
  const { openPlanning } = useWeekPlanningLauncher();

  const weekKeyNow = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const range = useMemo(() => weekRange(weekStartsOn, 0), [weekStartsOn]);
  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const record = weekPlanning[weekKeyNow];
  const declined = Boolean(planningDeclinedAt[weekKeyNow]);
  const mode = useMemo(
    () => weekPlanningMode(tasks, weekStartsOn, weekPlanning),
    [tasks, weekStartsOn, weekPlanning]
  );
  const deadlines = useMemo(() => deadlinesInWeek(tasks, weekStartsOn), [tasks, weekStartsOn]);

  const draftFromRecord = useMemo(
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

  const shaped = mode === "shaped" && record;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Plan your week</h2>
            <p className="mt-0.5 text-xs text-muted">{range.label}</p>
            {draftFromRecord.theme && (
              <p className="mt-1.5 text-sm text-accent">✦ {draftFromRecord.theme}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => openPlanning()}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            {shaped ? "Re-plan" : "Plan week"}
          </button>
        </div>

        {declined && !shaped && (
          <p className="mt-2 text-xs text-muted">
            You deferred planning — tap when you&apos;re ready.
          </p>
        )}

        {deadlines.length > 0 && (
          <div className="mt-3 rounded-lg bg-canvas px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Deadlines this week</p>
            <ul className="mt-1 space-y-0.5">
              {deadlines.slice(0, 3).map(({ task, label }) => (
                <li key={task.id} className="flex items-center gap-2 text-xs">
                  <span className={label?.tone === "danger" ? "text-danger" : "text-muted"}>
                    {label?.text}
                  </span>
                  <span className="truncate text-ink">{task.title}</span>
                </li>
              ))}
              {deadlines.length > 3 && (
                <li className="text-faint">+{deadlines.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-px bg-line px-px py-px">
        {slots.map((slot) => {
          const entry = draftFromRecord.days[slot.dateKey];
          return (
            <button
              key={slot.dateKey}
              type="button"
              onClick={() => openPlanning({ initialStep: shaped ? 3 : 2 })}
              className={[
                "flex flex-col items-center bg-surface px-0.5 py-2 text-center transition-colors hover:bg-canvas",
                slot.isToday ? "ring-1 ring-inset ring-accent/30" : "",
              ].join(" ")}
            >
              <span className="text-[9px] font-medium uppercase text-faint">{slot.weekday.slice(0, 3)}</span>
              <span className="text-xs font-semibold tabular-nums text-ink">{slot.dayNum}</span>
              <span
                className={[
                  "mt-0.5 line-clamp-2 w-full text-[9px] leading-tight",
                  entry?.focus ? "font-medium text-accent" : "text-faint",
                ].join(" ")}
              >
                {focusShortLabel(entry?.focus ?? null)}
              </span>
            </button>
          );
        })}
      </div>

      {shaped ? (
        <div className="border-t border-line px-4 py-2.5">
          <p className="text-xs text-muted">
            Week locked · {record.summary.focusDays} mode day{record.summary.focusDays !== 1 ? "s" : ""}
            {record.approvedTaskIds.length > 0
              ? ` · ${record.approvedTaskIds.length} tasks approved`
              : ""}
          </p>
        </div>
      ) : (
        <div className="border-t border-line px-4 py-2.5">
          <p className="text-xs text-muted">
            Approve work → place modes on days → lock with week overview.
          </p>
        </div>
      )}
    </div>
  );
}
