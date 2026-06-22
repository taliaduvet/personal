"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { doPlanSortKey } from "@/lib/do-plan";
import { weekKey } from "@/lib/week";
import {
  focusLabel,
  mergeWeekFocusDraft,
  partitionInTodayByFocus,
  tasksForDayFocus,
  todayFocusEntry,
  weekDaySlots,
} from "@/lib/week-focus";
import { TaskCard } from "@/components/TaskCard";
import type { Task } from "@/lib/types";

export function TodayView() {
  const { tasks: all, completeTask, sendToToday } = useTasks();
  const { weekStartsOn, weekPlanning } = useSettings();

  const weekKeyNow = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const record = weekPlanning[weekKeyNow];
  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const weekDraft = useMemo(
    () => mergeWeekFocusDraft(record ? { theme: record.theme, days: record.days } : undefined, slots),
    [record, slots]
  );
  const todayFocus = useMemo(() => todayFocusEntry(weekDraft, weekStartsOn), [weekDraft, weekStartsOn]);

  const { inFocus, outsideFocus } = useMemo(
    () => partitionInTodayByFocus(all, todayFocus.focus),
    [all, todayFocus.focus]
  );

  const sortWhen = (t: Task) => doPlanSortKey(t.doPlan, weekStartsOn) ?? t.deadlineInDays ?? 99;
  const byWhen = (a: Task, b: Task) => sortWhen(a) - sortWhen(b);

  const focusTasks = useMemo(() => [...inFocus].sort(byWhen), [inFocus, weekStartsOn]);
  const alsoToday = useMemo(() => [...outsideFocus].sort(byWhen), [outsideFocus, weekStartsOn]);

  const focusQueue = useMemo(() => {
    if (!todayFocus.focus) return [];
    return tasksForDayFocus(all, todayFocus.focus, 0, weekStartsOn)
      .filter((t) => !t.inToday)
      .sort(byWhen)
      .slice(0, 8);
  }, [all, todayFocus.focus, weekStartsOn]);

  const doneCount = useMemo(
    () => all.filter((t) => t.inToday && t.status === "done").length,
    [all]
  );

  const totalToGo = focusTasks.length + alsoToday.length;
  const hasFocus = todayFocus.focus !== null;

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Today</h1>
        <span className="text-sm text-muted">
          {doneCount > 0 ? `${doneCount} done · ` : ""}
          {totalToGo} to go
        </span>
      </div>

      {(weekDraft.theme || hasFocus) && (
        <div className="mt-2 space-y-1">
          {weekDraft.theme && <p className="text-sm text-accent">✦ {weekDraft.theme}</p>}
          {hasFocus && (
            <p className="text-sm text-muted">
              Today&apos;s focus:{" "}
              <span className="font-medium text-ink">{focusLabel(todayFocus.focus)}</span>
              {todayFocus.note ? ` — ${todayFocus.note}` : ""}
            </p>
          )}
        </div>
      )}

      {!weekDraft.theme && !hasFocus && (
        <p className="mt-1 text-muted">One thing at a time. Your curated set for the day.</p>
      )}

      {totalToGo > 0 ? (
        <div className="mt-5 space-y-6">
          {focusTasks.length > 0 && (
            <TodaySection
              title={hasFocus ? focusLabel(todayFocus.focus) : "Today"}
              subtitle={hasFocus ? "Matches your focus for the day" : undefined}
              tasks={focusTasks}
              onComplete={completeTask}
            />
          )}

          {alsoToday.length > 0 && (
            <TodaySection
              title="Also today"
              subtitle="Outside today's focus — still on your list"
              tasks={alsoToday}
              onComplete={completeTask}
              muted
            />
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            {doneCount > 0 ? "That's the lot for today." : "Nothing queued for today."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {doneCount > 0
              ? "Everything you lined up is done. Go make something."
              : hasFocus
                ? "Pull tasks from your focus queue below, or from the Lot."
                : "Pull a few tasks in from the Lot to shape your day."}
          </p>
        </div>
      )}

      {focusQueue.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
            Ready for {focusLabel(todayFocus.focus)}
          </h2>
          <p className="mt-1 text-sm text-muted">From your week plan — pull in what you want to tackle.</p>
          <ul className="mt-3 space-y-2">
            {focusQueue.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
                <button
                  type="button"
                  onClick={() => sendToToday(t.id)}
                  className="shrink-0 text-xs font-medium text-accent hover:text-accent-ink"
                >
                  → Today
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function TodaySection({
  title,
  subtitle,
  tasks,
  onComplete,
  muted,
}: {
  title: string;
  subtitle?: string;
  tasks: Task[];
  onComplete: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <section>
      <div className="mb-2">
        <h2
          className={[
            "font-display text-sm font-semibold",
            muted ? "text-muted" : "text-ink",
          ].join(" ")}
        >
          {title}
          <span className="ml-1.5 font-normal tabular-nums text-faint">{tasks.length}</span>
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className={["space-y-2", muted ? "opacity-90" : ""].join(" ")}>
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onComplete={onComplete} />
        ))}
      </div>
    </section>
  );
}
