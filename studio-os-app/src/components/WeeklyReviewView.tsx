"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { useWeekPlanningLauncher } from "@/components/WeekPlanningLauncher";
import { openTaskWork } from "@/lib/navigation";
import { weekKey, weekRange } from "@/lib/week";
import { weekPlanningMode } from "@/lib/week-planning";
import { formatStudioDuration, studioMsByBucket, studioMsInWeek } from "@/lib/studio-time";
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
  const studioBuckets = useMemo(() => {
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    return studioMsByBucket(activityLog, tasksById, range.start, range.end);
  }, [activityLog, tasks, range.start, range.end]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Weekly Review</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Close the week — see what shipped, what carried, and what needs your attention.
          </p>
        </div>
        <div className="flex min-w-[14rem] items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
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
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Shipped" value={shipped.length} accent />
        <Stat label="Carried over" value={carried.length} />
        <Stat label="Deadlines hit" value={deadlines.length} />
        <Stat label="Studio time" value={studioLabel} hint={studioMs > 0 ? undefined : "From Work View sessions"} />
      </div>

      {studioMs > 0 && (
        <MakeManageBar makeMs={studioBuckets.make} manageMs={studioBuckets.manage} />
      )}

      {/* Task boards — scan past · present · stuck in one row on desktop */}
      <div className="grid gap-4 md:grid-cols-3 md:items-start">
        <Board
          key={`${key}-shipped`}
          boardId="shipped"
          title="Shipped this week"
          count={shipped.length}
          empty="Nothing marked done this week yet."
          accent
        >
          {shipped.map((t) => (
            <TaskRow key={t.id} id={t.id} title={t.title} meta={taskMetaLine(t)} />
          ))}
        </Board>

        <Board key={`${key}-flight`} boardId="flight" title="In flight" count={flying.length} empty="All quiet — nothing actively moving.">
          {flying.map((t) => (
            <TaskRow key={t.id} id={t.id} title={t.title} meta={taskMetaLine(t)} />
          ))}
        </Board>

        <Board
          key={`${key}-carried`}
          boardId="carried"
          title="Carried over"
          count={carried.length}
          empty="Nothing carried — soft plans are current."
        >
          {carried.map((t) => (
            <TaskRow key={t.id} id={t.id} title={t.title} meta={`${taskMetaLine(t)} · carried`} />
          ))}
        </Board>
      </div>

      {/* Context left · close-the-week writing right */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          {balance.length > 0 && (
            <Card title="Life balance this week">
              <p className="mb-3 text-xs text-muted">
                Reflective only — which areas got attention, which went quiet.
              </p>
              <div className="space-y-2.5">
                {balance.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-sm text-muted sm:w-28">{r.name}</span>
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
                    <span className="w-14 shrink-0 text-right text-xs text-faint sm:w-16">
                      {r.shipped}↑ {r.active}→
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {projects.length > 0 && (
            <Card title="Projects this week">
              <ul className="divide-y divide-line">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {p.shippedThisWeek > 0 && `${p.shippedThisWeek} shipped · `}
                      {p.total - p.totalDone} active
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card title="Reflection">
              <p className="mb-2 text-xs text-muted">What worked? What drained you? No wrong answers.</p>
              <textarea
                value={notes.reflection}
                onChange={(e) => saveReviewNotes(key, { reflection: e.target.value })}
                rows={5}
                placeholder="This week I…"
                className="w-full resize-y rounded-xl border border-border bg-canvas px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
              />
            </Card>

            <Card title="Next week intentions">
              <p className="mb-2 text-xs text-muted">Loose intentions, not a to-do list. Shape the week ahead.</p>
              <textarea
                value={notes.intentions}
                onChange={(e) => saveReviewNotes(key, { intentions: e.target.value })}
                rows={5}
                placeholder="Next week I want to…"
                className="w-full resize-y rounded-xl border border-border bg-canvas px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
              />
            </Card>
          </div>

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
        </div>
      </div>
    </section>
  );
}

function MakeManageBar({ makeMs, manageMs }: { makeMs: number; manageMs: number }) {
  const makeLabel = formatStudioDuration(makeMs);
  const manageLabel = formatStudioDuration(manageMs);
  const total = makeMs + manageMs;
  const makePct = total > 0 ? (makeMs / total) * 100 : 0;
  const managePct = total > 0 ? (manageMs / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">Make vs manage</p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-canvas">
        {makeMs > 0 && (
          <div
            className="h-full bg-accent"
            style={{ width: `${makePct}%` }}
            title={`Make: ${makeLabel}`}
          />
        )}
        {manageMs > 0 && (
          <div
            className="h-full bg-faint"
            style={{ width: `${managePct}%` }}
            title={`Manage: ${manageLabel}`}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>Make · {makeLabel}</span>
        <span>Manage · {manageLabel}</span>
      </div>
    </div>
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
      <div
        className={[
          "font-display text-2xl font-semibold tabular-nums",
          accent ? "text-accent" : "text-ink",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-faint">{hint}</div>}
    </div>
  );
}

const BOARD_EXPANDED_MAX = "max-h-60"; // ~5 rows, then scroll

function Board({
  title,
  boardId,
  count,
  empty,
  children,
  accent = false,
}: {
  title: string;
  boardId: string;
  count: number;
  empty: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canExpand = count > 0;
  const panelId = `review-board-${boardId}`;

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border bg-surface",
        accent ? "border-accent/40 shadow-sm" : "border-border",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => canExpand && setOpen((v) => !v)}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        aria-controls={canExpand ? panelId : undefined}
        className={[
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
          canExpand ? "cursor-pointer hover:bg-canvas/60" : "cursor-default",
          accent ? "bg-accent-soft/20" : "",
        ].join(" ")}
      >
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={[
              "font-display text-xl font-semibold tabular-nums",
              accent && count > 0 ? "text-accent" : "text-ink",
            ].join(" ")}
          >
            {count}
          </span>
          {canExpand ? (
            <span className="text-xs text-faint" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          ) : null}
        </span>
      </button>

      {!canExpand ? <p className="border-t border-line px-4 py-3 text-sm text-muted">{empty}</p> : null}

      {canExpand && open ? (
        <ul
          id={panelId}
          className={`${BOARD_EXPANDED_MAX} divide-y divide-line overflow-y-auto border-t border-line`}
        >
          {children}
        </ul>
      ) : null}
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
        <span className="line-clamp-2 text-sm text-ink">{title}</span>
        <span className="truncate text-xs text-muted">{meta}</span>
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
