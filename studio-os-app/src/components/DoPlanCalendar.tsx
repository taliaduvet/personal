"use client";

import { useMemo, useState } from "react";
import type { DoPlan } from "@/lib/types";
import type { WeekStartDay } from "@/lib/week";
import { buildMonthWeeks, dayPlan, weekPlan } from "@/lib/do-plan";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function weekdayHeaders(weekStartsOn: WeekStartDay): string[] {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS[(weekStartsOn + i) % 7]);
}

export function DoPlanCalendar({
  value,
  onChange,
  weekStartsOn,
  showWeekGutter = true,
  showSomeday = true,
}: {
  value: DoPlan;
  onChange: (plan: DoPlan) => void;
  weekStartsOn: WeekStartDay;
  /** Doing = true; deadline picker hides week gutter + someday. */
  showWeekGutter?: boolean;
  showSomeday?: boolean;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const rows = useMemo(
    () => buildMonthWeeks(viewYear, viewMonth, weekStartsOn),
    [viewYear, viewMonth, weekStartsOn]
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const headers = weekdayHeaders(weekStartsOn);
  const colClass = showWeekGutter
    ? "grid grid-cols-[2rem_repeat(7,1fr)] gap-0.5 px-0.5"
    : "grid grid-cols-7 gap-0.5 px-0.5";

  return (
    <div className="rounded-xl border border-border bg-surface p-2 shadow-sm">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="text-sm font-medium text-ink">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className={colClass}>
        {showWeekGutter && <div />}
        {headers.map((h, i) => (
          <div key={i} className="py-1 text-center text-[10px] font-semibold uppercase text-faint">
            {h}
          </div>
        ))}

        {rows.map((row) => {
          const weekSelected = value?.kind === "week" && value.weekStart === row.weekStart;
          return (
            <div key={row.weekStart} className="contents">
              {showWeekGutter && (
                <button
                  type="button"
                  title="Plan for this week"
                  onClick={() => onChange(weekPlan(row.weekStart))}
                  className={[
                    "my-0.5 flex h-full min-h-[2rem] items-center justify-center rounded-lg border text-[10px] font-semibold transition-colors",
                    weekSelected
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-faint hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  Wk
                </button>
              )}
              {row.days.map((cell) => {
                if (!cell) return null;
                const selected = value?.kind === "day" && value.offset === cell.offset;
                const isToday = cell.offset === 0;
                return (
                  <button
                    key={cell.offset}
                    type="button"
                    disabled={!cell.inMonth}
                    onClick={() => onChange(dayPlan(cell.offset))}
                    className={[
                      "my-0.5 aspect-square rounded-lg text-xs transition-colors",
                      !cell.inMonth && "invisible",
                      selected
                        ? "bg-accent font-medium text-white"
                        : isToday
                          ? "border border-accent/40 font-medium text-accent hover:bg-accent-soft"
                          : "text-muted hover:bg-canvas hover:text-ink",
                    ].join(" ")}
                  >
                    {cell.date}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {showSomeday && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={[
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              value === null
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            Someday
          </button>
        )}
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink",
              !showSomeday && "flex-1",
            ].join(" ")}
          >
            {showSomeday ? "Clear" : "None"}
          </button>
        )}
      </div>

      {showWeekGutter && (
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          Tap a day for a specific plan, or <span className="font-medium">Wk</span> for the whole week.
        </p>
      )}
    </div>
  );
}

/** Deadline picker — specific days only. */
export function DeadlineCalendar({
  deadlineInDays,
  onChange,
  weekStartsOn,
}: {
  deadlineInDays: number | null;
  onChange: (offset: number | null) => void;
  weekStartsOn: WeekStartDay;
}) {
  const plan: DoPlan =
    deadlineInDays !== null ? { kind: "day", offset: deadlineInDays } : null;

  return (
    <DoPlanCalendar
      value={plan}
      weekStartsOn={weekStartsOn}
      showWeekGutter={false}
      showSomeday={false}
      onChange={(p) => {
        if (p === null) onChange(null);
        else if (p.kind === "day") onChange(p.offset);
      }}
    />
  );
}
