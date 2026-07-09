/**
 * DESIGN SPEC — Plan the Week (v5, dual-layer)
 * --------------------------------------------
 * Life areas: approve tasks for this week → mode load pills (with counts) drag onto strip.
 * Receipt → Shape week → Theme & lock.
 */

import Link from "next/link";
import {
  Anno,
  BalanceBars,
  Frame,
  PhoneFrame,
  Tap,
  TaskRowWire,
  Zone,
} from "@/components/design/wireframe-primitives";

/* ── helpers ─────────────────────────────────────────────────────────── */

function StepPill({ n, label, active = false }: { n: number; label: string; active?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-medium",
        active ? "bg-accent text-white" : "border border-border text-muted",
      ].join(" ")}
    >
      {n} · {label}
    </span>
  );
}

/** Due date + days remaining */
function DueLabel({ date, days }: { date?: string; days?: number | null }) {
  if (!date) {
    return <span className="shrink-0 text-[10px] text-faint italic">no date</span>;
  }
  const hot = days !== undefined && days !== null && days <= 3;
  return (
    <span className={["shrink-0 text-[10px] tabular-nums", hot ? "font-medium text-accent" : "text-faint"].join(" ")}>
      {date}
      {days !== undefined && days !== null ? ` · ${days}d` : ""}
    </span>
  );
}

/** Task row — approve for this week; shown under in progress or open */
function WeekTaskApproveRow({
  title,
  mode,
  approved = false,
  waiting = false,
  dueDate,
  daysOut,
}: {
  title: string;
  mode: string;
  approved?: boolean;
  waiting?: boolean;
  dueDate?: string;
  /** Days until due · null = no deadline */
  daysOut?: number | null;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-xs hover:bg-canvas/50">
      <span
        className={[
          "grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px]",
          approved ? "border-accent bg-accent text-white" : "border-faint text-transparent",
        ].join(" ")}
      >
        ✓
      </span>
      <span className={["min-w-0 flex-1", approved ? "font-medium text-ink" : "text-muted"].join(" ")}>{title}</span>
      <span className="shrink-0 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] text-faint">{mode}</span>
      {waiting ? <span className="shrink-0 text-[10px] text-faint">waiting</span> : null}
      <DueLabel date={dueDate} days={daysOut} />
    </li>
  );
}

function LifeAreaTaskSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</p>
      <ul className="mt-1 space-y-0.5">{children}</ul>
    </div>
  );
}
function LifeAreaPlanningCard({
  name,
  colorClass,
  open,
  quiet,
  children,
}: {
  name: string;
  colorClass: string;
  open: number;
  quiet?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${colorClass}`} />
        <p className="font-semibold text-ink">{name}</p>
        <span className="text-xs text-muted">{open} open</span>
        {quiet ? <span className="text-xs text-faint">· {quiet}</span> : null}
      </div>
      <div className="mt-3 space-y-3 border-t border-line pt-3">{children}</div>
    </div>
  );
}

/** Mode load = draggable pills. Counts from approved tasks only — days default to open. */
function ModeLoadPalette({
  loads,
  active,
}: {
  loads: { mode: string; count: number; emphasized?: boolean }[];
  active?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-accent/50 bg-accent-soft/10 p-3">
      <Anno>mode load · drag onto a day</Anno>
      <div className="mt-2 flex flex-wrap gap-2">
        {loads.map((l) => (
          <span
            key={l.mode}
            className={[
              "cursor-grab select-none rounded-full border-2 px-4 py-2 text-sm font-medium",
              active === l.mode
                ? "border-accent bg-accent text-white shadow-md"
                : l.emphasized
                  ? "border-accent/60 bg-surface font-semibold text-ink hover:border-accent"
                  : "border-border bg-surface text-ink hover:border-accent/60",
            ].join(" ")}
          >
            <span className={active === l.mode ? "mr-1 opacity-70" : "mr-1 text-faint"}>⋮⋮</span>
            {l.mode} · {l.count}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Days start open · drag a pill to assign · tap × on a day to clear back to open · phone: tap day → tap mode
      </p>
    </div>
  );
}

function TrustCheck() {
  return (
    <div className="rounded-lg border border-border bg-canvas/40 px-4 py-3 text-xs">
      <Anno>trust check</Anno>
      <ul className="mt-2 space-y-1 text-muted">
        <li className="text-ink">✓ master delivery tue — creative mon/tue</li>
        <li className="text-ink">✓ 5 admin approved — admin thu</li>
        <li>○ undertow marketing (jul 22 · 14d) — approved · creative mon</li>
      </ul>
    </div>
  );
}

function ApprovedWorkPanel() {
  return (
    <div className="rounded-xl border border-border bg-canvas/40 p-4">
      <Anno>this week&apos;s work · approved only (read-only)</Anno>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm font-semibold text-ink">creative · 5</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            <li>mix vocals · music · jul 15 · 9d</li>
            <li>master delivery · music · jul 8 · 2d</li>
            <li>undertow marketing · music · jul 22 · 16d</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">admin · 5</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            <li>pay utilities · home · jul 12 · 6d</li>
            <li>schedule distro · music · jul 10 · 4d</li>
            <li>grant report · income · jul 18 · 12d</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">errands · 1</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            <li>dentist · jul 11 · 5d</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">outreach · 1</p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            <li>follow up grant · income · jul 20 · 14d</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Full week overview on lock screen */
function WeekLockOverview() {
  const dayDetails = [
    { label: "sun 6", mode: "open", note: "flex" },
    { label: "mon 7", mode: "creative", note: "3 tasks" },
    { label: "tue 8", mode: "creative", note: "master due" },
    { label: "wed 9", mode: "open", note: "flex" },
    { label: "thu 10", mode: "admin", note: "5 tasks" },
    { label: "fri 11", mode: "creative", note: "2 tasks" },
    { label: "sat 12", mode: "open", note: "flex" },
  ];
  return (
    <div className="rounded-xl border-2 border-accent/30 bg-surface p-4 space-y-4">
      <Anno>your week · overview</Anno>
      <WeekModeStrip days={WEEK_DAYS} />
      <div className="grid grid-cols-7 gap-1.5">
        {dayDetails.map((d) => (
          <div key={d.label} className="rounded-lg border border-border bg-canvas/30 px-1.5 py-2 text-center">
            <p className="text-[9px] font-semibold uppercase text-faint">{d.label}</p>
            <p className="mt-0.5 text-xs font-semibold text-accent">{d.mode}</p>
            <p className="mt-0.5 text-[10px] text-muted">{d.note}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        <strong className="text-ink">12</strong> tasks this week ·{" "}
        <strong className="text-ink">4</strong> mode focus days
      </p>
    </div>
  );
}

const WIZARD_STEPS = [
  { n: 1, label: "receipt" },
  { n: 2, label: "approve work" },
  { n: 3, label: "place modes" },
  { n: 4, label: "lock" },
] as const;

const APPROVED_MODE_LOAD = [
  { mode: "creative", count: 5, emphasized: true },
  { mode: "admin", count: 5, emphasized: true },
  { mode: "errands", count: 1 },
  { mode: "outreach", count: 1 },
] as const;

function WizardNav({ current }: { current: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {WIZARD_STEPS.map((s) => (
        <StepPill key={s.n} n={s.n} label={s.label} active={s.n === current} />
      ))}
    </div>
  );
}

function WeekModeStrip({
  days,
  highlight,
}: {
  days: {
    label: string;
    sub: string;
    mode?: string;
    load?: number;
    past?: boolean;
    logSummary?: string;
    deadlineDots?: number;
  }[];
  highlight?: number;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d, i) => (
        <button
          key={d.label}
          type="button"
          disabled={d.past}
          className={[
            "relative flex flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors",
            d.past ? "cursor-default border-border/60 bg-canvas/40 opacity-70" : "border-border bg-surface hover:border-accent/50",
            i === highlight ? "border-2 border-accent bg-accent-soft ring-2 ring-accent/30 ring-offset-1" : "",
            !d.past && !d.mode && highlight === undefined ? "border-dashed" : "",
          ].join(" ")}
        >
          {d.deadlineDots ? (
            <span className="absolute right-1 top-1 flex gap-0.5">
              {Array.from({ length: Math.min(d.deadlineDots, 3) }).map((_, j) => (
                <span key={j} className="h-1.5 w-1.5 rounded-full bg-accent" />
              ))}
            </span>
          ) : null}
          <span className="text-[9px] font-semibold uppercase text-faint">{d.label}</span>
          <span className="text-sm font-semibold text-ink">{d.sub}</span>
          {d.load !== undefined && !d.past ? (
            <div className="mt-1 h-1 w-full rounded-full bg-line">
              <div className="h-full rounded-full bg-accent/60" style={{ width: `${d.load * 100}%` }} />
            </div>
          ) : null}
          {d.past && d.logSummary ? (
            <span className="mt-1 line-clamp-2 text-[9px] text-muted">{d.logSummary}</span>
          ) : (
            <span className="mt-1 line-clamp-2 text-[10px] font-medium text-accent">{d.mode ?? "open"}</span>
          )}
        </button>
      ))}
    </div>
  );
}

const WEEK_DAYS = [
  { label: "sun", sub: "6", mode: "open", load: 0.1 },
  { label: "mon", sub: "7", mode: "creative", load: 0.35, deadlineDots: 1 },
  { label: "tue", sub: "8", mode: "creative", load: 0.5, deadlineDots: 2 },
  { label: "wed", sub: "9", mode: "open", load: 0.25 },
  { label: "thu", sub: "10", mode: "admin", load: 0.7 },
  { label: "fri", sub: "11", mode: "creative", load: 0.4 },
  { label: "sat", sub: "12", mode: "open", load: 0 },
];

/** Mid-week entry: Sun–Tue show log summary from shipped/lifted history */
const WEEK_DAYS_MIDWEEK = [
  { label: "sun", sub: "6", past: true, logSummary: "2 shipped · creative" },
  { label: "mon", sub: "7", past: true, logSummary: "studio · creative" },
  { label: "tue", sub: "8", past: true, logSummary: "master sent ✦" },
  { label: "wed", sub: "9", mode: "open", load: 0.25 },
  { label: "thu", sub: "10", mode: "admin", load: 0.7, deadlineDots: 1 },
  { label: "fri", sub: "11", mode: "creative", load: 0.4 },
  { label: "sat", sub: "12", mode: "errands", load: 0.1 },
];

/* ── page ────────────────────────────────────────────────────────────── */

export default function WeekPlanningConceptsDesign() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-16 px-6 py-10">
      <header>
        <Link href="/design" className="text-sm font-medium text-muted hover:text-accent">
          ← Design lab
        </Link>
        <p className="mt-2 text-sm">
          <Link href="/design/methodology" className="font-medium text-accent hover:underline">
            Methodology →
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          Plan the week — functional wireframes
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Approve tasks per life area → mode load pills → drag onto strip. Today inherits today&apos;s mode.
        </p>
      </header>

      {/* ── DUAL LAYER ── */}
      <section className="rounded-xl border-2 border-accent/30 bg-accent-soft/10 p-5 space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">Dual layer</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border-2 border-accent/50 bg-surface p-3">
            <p className="font-medium text-ink">Life areas · approve tasks</p>
            <p className="mt-1 text-muted">Holistic capture per area. Tasks split: in progress, then open by due date (date · Nd).</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Mode load · derived</p>
            <p className="mt-1 text-muted">System files approved tasks into modes. You don&apos;t pick modes manually from a void.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Strip · drag modes</p>
            <p className="mt-1 text-muted">Stamp mode days to cover the load before deadlines. Trust check at the end.</p>
          </div>
        </div>
        <p className="text-sm text-muted">
          Ritual:{" "}
          <strong className="text-ink">receipt → approve work → place modes → lock with week overview</strong>
        </p>
      </section>

      {/* ── FUNCTIONAL MAP ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Functional map</h2>
        <div className="grid gap-4 lg:grid-cols-3 text-sm">
          <div className="rounded-xl border border-border bg-surface p-4">
            <Anno>entry</Anno>
            <ul className="mt-2 space-y-1 text-muted">
              <li>· Review → <Tap>shape next week</Tap></li>
              <li>· Dashboard week-start / deferred</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-accent/40 bg-surface p-4">
            <Anno>inside</Anno>
            <p className="mt-2 text-muted">
              Step 2 approve · step 3 place (shows approved tasks) · step 4 lock overview
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <Anno>exit</Anno>
            <ul className="mt-2 space-y-1 text-muted">
              <li>· weekScope · approved task ids</li>
              <li>· days[].focus mode per day</li>
              <li>· theme</li>
              <li>· Today: all mode tasks + also today</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── WIZARD OVERVIEW + DRAG CONCEPT ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Decision flow · approve → derive → place</h2>
        <p className="max-w-3xl text-sm text-muted">
          Deadlines suggest — you approve. Within each area: <strong className="text-ink">in progress</strong> first, then{" "}
          <strong className="text-ink">open</strong> sorted by due date with days remaining (jul 8 · 2d).
        </p>
        <div className="grid gap-2 sm:grid-cols-4 text-sm">
          {WIZARD_STEPS.map((s) => (
            <div key={s.n} className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-xs font-bold text-accent">{s.n}</p>
              <p className="font-medium text-ink">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">1 · Receipt</p>
            <p className="mt-1 text-muted">Shipped, carried, balance mirror. Proof before committing.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">2 · Approve</p>
            <p className="mt-1 text-muted">Life areas only. In progress + open. Checkbox what&apos;s in scope.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">3 · Place modes</p>
            <p className="mt-1 text-muted">Approved tasks visible · mode load pills drag onto strip · intention.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">4 · Lock</p>
            <p className="mt-1 text-muted">Full week overview + theme. Feels like the whole plan in one glance.</p>
          </div>
        </div>
      </section>

      {/* ── STEP 1 · RECEIPT ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Step 1 · Receipt</h2>
        <Frame label="Plan your week · step 1 of 4" note="full-screen overlay · wizard">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xl font-semibold text-ink">Plan your week</p>
              <p className="text-sm text-muted">Jul 6 – 12</p>
            </div>
            <WizardNav current={1} />
          </div>
          <div className="mx-auto max-w-xl space-y-4">
            <div className="rounded-lg border border-border bg-canvas/50 px-4 py-4">
              <Anno>① receipt</Anno>
              <p className="mt-2 text-sm text-muted">
                <strong className="text-ink">8</strong> shipped · <strong className="text-ink">2</strong> carried
              </p>
              <BalanceBars areas={[["music", 14], ["home", 6], ["errands", 2]]} />
              <p className="mt-2 text-xs text-faint">Lighter band if you just finished Review</p>
            </div>
            <div className="flex justify-end">
              <span className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white">next →</span>
            </div>
          </div>
        </Frame>
      </section>

      {/* ── STEP 2 · APPROVE WORK ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Step 2 · Approve this week&apos;s work</h2>
        <Frame label="Plan your week · step 2 of 4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xl font-semibold text-ink">What needs to happen this week?</p>
              <p className="text-sm text-muted">Jul 6 – 12</p>
            </div>
            <WizardNav current={2} />
          </div>

          <p className="mb-4 text-sm text-muted">
            Sweep every life area. Check tasks you&apos;re committing to — in progress first, open sorted by due date
            (jul 8 · 2d).
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <LifeAreaPlanningCard name="music" colorClass="bg-indigo-500" open={14}>
              <LifeAreaTaskSection label="in progress">
                <WeekTaskApproveRow title="mix vocals on bridge" mode="creative" approved dueDate="jul 15" daysOut={9} />
              </LifeAreaTaskSection>
              <LifeAreaTaskSection label="open · nearest due first">
                <WeekTaskApproveRow title="master delivery prep" mode="creative" approved dueDate="jul 8" daysOut={2} />
                <WeekTaskApproveRow title="schedule distro upload" mode="admin" approved dueDate="jul 10" daysOut={4} />
                <WeekTaskApproveRow title="undertow marketing plan" mode="creative" approved dueDate="jul 22" daysOut={16} />
                <WeekTaskApproveRow title="update metadata" mode="admin" dueDate="jul 25" daysOut={19} />
                <WeekTaskApproveRow title="stem export for nadia" mode="creative" />
              </LifeAreaTaskSection>
            </LifeAreaPlanningCard>
            <LifeAreaPlanningCard name="home" colorClass="bg-sky-600" open={6} quiet="quiet 2 weeks">
              <LifeAreaTaskSection label="in progress">
                <li className="py-0.5 text-[10px] text-faint italic">—</li>
              </LifeAreaTaskSection>
              <LifeAreaTaskSection label="open · nearest due first">
                <WeekTaskApproveRow title="pay utilities" mode="admin" approved waiting dueDate="jul 12" daysOut={6} />
                <WeekTaskApproveRow title="schedule plumber" mode="admin" approved />
                <WeekTaskApproveRow title="renew insurance" mode="admin" dueDate="aug 1" daysOut={26} />
              </LifeAreaTaskSection>
            </LifeAreaPlanningCard>
            <LifeAreaPlanningCard name="errands" colorClass="bg-amber-600" open={3}>
              <LifeAreaTaskSection label="open · nearest due first">
                <WeekTaskApproveRow title="dentist appointment" mode="errands" approved dueDate="jul 11" daysOut={5} />
                <WeekTaskApproveRow title="refill prescription" mode="errands" dueDate="jul 14" daysOut={8} />
              </LifeAreaTaskSection>
            </LifeAreaPlanningCard>
            <LifeAreaPlanningCard name="income" colorClass="bg-emerald-600" open={3}>
              <LifeAreaTaskSection label="open · nearest due first">
                <WeekTaskApproveRow title="grant report draft" mode="admin" approved dueDate="jul 18" daysOut={12} />
                <WeekTaskApproveRow title="follow up grant officer" mode="outreach" approved dueDate="jul 20" daysOut={14} />
              </LifeAreaTaskSection>
            </LifeAreaPlanningCard>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              <strong className="text-ink">12</strong> tasks approved for this week
            </p>
            <div className="flex gap-2">
              <span className="rounded-lg border border-border px-4 py-2 text-sm text-muted">← back</span>
              <span className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white">place modes →</span>
            </div>
          </div>
        </Frame>
      </section>

      {/* ── STEP 3 · PLACE MODES ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Step 3 · Place modes on days</h2>
        <Frame label="Plan your week · step 3 of 4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xl font-semibold text-ink">Shape your week</p>
              <p className="text-sm text-muted">Jul 6 – 12 · 12 tasks approved</p>
            </div>
            <WizardNav current={3} />
          </div>

          <ApprovedWorkPanel />

          <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-3">
            <Anno>intention</Anno>
            <p className="mt-1 text-sm text-ink">Ship undertow — creative early, admin Thursday</p>
          </div>

          <ModeLoadPalette loads={[...APPROVED_MODE_LOAD]} active="admin" />

          <div className="mt-4">
            <Anno>week strip</Anno>
            <p className="mb-2 text-[11px] font-medium text-accent">↳ 5 admin approved → stamping admin on thursday</p>
            <WeekModeStrip days={WEEK_DAYS} highlight={4} />
          </div>

          <div className="mt-4">
            <TrustCheck />
          </div>

          <div className="mt-5 flex justify-between gap-2 border-t border-line pt-4">
            <span className="rounded-lg border border-border px-4 py-2 text-sm text-muted">← back</span>
            <span className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white">review &amp; lock →</span>
          </div>
        </Frame>

        <Frame label="Mid-week · step 3 only" note="approved tasks + place remaining days">
          <ApprovedWorkPanel />
          <div className="my-3">
            <ModeLoadPalette loads={[{ mode: "creative", count: 4, emphasized: true }, { mode: "admin", count: 3 }]} />
          </div>
          <p className="my-3 text-sm text-muted">Sun–Tue locked from log. Place modes on Wed–Sat.</p>
          <WeekModeStrip days={WEEK_DAYS_MIDWEEK} highlight={4} />
        </Frame>
      </section>

      {/* ── STEP 4 · LOCK ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Step 4 · Lock</h2>
        <Frame label="Plan your week · step 4 of 4">
          <div className="mb-4 border-b border-line pb-4">
            <WizardNav current={4} />
          </div>
          <div className="mx-auto max-w-2xl space-y-5">
            <WeekLockOverview />

            <Zone label="week theme" note="built">
              <p className="text-sm text-ink">✦ Ship undertow — admin catch-up Thursday</p>
              <div className="mt-2 flex gap-2">
                <span className="rounded-lg border border-border px-2 py-1 text-xs text-muted">use intention as theme</span>
              </div>
            </Zone>

            <Zone label="intention">
              <p className="text-sm text-muted italic">Ship undertow — creative early, admin Thursday</p>
            </Zone>

            <div className="flex justify-between gap-3 border-t border-line pt-4">
              <span className="rounded-lg border border-border px-4 py-2 text-sm text-muted">← back</span>
              <span className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white">done planning →</span>
            </div>
          </div>
        </Frame>
      </section>

      {/* ── PRIORITY LOGIC ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Approve + derive + place rules</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Task lists inside life areas</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
              <li><strong className="text-ink">In progress</strong> — already started / carried</li>
              <li><strong className="text-ink">Open</strong> — sorted by due date, soonest first</li>
              <li>Due shows date + days out: jul 8 · 2d</li>
              <li>No date sorts last · approve checkbox on any row</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Approve for this week</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
              <li>Checked tasks → week scope → mode load</li>
              <li>Unchecked stay visible but don&apos;t drive scheduling</li>
              <li>Near deadlines (≤3d) highlighted in accent</li>
              <li>Waiting-on shown on row, not a separate section</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 md:col-span-2">
            <p className="font-medium text-ink">Drag modes onto days</p>
            <ul className="mt-2 space-y-1 text-muted">
              <li>· Days default to open until you drag a mode onto them</li>
              <li>· Mode load pills are the drag tokens — counts from approved tasks</li>
              <li>· Pills never deplete — stamp same mode many days</li>
              <li>· Tap × on a day to clear back to open</li>
              <li>· Deadline dots on strip · past days from log</li>
              <li>· Phone: tap day → tap mode (same data)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── TAP OUTCOMES ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Tap outcomes</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs uppercase text-faint">
                <th className="px-4 py-3">Tap</th>
                <th className="px-4 py-3">Effect</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              {[
                ["next / back", "Wizard step navigation", "wizardStep 1–4"],
                ["toggle task approve", "Step 2 only · week scope", "weekPlan.approvedTaskIds[]"],
                ["drag mode pill → day", "Mode load pill stamps onto day cell", "days[dateKey].focus kind:mode"],
                ["write intention", "Step 3 · before placing modes", "draft.intention"],
                ["tap day · tap mode", "Phone · mode load pills only", "days[dateKey].focus kind:mode"],
                ["tap × on day", "Clears mode · day returns to open", "days[dateKey].focus = open"],
                ["use intention as theme", "Fills theme field", "draft.theme"],
                ["done planning", "Lock · Dashboard mode map", "weekPlanning record"],
              ].map(([tap, effect, data]) => (
                <tr key={tap} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{tap}</td>
                  <td className="px-4 py-3">{effect}</td>
                  <td className="px-4 py-3 font-mono text-xs">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PHONE WIZARD ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Phone · steps 2 &amp; 3</h2>
        <div className="flex flex-wrap gap-8">
          <PhoneFrame label="Step 2 · approve">
            <div className="space-y-3">
              <p className="text-xs text-faint">2 of 4</p>
              <LifeAreaPlanningCard name="music" colorClass="bg-indigo-500" open={14}>
                <LifeAreaTaskSection label="in progress">
                  <WeekTaskApproveRow title="mix vocals" mode="creative" approved dueDate="jul 15" daysOut={9} />
                </LifeAreaTaskSection>
                <LifeAreaTaskSection label="open">
                  <WeekTaskApproveRow title="master delivery" mode="creative" approved dueDate="jul 8" daysOut={2} />
                </LifeAreaTaskSection>
              </LifeAreaPlanningCard>
              <p className="text-xs text-muted">5 tasks approved</p>
              <div className="flex justify-between pt-1">
                <span className="text-xs text-muted">← back</span>
                <span className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white">place modes →</span>
              </div>
            </div>
          </PhoneFrame>
          <PhoneFrame label="Step 3 · place modes">
            <div className="space-y-3">
              <p className="text-xs text-faint">3 of 4 · 5 approved</p>
              <ApprovedWorkPanel />
              <ModeLoadPalette loads={[{ mode: "creative", count: 3 }, { mode: "admin", count: 2 }]} />
              <WeekModeStrip days={WEEK_DAYS} highlight={4} />
              <div className="flex justify-between pt-1">
                <span className="text-xs text-muted">← back</span>
                <span className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white">lock →</span>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </section>

      {/* ── TODAY PAYOFF ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Today inherits today&apos;s mode</h2>
        <Frame label="Today · Thursday · admin day">
          <div className="space-y-3">
            <p className="text-xl font-semibold text-ink">Today</p>
            <p className="text-sm text-accent">✦ Ship undertow — admin catch-up Thursday</p>
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">admin day</span> — you planned this Sunday
            </p>
            <Zone label="admin · all active admin-mode tasks">
              <TaskRowWire title="schedule distro upload" sub="music" />
              <TaskRowWire title="pay utilities" sub="home" accessories={["waiting"]} state="waiting" />
              <TaskRowWire title="draft tour budget" sub="music" />
            </Zone>
            <Zone label="also today · inToday from other modes" dashed>
              <TaskRowWire title="mix vocals on bridge" sub="music · creative" />
            </Zone>
            <p className="text-xs text-muted">Sort TBD · no focus queue on mode days · open days = theme + inToday only</p>
          </div>
        </Frame>
      </section>

      {/* ── BUILD ORDER ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Build order</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-xl border border-emerald-600/30 bg-emerald-50/50 p-4">
            <Anno className="text-emerald-800">reuse</Anno>
            <ul className="mt-2 space-y-1 text-emerald-950">
              <li>· Overlay shell · theme · week strip · wizard nav</li>
              <li>· Mode chips (incl. errands) · calendar load</li>
              <li>· Shipped log for past-day strip summaries</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-600/30 bg-amber-50/50 p-4">
            <Anno className="text-amber-900">build</Anno>
            <ul className="mt-2 space-y-1 text-amber-950">
              <li>· 4-step wizard · approve page separate from place page</li>
              <li>· ApprovedWorkPanel on step 3 · WeekLockOverview on step 4</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
