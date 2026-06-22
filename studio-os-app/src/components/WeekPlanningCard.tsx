"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekKey, weekRange } from "@/lib/week";
import { computeWeekPlanningSummary, weekPlanningMode } from "@/lib/week-planning";
import {
  countFocusDays,
  deadlinesInWeek,
  focusShortLabel,
  mergeWeekFocusDraft,
  weekDaySlots,
  type WeekFocusDraft,
} from "@/lib/week-focus";
import { WeekPlanningOverlay } from "@/components/WeekPlanningOverlay";

export function WeekPlanningCard() {
  const { tasks } = useTasks();
  const { weekStartsOn, weekPlanning, completeWeekPlanning } = useSettings();
  const [overlayOpen, setOverlayOpen] = useState(false);

  const weekKeyNow = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const range = useMemo(() => weekRange(weekStartsOn, 0), [weekStartsOn]);
  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const record = weekPlanning[weekKeyNow];
  const mode = useMemo(
    () => weekPlanningMode(tasks, weekStartsOn, weekPlanning),
    [tasks, weekStartsOn, weekPlanning]
  );
  const deadlines = useMemo(() => deadlinesInWeek(tasks, weekStartsOn), [tasks, weekStartsOn]);

  const draftFromRecord: WeekFocusDraft = useMemo(
    () =>
      mergeWeekFocusDraft(
        record ? { theme: record.theme, days: record.days, allDayDispositions: record.allDayDispositions } : undefined,
        slots
      ),
    [record, slots]
  );

  const handleDone = (draft: WeekFocusDraft) => {
    completeWeekPlanning(
      weekKeyNow,
      computeWeekPlanningSummary(tasks, weekStartsOn, countFocusDays(draft)),
      draft
    );
    setOverlayOpen(false);
  };

  const shaped = mode === "shaped" && record;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
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
              onClick={() => setOverlayOpen(true)}
              className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {shaped ? "Re-plan" : "Plan week"}
            </button>
          </div>

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

        {/* Compact week strip */}
        <div className="grid grid-cols-7 gap-px bg-line px-px py-px">
          {slots.map((slot) => {
            const entry = draftFromRecord.days[slot.dateKey];
            return (
              <button
                key={slot.dateKey}
                type="button"
                onClick={() => setOverlayOpen(true)}
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

        {shaped && (
          <div className="border-t border-line px-4 py-2.5">
            <p className="text-xs text-muted">
              Week shaped · {record.summary.focusDays} focus day
              {record.summary.focusDays !== 1 ? "s" : ""}
              {record.summary.stillOpen > 0 ? ` · ${record.summary.stillOpen} open in bucket` : ""}
            </p>
          </div>
        )}

        {!shaped && (
          <div className="border-t border-line px-4 py-2.5">
            <p className="text-xs text-muted">
              Pick a work mode for each day — Admin, Creative, Outreach. Projects can override when you need a push.
            </p>
          </div>
        )}
      </div>

      <WeekPlanningOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        initialDraft={draftFromRecord}
        onDone={handleDone}
      />
    </>
  );
}
