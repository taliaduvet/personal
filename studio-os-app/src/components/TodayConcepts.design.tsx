/**
 * DESIGN SPEC — Today (v2 · post-planning scope)
 * ----------------------------------------------
 * Mode day: approved + matching mode only. Full Lot lives elsewhere.
 * Open day: life-area overview → assign to day. inToday = the bench.
 * Capture always at bottom. Lifted inline at bottom of bench. Day Shape designed.
 */

import Link from "next/link";
import {
  Anno,
  Frame,
  PhoneFrame,
  TaskRowWire,
  Zone,
} from "@/components/design/wireframe-primitives";

function ContractRow({ label, rule }: { label: string; rule: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-1 text-muted">{rule}</p>
    </div>
  );
}

function TodayHeader({
  mode,
  shaped,
}: {
  mode?: string;
  shaped?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-2xl font-semibold text-ink">Today</p>
        <p className="mt-0.5 text-sm text-muted">Thu Jul 10 · 4 on bench · 2 lifted</p>
        <p className="mt-1 text-sm text-accent">✦ Ship undertow — admin catch-up Thursday</p>
        {mode ? (
          <p className="mt-1 text-sm text-muted">
            <span className="font-medium text-ink">{mode} day</span> — you planned this Sunday
          </p>
        ) : (
          <p className="mt-1 text-xs text-faint italic">open day — pick from your areas below</p>
        )}
      </div>
      <div className="text-right">
        <button type="button" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink">
          shape today {shaped ? "▴" : "▾"}
        </button>
        <p className="mt-1 text-[10px] text-faint">optional · collapses if unused</p>
      </div>
    </div>
  );
}

function SplitDesk({
  main,
  rail,
  footer,
}: {
  main: React.ReactNode;
  rail: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 min-[560px]:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
        <div className="min-w-0">{main}</div>
        <aside className="min-w-0 space-y-3 rounded-xl border border-border bg-canvas/30 p-3">
          <Anno>side rail · peripheral</Anno>
          {rail}
        </aside>
      </div>
      {footer && <div className="border-t border-line pt-3">{footer}</div>}
    </div>
  );
}

function MainAlsoToday() {
  return (
    <Zone label="also today · assigned outside today's mode" dashed>
      <TaskRowWire title="mix vocals on bridge" sub="creative" accessories={["inToday"]} />
      <p className="mt-1 text-[10px] text-muted">Cross-mode pulls — still today&apos;s work, not peripheral</p>
    </Zone>
  );
}

function RailLiftedCompact() {
  return (
    <div>
      <Anno>lifted · 2 today</Anno>
      <ul className="mt-1 space-y-0.5 text-xs text-muted">
        <li>✓ send stems · 4:12p</li>
        <li>✓ hotel block · 11:20a</li>
      </ul>
      <button type="button" className="mt-1 text-[10px] text-accent">
        expand proof
      </button>
    </div>
  );
}

function RailLifeAreas() {
  return (
    <div className="space-y-2">
      <Anno>add from area</Anno>
      {[
        { name: "music", color: "bg-indigo-500", n: 14 },
        { name: "home", color: "bg-sky-600", n: 6 },
        { name: "income", color: "bg-emerald-600", n: 3 },
      ].map((a) => (
        <button
          key={a.name}
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-left text-xs hover:border-accent/50"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${a.color}`} />
          <span className="font-medium text-ink">{a.name}</span>
          <span className="ml-auto text-faint">{a.n}</span>
        </button>
      ))}
      <p className="text-[10px] text-faint">tap → picker · approved first</p>
    </div>
  );
}

function CaptureFooter() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <span className="text-accent">＋</span>
        <span className="text-sm text-muted">capture a thought…</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Anno>caught ·</Anno>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] text-muted">tape delay</span>
      </div>
    </div>
  );
}

export default function TodayConceptsDesign() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-12 px-6 py-10">
      <header>
        <Link href="/design" className="text-sm font-medium text-muted hover:text-accent">
          ← Design lab
        </Link>
        <p className="mt-2 text-sm">
          <Link href="/design/methodology" className="font-medium text-accent hover:underline">
            Methodology →
          </Link>
          {" · "}
          <Link href="/design/week-planning" className="font-medium text-accent hover:underline">
            Week planning →
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          Today — v2 spec
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Today shows <strong className="text-ink">what you planned</strong> — not the whole Lot. Mode days filter
          approved work by mode; open days let you curate from a life-area overview. Everything else lives in Tasks.
        </p>
      </header>

      {/* ── LOCKED DECISIONS ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Locked · Jul 9</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <ContractRow
            label="Mode day bench"
            rule="Matches today's mode AND (approved this week OR do-plan within this week). Not the full Lot."
          />
          <ContractRow
            label="inToday on mode days"
            rule="Cross-mode tasks assigned to today — main column, below mode bench. Still today's work, not rail."
          />
          <ContractRow
            label="Open day"
            rule="Life-area overview cards → tap area → assign tasks to today. Bench = inToday only. Theme, no mode label."
          />
          <ContractRow
            label="Always on Today"
            rule="Capture strip at bottom · lifted proof inline at bottom of bench · day shape (optional, header entry)."
          />
        </div>
      </section>

      {/* ── MID-WEEK EDGE CASE ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Mid-week · task added after planning</h2>
        <p className="max-w-3xl text-sm text-muted">
          New tasks aren&apos;t approved by default — they won&apos;t appear on a mode bench until scoped. Three paths,
          lightest first:
        </p>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">1 · Also today</p>
            <p className="mt-2 text-muted">
              Pull to <strong className="text-ink">inToday</strong> from Quick Edit or Lot — shows in dashed zone on mode
              days. Only for tasks <strong className="text-ink">outside today's mode</strong>. One-off urgency without
              replanning.
            </p>
          </div>
          <div className="rounded-xl border-2 border-accent/40 bg-surface p-4">
            <p className="font-medium text-ink">2 · Approve for this week</p>
            <p className="mt-2 text-muted">
              Same checkbox as planning step 2 — pick tasks in the rail expand sheet, Quick Edit, or wizard. Once
              approved + mode matches, joins the mode bench automatically.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">3 · Re-open approve step</p>
            <p className="mt-2 text-muted">
              <strong className="text-ink">Dashboard only:</strong> &ldquo;N tasks added this week aren&apos;t in your
              plan&rdquo; → wizard step 2. Today rail is the quick tap when you&apos;re already on a mode day.
            </p>
          </div>
        </div>

        <h3 className="font-display text-lg font-semibold text-ink">Locked · Today rail nudge (Jul 9)</h3>
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <ContractRow
            label="Collapsed"
            rule="Count only — e.g. “4 admin tasks not in this week’s plan”. Tap to expand."
          />
          <ContractRow
            label="Expanded"
            rule="Mini sheet in rail: task names + per-row approve checkbox. Approve selected → joins today's mode bench. No also-today here — that's for cross-mode work only."
          />
          <ContractRow
            label="Dismiss"
            rule="Hides nudge until a new unplanned task appears this week (task ID not in snapshot at dismiss time). Existing stragglers stay hidden."
          />
          <ContractRow
            label="When it shows"
            rule="Mode day only · week has approvedTaskIds · unplanned count &gt; 0 · not dismissed-or-no-new-tasks."
          />
        </div>

        <Frame label="Today rail · collapsed" note="count only">
          <div className="max-w-[300px] rounded-lg border border-accent/30 bg-surface px-3 py-2.5 text-xs">
            <button type="button" className="flex w-full items-center justify-between text-left text-ink">
              <span>
                <strong>4</strong> admin tasks not in plan
              </span>
              <span className="text-faint">▾</span>
            </button>
          </div>
        </Frame>
        <Frame label="Today rail · expanded" note="names + actions">
          <div className="max-w-[300px] space-y-2 rounded-lg border border-accent/30 bg-surface p-3 text-xs">
            <p className="font-medium text-ink">4 admin · not in this week&apos;s plan</p>
            <div className="space-y-1.5 border-t border-line pt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly className="rounded" />
                <span>pay utilities</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly className="rounded" />
                <span>grant report draft</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly className="rounded" />
                <span>reply to grant officer</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-white">
                approve selected
              </span>
              <span className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted">dismiss</span>
            </div>
          </div>
        </Frame>
      </section>

      {/* ── LAYOUT ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Layout · split desk (not one column)</h2>
        <p className="max-w-3xl text-sm text-muted">
          One tall column stacks too much — bench, also-today, lifted, capture, areas all compete for attention.
          Desktop uses a <strong className="text-ink">work surface + side rail</strong>: main holds everything you&apos;re
          doing today; rail holds proof, picking, and nudges. Capture is a thin full-width footer.
        </p>
        <div className="rounded-xl border-2 border-accent/30 bg-surface p-4 font-mono text-[11px] leading-relaxed text-muted">
          <pre className="whitespace-pre-wrap">{`┌────────────────────────────────────────────────────────────┐
│ HEADER · full width · theme · mode · shape today ▾         │
├──────────────────────────────────┬─────────────────────────┤
│ MAIN · today's work              │ RAIL · quiet            │
│  · approved mode bench           │  · lifted (compact)     │
│  · also today (cross-mode)       │  · life areas (open)    │
│                                  │  · mid-week nudge       │
├──────────────────────────────────┴─────────────────────────┤
│ FOOTER · capture + caught chips · full width · thin        │
└────────────────────────────────────────────────────────────┘`}</pre>
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Main (~65%)</p>
            <p className="mt-1 text-muted">Mode bench + also today (both are work). Open day = assigned inToday only.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Rail (~300px)</p>
            <p className="mt-1 text-muted">Proof, picking work on open days, nudges — not tasks you&apos;re doing.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Footer</p>
            <p className="mt-1 text-muted">Capture only. Sticky on phone. Doesn&apos;t lengthen the bench scroll.</p>
          </div>
        </div>
        <p className="text-xs text-muted">
          Phone: main bench first → rail sections collapse to accordions below → capture sticky above tab bar. Still not
          one undifferentiated pile.
        </p>
      </section>

      {/* ── MODE DAY ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Mode day · desktop</h2>
        <Frame label="Today · Thursday · admin day · split desk">
          <TodayHeader mode="admin" />
          <div className="mt-4">
            <SplitDesk
              main={
                <>
                  <Zone label="admin · approved this week" note="mode bench · deadlines → carried → rest">
                    <TaskRowWire title="schedule distro upload" sub="music" accessories={["jul 10 · 4d"]} />
                    <TaskRowWire title="pay utilities" sub="home" accessories={["waiting"]} state="waiting" />
                    <TaskRowWire title="grant report draft" sub="income" accessories={["carried 2d"]} />
                    <TaskRowWire title="reply to grant officer" sub="income" />
                  </Zone>
                  <MainAlsoToday />
                </>
              }
              rail={
                <>
                  <RailLiftedCompact />
                  <div className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-muted">
                    1 admin task not in plan · <span className="text-accent">approve</span>
                  </div>
                </>
              }
              footer={<CaptureFooter />}
            />
          </div>
          <p className="mt-4 text-xs text-muted">
            <strong className="text-ink">Tap circle</strong> = lift · <strong className="text-ink">title</strong> = Work
            View · <strong className="text-ink">meta</strong> = Quick Edit
          </p>
        </Frame>
      </section>

      {/* ── OPEN DAY ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Open day · life-area overview</h2>
        <Frame label="Today · Wednesday · open · split desk">
          <TodayHeader />
          <div className="mt-4">
            <SplitDesk
              main={
                <>
                  <Zone label="today · assigned" note="inToday only · the commitment">
                    <TaskRowWire title="mix vocals on bridge" sub="music" accessories={["inToday"]} />
                    <TaskRowWire title="dentist reschedule" sub="health" accessories={["inToday"]} />
                  </Zone>
                  <p className="text-xs text-muted italic">
                    Empty? Pick from the rail → or Lot.
                  </p>
                </>
              }
              rail={
                <>
                  <RailLifeAreas />
                  <RailLiftedCompact />
                </>
              }
              footer={<CaptureFooter />}
            />
          </div>
        </Frame>

        <Frame label="Open day · area picker" note="opens in rail on desktop · bottom sheet on phone">
          <div className="mx-auto max-w-md space-y-3">
            <p className="font-medium text-ink">Music · 14 open</p>
            <p className="text-xs text-muted">Approved this week shown first · then other open tasks</p>
            <TaskRowWire title="master delivery prep" sub="creative" accessories={["approved", "jul 8"]} />
            <TaskRowWire title="undertow marketing" sub="creative" accessories={["approved"]} />
            <TaskRowWire title="update metadata" sub="admin" />
            <div className="flex gap-2 pt-2">
              <span className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white">add selected to today</span>
              <span className="rounded-lg border border-border px-4 py-2 text-xs text-muted">approve for week</span>
            </div>
          </div>
        </Frame>
      </section>

      {/* ── DAY SHAPE ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Day shape · optional layer</h2>
        <p className="max-w-3xl text-sm text-muted">
          Separate from week mode. Soft morning / afternoon / evening slots — drag from bench or assign intention. Week
          mode pre-suggests (&ldquo;morning — admin?&rdquo;). Collapsed by default; zero penalty for skipping.
        </p>
        <Frame label="Today · shape today expanded" note="spans full width above split · collapses to header btn">
          <TodayHeader mode="admin" shaped />
          <div className="mt-4 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/10 p-4">
            <Anno>soft timeline · full width band · then split desk below</Anno>
            <div className="grid gap-2 sm:grid-cols-3">
              {["morning", "afternoon", "evening"].map((block) => (
                <div key={block} className="rounded-lg border border-dashed border-border bg-surface p-3">
                  <p className="text-xs font-semibold uppercase text-faint">{block}</p>
                  <p className="mt-1 text-sm text-muted">{block === "morning" ? "admin block?" : "—"}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">Split desk scrolls below when shape is open</p>
        </Frame>
      </section>

      {/* ── PHONE ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Phone</h2>
        <div className="flex flex-wrap gap-8">
          <PhoneFrame label="Mode day">
            <div className="flex h-full flex-col">
              <p className="text-lg font-semibold text-ink">Today</p>
              <p className="text-xs text-accent">✦ Ship undertow</p>
              <p className="text-xs text-muted">admin day · 4 on bench</p>
              <div className="mt-3 flex-1 overflow-hidden space-y-3">
                <Zone label="admin · approved">
                  <TaskRowWire title="pay utilities" sub="home" state="waiting" />
                  <TaskRowWire title="schedule distro" sub="music" />
                </Zone>
                <Zone label="also today" dashed>
                  <TaskRowWire title="mix vocals" sub="creative" />
                </Zone>
              </div>
              <details className="mt-2 rounded-lg border border-border bg-canvas/40 px-2 py-1.5 text-xs">
                <summary className="cursor-pointer text-muted">lifted · 2</summary>
                <p className="text-faint">stems · hotel</p>
              </details>
              <div className="mt-auto border-t border-line pt-2">
                <CaptureFooter />
              </div>
            </div>
          </PhoneFrame>
          <PhoneFrame label="Open day">
            <div className="flex h-full flex-col space-y-2">
              <p className="text-lg font-semibold text-ink">Today</p>
              <p className="text-xs text-faint italic">open day</p>
              <Zone label="today · assigned">
                <TaskRowWire title="mix vocals" sub="music" />
              </Zone>
              <details className="rounded-lg border border-border bg-canvas/40 px-2 py-1.5" open>
                <summary className="cursor-pointer text-xs font-medium text-ink">add from area</summary>
                <RailLifeAreas />
              </details>
              <div className="mt-auto border-t border-line pt-2">
                <CaptureFooter />
              </div>
            </div>
          </PhoneFrame>
        </div>
      </section>

      {/* ── SORT + ROW RULES ── */}
      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Bench sort · row metadata</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Sort within mode bench</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
              <li>Due ≤3d (ember)</li>
              <li>In progress</li>
              <li>Carried</li>
              <li>Rest by due date · no date last</li>
              <li>Waiting-on: visible, distinct style — not sorted to bottom</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Row · max 2 accessories on phone</p>
            <ul className="mt-2 space-y-1 text-muted">
              <li>· Title first · life-area color always</li>
              <li>· Project or mode as subline · not both on phone</li>
              <li>· When-label beats person beats mode for accessories</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── BUILD NOTES ── */}
      <footer className="rounded-xl border border-border bg-surface p-5 text-sm">
        <p className="font-medium text-ink">Implementation order</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
          <li>Filter mode bench: <span className="font-mono text-xs">approvedTaskIds ∩ mode match</span></li>
          <li>Open day: life-area cards + picker sheet → sets inToday</li>
          <li>Mid-week: approve-for-week action + optional banner</li>
          <li>Lifted block + capture strip</li>
          <li>Day shape expand/collapse</li>
          <li>Layout: split desk (main bench + side rail + capture footer)</li>
        </ol>
      </footer>
    </div>
  );
}