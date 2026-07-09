"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { useWeekPlanningLauncher } from "@/components/WeekPlanningLauncher";
import { openTaskWork } from "@/lib/navigation";
import { weekKey, weekRange } from "@/lib/week";
import { weekPlanningMode } from "@/lib/week-planning";
import { formatStudioDuration, studioMsInWeek } from "@/lib/studio-time";
import {
  carryOver,
  deadlinesHit,
  inFlight,
  lifeBalanceWeek,
  projectProgressWeek,
  shippedThisWeek,
  taskMetaLine,
} from "@/lib/weekly-review";

export function WeeklyReviewView() {
  const { tasks, reviewNotes, saveReviewNotes, activityLog } = useTasks();
  const { weekStartsOn, weekPlanning, declineWeekPlanning } = useSettings();
  const { openPlanning } = useWeekPlanningLauncher();
  const [weekOffset, setWeekOffset] = useState(0);

  const range = useMemo(() => weekRange(weekStartsOn, weekOffset), [weekStartsOn, weekOffset]);
  const key = useMemo(() => weekKey(weekStartsOn, weekOffset), [weekStartsOn, weekOffset]);
  const shipped = useMemo(() => shippedThisWeek(tasks, weekStartsOn, weekOffset), [tasks, weekStartsOn, weekOffset]);
  const carried = useMemo(() => carryOver(tasks, weekStartsOn, weekOffset), [tasks, weekStartsOn, weekOffset]);
  const flying = useMemo(() => inFlight(tasks, weekStartsOn, weekOffset), [tasks, weekStartsOn, weekOffset]);
  const deadlines = useMemo(() => deadlinesHit(tasks, weekStartsOn, weekOffset), [tasks, weekStartsOn, weekOffset]);
  const balance = useMemo(() => lifeBalanceWeek(tasks, weekStartsOn, weekOffset), [tasks, weekStartsOn, weekOffset]);
  const projects = useMemo(() => projectProgressWeek(tasks, weekStartsOn, weekOffset), [tasks, weekStartsOn, weekOffset]);

  const notes = reviewNotes[key] ?? { reflection: "", intentions: "" };
  const maxBalance = balance.reduce((m, r) => Math.max(m, r.shipped + r.active), 0) || 1;

  const currentWeekKey = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const weekAlreadyPlanned = useMemo(
    () => weekPlanningMode(tasks, weekStartsOn, weekPlanning) === "shaped",
    [tasks, weekStartsOn, weekPlanning]
  );
  const showPlanHandoff = weekOffset === 0 && !weekAlreadyPlanned;

  const studioMs = useMemo(
    () => studioMsInWeek(activityLog, range.start, range.end),
    [activityLog, range.start, range.end]
  );
  const studioLabel = formatStudioDuration(studioMs);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Weekly Review</h1>
        <p className="mt-1 text-muted">Close the week — see what shipped, what carried, and what needs your attention.</p>
      </header>

      {/* Week switcher */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink"
          aria-label="Previous week"
        >
          ←
        </button>
        <span className="text-sm font-medium text-ink">{range.label}</span>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
          disabled={weekOffset >= 0}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Shipped" value={shipped.length} accent />
        <Stat label="Carried over" value={carried.length} />
        <Stat label="Deadlines hit" value={deadlines.length} />
        <Stat label="Studio time" value={studioLabel} hint={studioMs > 0 ? undefined : "From Work View sessions"} />
      </div>

      {/* Board: Shipped · In flight · Carry over */}
      <Board title="Shipped this week" count={shipped.length} empty="Nothing marked done this week yet.">
        {shipped.map((t) => (
          <TaskRow key={t.id} id={t.id} title={t.title} meta={taskMetaLine(t)} />
        ))}
      </Board>

      <Board title="In flight" count={flying.length} empty="All quiet — nothing actively moving.">
        {flying.slice(0, 8).map((t) => (
          <TaskRow key={t.id} id={t.id} title={t.title} meta={taskMetaLine(t)} />
        ))}
        {flying.length > 8 && (
          <p className="px-3 py-1 text-xs text-faint">+{flying.length - 8} more</p>
        )}
      </Board>

      <Board title="Carried over" count={carried.length} empty="Nothing carried — soft plans are current.">
        {carried.map((t) => (
          <TaskRow key={t.id} id={t.id} title={t.title} meta={`${taskMetaLine(t)} · carried`} />
        ))}
      </Board>

      {/* Life balance this week */}
      {balance.length > 0 && (
        <Card title="Life balance this week">
          <p className="mb-3 text-xs text-muted">Reflective only — which areas got attention, which went quiet.</p>
          <div className="space-y-2.5">
            {balance.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-muted">{r.name}</span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-l-full"
                    style={{ width: `${(r.shipped / maxBalance) * 100}%`, background: r.color }}
                    title={`${r.shipped} shipped`}
                  />
                  <div
                    className="h-full opacity-40"
                    style={{ width: `${(r.active / maxBalance) * 100}%`, background: r.color }}
                    title={`${r.active} still active`}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-faint">
                  {r.shipped}↑ {r.active}→
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Project progress */}
      {projects.length > 0 && (
        <Card title="Projects this week">
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">{p.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {p.shippedThisWeek > 0 && `${p.shippedThisWeek} shipped · `}
                  {p.total - p.totalDone} active
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Reflection */}
      <Card title="Reflection">
        <p className="mb-2 text-xs text-muted">What worked? What drained you? No wrong answers.</p>
        <textarea
          value={notes.reflection}
          onChange={(e) => saveReviewNotes(key, { reflection: e.target.value })}
          rows={4}
          placeholder="This week I…"
          className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
        />
      </Card>

      <Card title="Next week intentions">
        <p className="mb-2 text-xs text-muted">Loose intentions, not a to-do list. Shape the week ahead.</p>
        <textarea
          value={notes.intentions}
          onChange={(e) => saveReviewNotes(key, { intentions: e.target.value })}
          rows={4}
          placeholder="Next week I want to…"
          className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
        />
      </Card>

      {showPlanHandoff && (
        <div className="rounded-xl border-2 border-accent bg-accent-soft/20 p-4">
          <p className="font-medium text-ink">Ready to shape this week?</p>
          <p className="mt-1 text-sm text-muted">
            Opens planning. Your intentions above will show as a reminder — not auto-filled.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                openPlanning({
                  intentionReminder: notes.intentions.trim() || undefined,
                  initialStep: 1,
                })
              }
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Shape this week →
            </button>
            <button
              type="button"
              onClick={() => declineWeekPlanning(currentWeekKey)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  accent = false,
  hint,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-3">
      <div className={["font-display text-2xl font-semibold tabular-nums", accent ? "text-accent" : "text-ink"].join(" ")}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-faint">{hint}</div>}
    </div>
  );
}

function Board({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        <span className="text-xs text-faint">{count}</span>
      </div>
      {count > 0 ? (
        <ul className="divide-y divide-line">{children}</ul>
      ) : (
        <p className="px-4 py-4 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

function TaskRow({ id, title, meta }: { id: string; title: string; meta: string }) {
  const router = useRouter();
  return (
    <li>
      <button
        type="button"
        onClick={() => openTaskWork(router, id)}
        className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-canvas"
      >
        <span className="text-sm text-ink">{title}</span>
        <span className="text-xs text-muted">{meta}</span>
      </button>
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
