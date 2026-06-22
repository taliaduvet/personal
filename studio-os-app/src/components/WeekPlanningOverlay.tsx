"use client";

import { useEffect, useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { PROJECTS, WORK_MODES } from "@/lib/sample-data";
import { lifeAreaColor } from "@/lib/lenses";
import { weekRange } from "@/lib/week";
import { carriedForPlanning } from "@/lib/week-planning";
import type { Task } from "@/lib/types";
import {
  commitmentBarFill,
  commitmentCellLabel,
  computeWeekCommitments,
} from "@/lib/calendar/commitment";
import { useWeekCalendarEvents } from "@/lib/calendar/use-week-calendar";
import type { AllDayDisposition } from "@/lib/calendar/types";
import { allDayDispositionKey } from "@/lib/calendar/types";
import { useCalendarAccessToken } from "@/lib/calendar/use-calendar-access-token";
import { DayPlanningPanel } from "@/components/DayPlanningPanel";
import {
  countFocusDays,
  deadlinesInWeek,
  focusLabel,
  mergeWeekFocusDraft,
  modeWorkloads,
  type DayFocus,
  type WeekFocusDraft,
  weekDaySlots,
} from "@/lib/week-focus";

type Props = {
  open: boolean;
  onClose: () => void;
  initialDraft: WeekFocusDraft;
  onDone: (draft: WeekFocusDraft) => void;
};

export function WeekPlanningOverlay({ open, onClose, initialDraft, onDone }: Props) {
  const { tasks } = useTasks();
  const { weekStartsOn } = useSettings();
  const { token: accessToken } = useCalendarAccessToken();
  const [draft, setDraft] = useState(initialDraft);
  const [refTab, setRefTab] = useState<"mode" | "project">("mode");
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const range = useMemo(() => weekRange(weekStartsOn, 0), [weekStartsOn]);
  const deadlines = useMemo(() => deadlinesInWeek(tasks, weekStartsOn), [tasks, weekStartsOn]);
  const workloads = useMemo(() => modeWorkloads(tasks, weekStartsOn), [tasks, weekStartsOn]);
  const carried = useMemo(() => carriedForPlanning(tasks, weekStartsOn), [tasks, weekStartsOn]);

  const weekStartKey = slots[0]?.dateKey ?? "";
  const weekEndKey = slots[slots.length - 1]?.dateKey ?? "";

  const calendar = useWeekCalendarEvents(accessToken, weekStartKey, weekEndKey, open);

  const dateKeys = useMemo(() => slots.map((s) => s.dateKey), [slots]);
  const dispositions = draft.allDayDispositions ?? {};

  const commitments = useMemo(
    () => computeWeekCommitments(dateKeys, calendar.events, dispositions),
    [dateKeys, calendar.events, dispositions]
  );

  const commitmentsByDay = useMemo(() => {
    const map: Record<string, (typeof commitments)[0]> = {};
    for (const c of commitments) map[c.dateKey] = c;
    return map;
  }, [commitments]);

  useEffect(() => {
    if (open) {
      setDraft(mergeWeekFocusDraft(initialDraft, slots));
      setActiveDay(null);
    }
  }, [open, initialDraft, slots]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const setDayFocus = (dateKey: string, focus: DayFocus | null) => {
    setDraft((d) => ({
      ...d,
      days: {
        ...d.days,
        [dateKey]: { ...d.days[dateKey], focus, note: d.days[dateKey]?.note ?? "" },
      },
    }));
  };

  const setDayNote = (dateKey: string, note: string) => {
    setDraft((d) => ({
      ...d,
      days: {
        ...d.days,
        [dateKey]: { ...d.days[dateKey], focus: d.days[dateKey]?.focus ?? null, note },
      },
    }));
  };

  const setAllDayDisposition = (dateKey: string, eventId: string, value: AllDayDisposition) => {
    const key = allDayDispositionKey(dateKey, eventId);
    setDraft((d) => ({
      ...d,
      allDayDispositions: { ...(d.allDayDispositions ?? {}), [key]: value },
    }));
  };

  const activeSlot = activeDay ? slots.find((s) => s.dateKey === activeDay) : null;
  const activeEntry = activeDay ? draft.days[activeDay] : null;
  const activeCommitment = activeDay ? commitmentsByDay[activeDay] : null;

  const panelProps =
    activeSlot && activeEntry && activeCommitment
      ? {
          slot: activeSlot,
          entry: activeEntry,
          commitment: activeCommitment,
          calendarLoading: calendar.loading,
          calendarError: calendar.error,
          calendarConnected: calendar.connected,
          allDayDispositions: dispositions,
          tasks,
          weekStartsOn,
          onFocus: (focus: DayFocus | null) => setDayFocus(activeSlot.dateKey, focus),
          onNote: (note: string) => setDayNote(activeSlot.dateKey, note),
          onAllDayDisposition: setAllDayDisposition,
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Plan your week</h2>
          <p className="text-xs text-muted">{range.label}</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-medium text-muted hover:text-ink">
          Close
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-5 pb-28 lg:pb-5">
            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Week at a glance</h3>
              <p className="mt-1 text-sm text-muted">
                Pick a mode per day — tap a day to see calendar load and set focus. Task dates stay flexible.
              </p>

              {deadlines.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {deadlines.map(({ task, label }) => (
                    <li key={task.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={[
                          "shrink-0 text-xs font-medium",
                          label?.tone === "danger" ? "text-danger" : "text-muted",
                        ].join(" ")}
                      >
                        {label?.text}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink">{task.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-faint">No hard deadlines this week.</p>
              )}

              {workloads.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {workloads.map((w) => (
                    <span
                      key={w.modeId}
                      className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted"
                    >
                      {w.name} · {w.count}
                    </span>
                  ))}
                </div>
              )}

              {carried.length > 0 && (
                <p className="mt-3 text-xs text-muted">
                  {carried.length} carried task{carried.length !== 1 ? "s" : ""} — give admin or catch-up days room.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Week theme</h3>
              <p className="mt-1 text-sm text-muted">One sentence — shows on Today all week.</p>
              <input
                type="text"
                value={draft.theme ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, theme: e.target.value || null }))}
                placeholder="e.g. Ship the EP mix · Admin catch-up · Rest and reset"
                className="mt-3 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                maxLength={120}
              />
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Shape your days</h3>
              <p className="mt-1 text-sm text-muted">
                Tap a day for calendar load + focus. Bars show timed commitments on your calendar.
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {slots.map((slot) => {
                  const entry = draft.days[slot.dateKey];
                  const commitment = commitmentsByDay[slot.dateKey];
                  const selected = activeDay === slot.dateKey;
                  const cellLabel = commitment ? commitmentCellLabel(commitment) : null;
                  const barFill = commitment
                    ? commitment.blocked
                      ? 1
                      : commitmentBarFill(commitment.timedHours)
                    : 0;

                  return (
                    <button
                      key={slot.dateKey}
                      type="button"
                      onClick={() => setActiveDay(slot.dateKey)}
                      className={[
                        "flex flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors",
                        selected
                          ? "border-accent bg-accent-soft"
                          : slot.isToday
                            ? "border-accent/40 bg-surface hover:border-accent"
                            : "border-border bg-surface hover:border-accent/50",
                        commitment?.blocked ? "ring-1 ring-[#bc6740]/40" : "",
                      ].join(" ")}
                    >
                      <span className="text-[10px] font-medium uppercase text-faint">{slot.weekday}</span>
                      <span className="font-display text-sm font-semibold text-ink">{slot.dayNum}</span>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className={[
                            "h-full rounded-full transition-all",
                            commitment?.blocked ? "bg-[#bc6740]" : "bg-accent",
                          ].join(" ")}
                          style={{ width: `${barFill * 100}%` }}
                        />
                      </div>
                      {cellLabel && (
                        <span
                          className={[
                            "mt-1 line-clamp-1 w-full text-[9px] font-medium leading-tight",
                            commitment?.blocked ? "text-[#bc6740]" : "text-muted",
                          ].join(" ")}
                        >
                          {cellLabel}
                        </span>
                      )}
                      <span
                        className={[
                          "mt-0.5 line-clamp-2 w-full text-[10px] leading-tight",
                          entry?.focus ? "font-medium text-accent" : "text-faint",
                        ].join(" ")}
                      >
                        {entry?.focus ? focusLabel(entry.focus) : "Open"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!activeDay && (
                <p className="mt-3 text-center text-xs text-muted">Tap a day to open the planning panel →</p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Task reference</h3>
                <div className="flex rounded-lg border border-border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setRefTab("mode")}
                    className={[
                      "rounded-md px-2 py-0.5 font-medium",
                      refTab === "mode" ? "bg-accent-soft text-accent" : "text-muted",
                    ].join(" ")}
                  >
                    By mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefTab("project")}
                    className={[
                      "rounded-md px-2 py-0.5 font-medium",
                      refTab === "project" ? "bg-accent-soft text-accent" : "text-muted",
                    ].join(" ")}
                  >
                    By project
                  </button>
                </div>
              </div>
              <ReferenceBoard tasks={tasks} tab={refTab} />
            </section>
          </div>
        </div>

        {panelProps && (
          <aside className="hidden w-[280px] shrink-0 border-l border-border bg-surface lg:flex lg:flex-col">
            <DayPlanningPanel {...panelProps} />
          </aside>
        )}
      </div>

      {panelProps && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-[60] max-h-[min(52dvh,calc(100dvh-8rem))] overflow-hidden border-t border-border bg-surface shadow-lg pb-safe lg:hidden">
          <DayPlanningPanel {...panelProps} onClose={() => setActiveDay(null)} />
        </div>
      )}

      <footer className="shrink-0 border-t border-border bg-surface px-4 py-3 pb-safe">
        <button
          type="button"
          onClick={() => onDone(draft)}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Done planning · {countFocusDays(draft)} day{countFocusDays(draft) !== 1 ? "s" : ""} shaped
        </button>
      </footer>
    </div>
  );
}

function ReferenceBoard({
  tasks,
  tab,
}: {
  tasks: Task[];
  tab: "mode" | "project";
}) {
  const active = tasks.filter((t) => t.status !== "done");

  if (tab === "mode") {
    return (
      <div className="mt-3 space-y-3">
        {WORK_MODES.map((mode) => {
          const items = active.filter((t) => t.workModeId === mode.id);
          if (items.length === 0) return null;
          return (
            <RefColumn key={mode.id} title={mode.name} count={items.length}>
              {items.slice(0, 6).map((t) => (
                <RefTask key={t.id} task={t} />
              ))}
              {items.length > 6 && (
                <p className="text-xs text-faint">+{items.length - 6} more</p>
              )}
            </RefColumn>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {PROJECTS.map((proj) => {
        const items = active.filter((t) => t.projectId === proj.id);
        if (items.length === 0) return null;
        return (
          <RefColumn key={proj.id} title={proj.name} count={items.length}>
            {items.slice(0, 6).map((t) => (
              <RefTask key={t.id} task={t} />
            ))}
          </RefColumn>
        );
      })}
    </div>
  );
}

function RefColumn({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">
        {title} <span className="text-faint">({count})</span>
      </p>
      <ul className="mt-1 space-y-0.5">{children}</ul>
    </div>
  );
}

function RefTask({ task }: { task: Task }) {
  const accent = lifeAreaColor(task.lifeAreaId);
  return (
    <li className="flex items-center gap-2 text-sm text-ink">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
      <span className="truncate">{task.title}</span>
    </li>
  );
}
