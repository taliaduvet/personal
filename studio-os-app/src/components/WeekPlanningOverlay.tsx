"use client";

import { useEffect, useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { weekRange } from "@/lib/week";
import { carriedForPlanning } from "@/lib/week-planning";
import {
  carryOver,
  lifeBalanceWeek,
  shippedThisWeek,
} from "@/lib/weekly-review";
import {
  deadlineLabel,
  lifeAreaColor,
  lifeAreaName,
  workModeName,
} from "@/lib/lenses";
import type { Task } from "@/lib/types";
import {
  countFocusDays,
  focusLabel,
  mergeWeekFocusDraft,
  type DayFocus,
  type WeekDaySlot,
  type WeekFocusDraft,
  weekDaySlots,
} from "@/lib/week-focus";
import {
  deadlineDotsByDay,
  modeLoadFromApproved,
  partitionAreaTasks,
  tasksForLifeArea,
  tasksGroupedByMode,
  trustCheckLines,
} from "@/lib/week-planning-approve";

const WIZARD_STEPS = [
  { n: 1, label: "Receipt" },
  { n: 2, label: "Approve" },
  { n: 3, label: "Place modes" },
  { n: 4, label: "Lock" },
] as const;

type WizardStep = 1 | 2 | 3 | 4;

type Props = {
  open: boolean;
  onClose: () => void;
  initialDraft: WeekFocusDraft;
  initialStep?: WizardStep;
  intentionReminder?: string;
  onDone: (draft: WeekFocusDraft) => void;
};

export function WeekPlanningOverlay({
  open,
  onClose,
  initialDraft,
  initialStep = 1,
  intentionReminder,
  onDone,
}: Props) {
  const { tasks } = useTasks();
  const { weekStartsOn, lifeAreas } = useSettings();
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [draft, setDraft] = useState(initialDraft);
  const [stampingModeId, setStampingModeId] = useState<string | null>(null);

  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const range = useMemo(() => weekRange(weekStartsOn, 0), [weekStartsOn]);

  useEffect(() => {
    if (open) {
      setDraft(mergeWeekFocusDraft(initialDraft, slots));
      setStep(initialStep);
      setStampingModeId(null);
    }
  }, [open, initialDraft, slots, initialStep]);

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

  const modeLoads = useMemo(
    () => modeLoadFromApproved(tasks, draft.approvedTaskIds),
    [tasks, draft.approvedTaskIds]
  );
  const groupedApproved = useMemo(
    () => tasksGroupedByMode(tasks, draft.approvedTaskIds),
    [tasks, draft.approvedTaskIds]
  );
  const trustLines = useMemo(
    () => trustCheckLines(tasks, draft.approvedTaskIds, draft, slots, weekStartsOn),
    [tasks, draft.approvedTaskIds, draft, slots, weekStartsOn]
  );
  const deadlineDots = useMemo(
    () => deadlineDotsByDay(tasks, draft.approvedTaskIds, slots),
    [tasks, draft.approvedTaskIds, slots]
  );

  if (!open) return null;

  const toggleApproved = (taskId: string) => {
    setDraft((d) => {
      const has = d.approvedTaskIds.includes(taskId);
      return {
        ...d,
        approvedTaskIds: has
          ? d.approvedTaskIds.filter((id) => id !== taskId)
          : [...d.approvedTaskIds, taskId],
      };
    });
  };

  const stampModeOnDay = (dateKey: string, modeId: string) => {
    setDraft((d) => ({
      ...d,
      days: {
        ...d.days,
        [dateKey]: {
          focus: { kind: "mode", id: modeId },
          note: d.days[dateKey]?.note ?? "",
        },
      },
    }));
  };

  const clearDayMode = (dateKey: string) => {
    setDraft((d) => ({
      ...d,
      days: {
        ...d.days,
        [dateKey]: { focus: null, note: d.days[dateKey]?.note ?? "" },
      },
    }));
  };

  const handleDayClick = (slot: WeekDaySlot) => {
    if (slot.offset < 0) return;
    if (stampingModeId) {
      stampModeOnDay(slot.dateKey, stampingModeId);
      return;
    }
    const entry = draft.days[slot.dateKey];
    if (entry?.focus) clearDayMode(slot.dateKey);
  };

  const focusDayCount = countFocusDays(draft);
  const approvedCount = draft.approvedTaskIds.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="shrink-0 border-b border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Plan your week</h2>
            <p className="text-xs text-muted">
              {range.label} · step {step} of 4
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-muted hover:text-ink">
            Close
          </button>
        </div>
        <WizardNav current={step} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-28">
          {step === 1 && (
            <ReceiptStep tasks={tasks} weekStartsOn={weekStartsOn} lifeAreas={lifeAreas} />
          )}
          {step === 2 && (
            <ApproveStep
              tasks={tasks}
              lifeAreas={lifeAreas}
              weekStartsOn={weekStartsOn}
              approvedIds={draft.approvedTaskIds}
              onToggle={toggleApproved}
            />
          )}
          {step === 3 && (
            <PlaceStep
              draft={draft}
              setDraft={setDraft}
              groupedApproved={groupedApproved}
              modeLoads={modeLoads}
              slots={slots}
              stampingModeId={stampingModeId}
              onStampingModeChange={setStampingModeId}
              onDayClick={handleDayClick}
              onClearDay={clearDayMode}
              deadlineDots={deadlineDots}
              trustLines={trustLines}
              intentionReminder={intentionReminder}
            />
          )}
          {step === 4 && (
            <LockStep
              draft={draft}
              setDraft={setDraft}
              slots={slots}
              approvedCount={approvedCount}
              focusDayCount={focusDayCount}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface px-4 py-3 pb-safe">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={step === 2 && approvedCount === 0}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {step === 1 ? "Approve work →" : step === 2 ? "Place modes →" : "Review & lock →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDone(draft)}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Done planning
            </button>
          )}
        </div>
        {step === 2 && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted">
            <strong className="text-ink">{approvedCount}</strong> task{approvedCount !== 1 ? "s" : ""} approved for
            this week
          </p>
        )}
      </footer>
    </div>
  );
}

function WizardNav({ current }: { current: WizardStep }) {
  return (
    <div className="mx-auto mt-3 flex max-w-3xl flex-wrap gap-2">
      {WIZARD_STEPS.map((s) => (
        <span
          key={s.n}
          className={[
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            s.n === current ? "bg-accent text-white" : s.n < current ? "bg-accent-soft text-accent" : "text-faint",
          ].join(" ")}
        >
          {s.n} · {s.label}
        </span>
      ))}
    </div>
  );
}

function ReceiptStep({
  tasks,
  weekStartsOn,
  lifeAreas,
}: {
  tasks: Task[];
  weekStartsOn: import("@/lib/week").WeekStartDay;
  lifeAreas: { id: string; name: string; color: string }[];
}) {
  const shipped = useMemo(() => shippedThisWeek(tasks, weekStartsOn, -1), [tasks, weekStartsOn]);
  const carried = useMemo(() => carryOver(tasks, weekStartsOn, 0), [tasks, weekStartsOn]);
  const balance = useMemo(() => lifeBalanceWeek(tasks, weekStartsOn, -1), [tasks, weekStartsOn]);
  const maxBalance = balance.reduce((m, r) => Math.max(m, r.shipped + r.active), 0) || 1;

  return (
    <>
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Last week · proof</h3>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{shipped.length}</p>
        <p className="text-sm text-muted">tasks shipped</p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Carried into this week</h3>
        {carried.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {carried.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm text-ink">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: lifeAreaColor(t.lifeAreaId) }} />
                <span className="truncate">{t.title}</span>
              </li>
            ))}
            {carried.length > 6 && <li className="text-xs text-faint">+{carried.length - 6} more</li>}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nothing carried — clean slate.</p>
        )}
      </section>

      {balance.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Life balance mirror</h3>
          <p className="mt-1 text-xs text-muted">Reflective only — which areas were loud or quiet last week.</p>
          <div className="mt-3 space-y-2">
            {balance.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-sm text-muted">{r.name}</span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-l-full"
                    style={{ width: `${(r.shipped / maxBalance) * 100}%`, background: r.color }}
                  />
                  <div
                    className="h-full opacity-40"
                    style={{ width: `${(r.active / maxBalance) * 100}%`, background: r.color }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-[10px] text-faint">
                  {r.shipped}↑ {r.active}→
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-dashed border-border bg-canvas/50 p-4 text-sm text-muted">
        <p>
          Sweep every life area on the next step. Check what you&apos;re committing to this week — in progress first,
          open sorted by due date.
        </p>
        {lifeAreas.length > 0 && (
          <p className="mt-2 text-xs text-faint">{lifeAreas.length} life areas in your studio</p>
        )}
      </section>
    </>
  );
}

function ApproveStep({
  tasks,
  lifeAreas,
  weekStartsOn,
  approvedIds,
  onToggle,
}: {
  tasks: Task[];
  lifeAreas: { id: string; name: string; color: string }[];
  weekStartsOn: import("@/lib/week").WeekStartDay;
  approvedIds: string[];
  onToggle: (id: string) => void;
}) {
  const approved = new Set(approvedIds);

  return (
    <>
      <p className="text-sm text-muted">
        What needs to happen this week? Check tasks you&apos;re committing to — unchecked tasks stay visible but
        won&apos;t drive mode load.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {lifeAreas.map((area) => {
          const areaTasks = tasksForLifeArea(tasks, area.id);
          const { inProgress, open } = partitionAreaTasks(areaTasks, weekStartsOn);
          if (areaTasks.length === 0) {
            return (
              <LifeAreaCard key={area.id} name={area.name} color={area.color} openCount={0}>
                <p className="text-xs text-faint italic">No open tasks</p>
              </LifeAreaCard>
            );
          }
          return (
            <LifeAreaCard key={area.id} name={area.name} color={area.color} openCount={areaTasks.length}>
              {inProgress.length > 0 && (
                <TaskSection label="In progress">
                  {inProgress.map((t) => (
                    <ApproveRow key={t.id} task={t} approved={approved.has(t.id)} onToggle={onToggle} />
                  ))}
                </TaskSection>
              )}
              {open.length > 0 && (
                <TaskSection label="Open · nearest due first">
                  {open.map((t) => (
                    <ApproveRow key={t.id} task={t} approved={approved.has(t.id)} onToggle={onToggle} />
                  ))}
                </TaskSection>
              )}
            </LifeAreaCard>
          );
        })}
      </div>
    </>
  );
}

function LifeAreaCard({
  name,
  color,
  openCount,
  children,
}: {
  name: string;
  color: string;
  openCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="font-medium text-ink">{name}</span>
        <span className="text-xs text-muted">{openCount} open</span>
      </div>
      <div className="mt-3 space-y-3 border-t border-line pt-3">{children}</div>
    </div>
  );
}

function TaskSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</p>
      <ul className="mt-1.5 space-y-1">{children}</ul>
    </div>
  );
}

function ApproveRow({
  task,
  approved,
  onToggle,
}: {
  task: Task;
  approved: boolean;
  onToggle: (id: string) => void;
}) {
  const dl = deadlineLabel(task.deadlineInDays);
  return (
    <li className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={approved}
        onChange={() => onToggle(task.id)}
        className="mt-0.5 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <span className="text-ink">{task.title}</span>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          {task.workModeId && (
            <span className="rounded-full border border-border px-1.5 py-0.5">{workModeName(task.workModeId)}</span>
          )}
          {dl && (
            <span className={dl.tone === "danger" ? "font-medium text-danger" : ""}>{dl.text}</span>
          )}
          {!dl && <span className="text-faint">no date</span>}
        </div>
      </div>
    </li>
  );
}

function PlaceStep({
  draft,
  setDraft,
  groupedApproved,
  modeLoads,
  slots,
  stampingModeId,
  onStampingModeChange,
  onDayClick,
  onClearDay,
  deadlineDots,
  trustLines,
  intentionReminder,
}: {
  draft: WeekFocusDraft;
  setDraft: React.Dispatch<React.SetStateAction<WeekFocusDraft>>;
  groupedApproved: ReturnType<typeof tasksGroupedByMode>;
  modeLoads: ReturnType<typeof modeLoadFromApproved>;
  slots: WeekDaySlot[];
  stampingModeId: string | null;
  onStampingModeChange: (id: string | null) => void;
  onDayClick: (slot: WeekDaySlot) => void;
  onClearDay: (dateKey: string) => void;
  deadlineDots: Record<string, number>;
  trustLines: ReturnType<typeof trustCheckLines>;
  intentionReminder?: string;
}) {
  return (
    <>
      {groupedApproved.length > 0 && (
        <section className="rounded-xl border border-border bg-canvas/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
            This week&apos;s work · approved only
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {groupedApproved.map((g) => (
              <div key={g.modeId}>
                <p className="text-sm font-semibold text-ink">
                  {g.name} · {g.tasks.length}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted">
                  {g.tasks.slice(0, 4).map((t) => {
                    const dl = deadlineLabel(t.deadlineInDays);
                    return (
                      <li key={t.id} className="truncate">
                        {t.title}
                        {dl ? ` · ${dl.text}` : ""}
                      </li>
                    );
                  })}
                  {g.tasks.length > 4 && <li className="text-faint">+{g.tasks.length - 4} more</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Intention</h3>
        {intentionReminder && (
          <p className="mt-2 text-xs text-muted italic">
            Last week you wrote: &ldquo;{intentionReminder}&rdquo;
          </p>
        )}
        <input
          type="text"
          value={draft.intention ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, intention: e.target.value || null }))}
          placeholder="What matters this week? (tie-breaker when load > week)"
          className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          maxLength={160}
        />
      </section>

      {modeLoads.length > 0 ? (
        <section className="rounded-xl border-2 border-dashed border-accent/40 bg-accent-soft/10 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Mode load · tap then tap a day</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {modeLoads.map((m) => (
              <button
                key={m.modeId}
                type="button"
                onClick={() => onStampingModeChange(stampingModeId === m.modeId ? null : m.modeId)}
                className={[
                  "rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                  stampingModeId === m.modeId
                    ? "border-accent bg-accent text-white shadow-md"
                    : "border-border bg-surface text-ink hover:border-accent/60",
                ].join(" ")}
              >
                {m.name} · {m.count}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Days start open · tap a mode pill, then tap days on the strip · tap × on a day to clear
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted">No approved tasks with modes — you can still set an all-open week.</p>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Week strip</h3>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {slots.map((slot) => {
            const entry = draft.days[slot.dateKey];
            const focus = entry?.focus ?? null;
            const isPast = slot.offset < 0;
            const dots = deadlineDots[slot.dateKey] ?? 0;
            return (
              <div key={slot.dateKey} className="relative flex flex-col">
                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => onDayClick(slot)}
                  className={[
                    "flex flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors",
                    isPast
                      ? "cursor-default border-border/60 bg-canvas/50 opacity-70"
                      : stampingModeId
                        ? "border-accent/50 bg-surface hover:border-accent"
                        : slot.isToday
                          ? "border-accent/40 bg-surface hover:border-accent"
                          : "border-border bg-surface hover:border-accent/50",
                    focus ? "ring-1 ring-accent/30" : "",
                  ].join(" ")}
                >
                  <span className="text-[10px] font-medium uppercase text-faint">{slot.weekday}</span>
                  <span className="font-display text-sm font-semibold text-ink">{slot.dayNum}</span>
                  {dots > 0 && (
                    <span className="mt-0.5 text-[9px] font-medium text-danger">
                      {"●".repeat(Math.min(dots, 3))}
                    </span>
                  )}
                  <span
                    className={[
                      "mt-0.5 line-clamp-2 w-full text-[10px] leading-tight",
                      focus ? "font-medium text-accent" : "text-faint",
                    ].join(" ")}
                  >
                    {focusLabel(focus)}
                  </span>
                </button>
                {!isPast && focus && (
                  <button
                    type="button"
                    onClick={() => onClearDay(slot.dateKey)}
                    className="mt-0.5 text-[9px] text-muted hover:text-danger"
                    aria-label="Clear mode"
                  >
                    × clear
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {slots.some((s) => s.offset < 0) && (
          <p className="mt-2 text-xs text-faint">Past days are read-only from your log.</p>
        )}
      </section>

      {trustLines.length > 0 && (
        <section className="rounded-lg border border-border bg-canvas/40 px-4 py-3 text-xs">
          <h3 className="font-semibold uppercase tracking-wide text-faint">Trust check</h3>
          <ul className="mt-2 space-y-1 text-muted">
            {trustLines.map((line, i) => (
              <li key={i} className={line.ok ? "text-ink" : ""}>
                {line.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function LockStep({
  draft,
  setDraft,
  slots,
  approvedCount,
  focusDayCount,
}: {
  draft: WeekFocusDraft;
  setDraft: React.Dispatch<React.SetStateAction<WeekFocusDraft>>;
  slots: WeekDaySlot[];
  approvedCount: number;
  focusDayCount: number;
}) {
  return (
    <>
      <section className="rounded-xl border-2 border-accent/30 bg-surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Your week · overview</h3>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {slots.map((slot) => {
            const focus = draft.days[slot.dateKey]?.focus ?? null;
            return (
              <div key={slot.dateKey} className="rounded-lg border border-border bg-canvas/30 px-1 py-2 text-center">
                <p className="text-[9px] font-semibold uppercase text-faint">
                  {slot.weekday.slice(0, 3)} {slot.dayNum}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-accent">{focusLabel(focus)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted">
          <strong className="text-ink">{approvedCount}</strong> tasks this week ·{" "}
          <strong className="text-ink">{focusDayCount}</strong> mode focus day{focusDayCount !== 1 ? "s" : ""}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Week theme</h3>
        <p className="mt-1 text-xs text-muted">Shows on Today all week.</p>
        <input
          type="text"
          value={draft.theme ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, theme: e.target.value || null }))}
          placeholder="e.g. Ship the mix — admin catch-up Thursday"
          className="mt-3 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          maxLength={120}
        />
        {draft.intention && (
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, theme: d.intention }))}
            className="mt-2 rounded-lg border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            Use intention as theme
          </button>
        )}
      </section>

      {draft.intention && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Intention</h3>
          <p className="mt-2 text-sm italic text-muted">{draft.intention}</p>
        </section>
      )}
    </>
  );
}
