/**
 * DESIGN SPEC — Planning methodology (locked)
 * -------------------------------------------
 * Dual-layer: life area cards (context) + mode per day (commitment).
 * Receipt → Approve work → Place modes → Lock (stepped wizard).
 */

import Link from "next/link";
import {
  Anno,
  Frame,
  TaskRowWire,
  Zone,
} from "@/components/design/wireframe-primitives";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-accent/40 bg-accent-soft/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
      {children}
    </span>
  );
}

export default function MethodologyDesign() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-14 px-6 py-10">
      <header>
        <Link href="/design" className="text-sm font-medium text-muted hover:text-accent">
          ← Design lab
        </Link>
        <p className="mt-2">
          <Pill>locked methodology</Pill>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          Planning methodology
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Deadlines, intention, and proof — one loop, not three features. Layout comes after this.
        </p>
      </header>

      {/* ── NORTH STAR ── */}
      <section className="rounded-xl border-2 border-accent/40 bg-accent-soft/15 p-5">
        <Anno>emotional job</Anno>
        <p className="mt-2 text-lg font-medium text-ink">Peace of mind — capable, on track, nothing falling through cracks.</p>
        <p className="mt-2 text-sm text-muted">
          The app does <strong className="font-medium text-ink">all three</strong> at once: stay on top of deadlines,
          set intention in light of those deadlines, and show proof you&apos;re not falling behind. Not pick-one.
        </p>
      </section>

      {/* ── TRUST CHAIN ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">The trust chain</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          {[
            ["Review", "Close the week — receipt + reflection"],
            ["Plan", "Shape next week — horizon + intention"],
            ["Today", "Execute all week — don’t re-decide"],
            ["Proof", "Ships accumulate — Shelf, Logbook, Review"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-border bg-surface p-3">
              <p className="font-medium text-ink">{title}</p>
              <p className="mt-1 text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DUAL LAYER ── */}
      <section className="rounded-xl border-2 border-ink/25 bg-canvas/50 p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Dual layer — two axes, two jobs</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Life area · context</p>
            <p className="mt-1 text-muted">
              Music, Home, Income… Balance, deadlines nested inside, quiet piles, waiting-on.{" "}
              <strong className="text-ink">Read the room</strong> — what part of life needs attention.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium text-ink">Work mode · commitment</p>
            <p className="mt-1 text-muted">
              Admin, Creative, Outreach… Assign <strong className="text-ink">mode per day</strong> on the week strip.
              Stay in one headspace — reduces context switching (neurodivergent-friendly).
            </p>
          </div>
        </div>
        <p className="text-sm text-muted">
          Category cards inform mode days (Music ship date → more creative days). The strip is the plan. Today inherits{" "}
          <strong className="text-ink">today&apos;s mode</strong>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">One ritual · four steps</h2>
        <p className="max-w-3xl text-sm text-muted">
          ~5 minutes. Stepped wizard on desktop and phone. Receipt first, approve what&apos;s in scope, place modes on
          days, lock with a full week overview.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-accent">1 · Receipt</p>
            <p className="mt-1 font-medium text-ink">Proof + balance mirror</p>
            <p className="mt-2 text-sm text-muted">Shipped, carried, which life areas were loud or quiet. Full band from Dashboard; lighter if just finished Review.</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-accent">2 · Approve work</p>
            <p className="mt-1 font-medium text-ink">Life area cards · per-task checkboxes</p>
            <p className="mt-2 text-sm text-muted">
              Sweep every area — in progress first, open sorted by due date (jul 8 · 2d). Checkbox what&apos;s in this
              week&apos;s scope. Unapproved tasks stay visible but don&apos;t drive mode load.
            </p>
          </div>
          <div className="rounded-xl border-2 border-accent bg-surface p-4">
            <p className="text-xs font-bold text-accent">3 · Place modes</p>
            <p className="mt-1 font-medium text-ink">Approved tasks + mode strip</p>
            <p className="mt-2 text-sm text-muted">
              Approved tasks shown read-only (grouped by mode). Mode load pills (creative · 5) drag onto week strip.
              Intention + trust check: approved deadlines covered by mode days before due.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-bold text-accent">4 · Lock</p>
            <p className="mt-1 font-medium text-ink">Week overview + theme</p>
            <p className="mt-2 text-sm text-muted">
              Full week at a glance — strip, day-by-day modes, approved task counts. Week theme (optional: use intention).
              Lock. Today inherits today&apos;s mode.
            </p>
          </div>
        </div>
      </section>

      {/* ── REVIEW → PLAN ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Review → Plan handoff</h2>
        <p className="max-w-3xl text-sm text-muted">
          The week doesn&apos;t start on the Dashboard. It starts when you close last week — but planning is never forced.
        </p>

        <Frame label="End of Weekly Review" note="new closing beat">
          <div className="mx-auto max-w-lg space-y-4">
            <Zone label="reflection + next week intentions" note="built">
              <p className="text-sm text-muted italic">&ldquo;Next week I want to finish the undertow mix and…&rdquo;</p>
            </Zone>
            <div className="rounded-xl border-2 border-accent bg-accent-soft/25 p-4">
              <p className="text-sm font-medium text-ink">Ready to shape next week?</p>
              <p className="mt-1 text-sm text-muted">Opens planning. Your intentions will be shown — not auto-filled.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">shape next week →</span>
                <span className="rounded-lg border border-border px-4 py-2 text-sm text-muted">not now</span>
              </div>
            </div>
          </div>
        </Frame>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium text-ink">If yes → Plan</p>
            <p className="mt-2 text-muted">Opens stepped wizard: Receipt → Approve work → Place modes → Lock.</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium text-ink">If not now → defer gracefully</p>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li>· System records that planning was declined (no nag that day)</li>
              <li>· Dashboard shows a gentle <strong className="font-medium text-ink">plan your week</strong> button when you&apos;re ready</li>
              <li>· Settings: <strong className="font-medium text-ink">remind me to plan on</strong> [user picks a day, e.g. Monday]</li>
              <li>· Week-start day still gets prominent card if still unplanned</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── APPROVE FOR THIS WEEK ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Approve for this week — the missing bridge</h2>
        <p className="max-w-3xl text-sm text-muted">
          Deadlines suggest; you approve. Within each life area, tasks split into{" "}
          <strong className="text-ink">in progress</strong> and <strong className="text-ink">open</strong> (sorted by due
          date, showing jul 8 · 2d). Approved tasks file into mode load.
        </p>
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <Anno>not whole-area toggles</Anno>
          <p className="mt-2 text-muted">
            Per-task approval inside life area cards. Unapproved tasks stay visible but don&apos;t drive mode load or trust
            check.
          </p>
        </div>
        <ol className="max-w-3xl list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Step 2 — sweep life areas: in progress + open (by due date · Nd), approve per task</li>
          <li>Step 3 — approved tasks visible read-only · mode load pills drag onto strip · intention</li>
          <li>Trust check — approved deadlines covered by mode days</li>
          <li>Step 4 — full week overview + theme + lock</li>
        </ol>
      </section>

      {/* ── LIFE CATEGORIES ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Life categories — deadlines nested inside</h2>
        <p className="max-w-3xl text-sm text-muted">
          No flat deadline list. Each life category is a card: open pile, carried count, quiet signal, and{" "}
          <strong className="text-ink">deadlines listed inside the category</strong>. The nearest deadline in a category
          helps you see which categories to prioritize on which days — release rises because ship date is Jul 15, not
          because you toggled anything on.
        </p>

        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <Anno>priority sort (display only)</Anno>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
            <li>Categories with a deadline in the next ~14 days — soonest first</li>
            <li>Quiet categories (open pile + nothing shipped recently)</li>
            <li>Rest — collapsible</li>
          </ol>
        </div>

        <Frame label="Category cards · sorted by urgency" note="beat 2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Zone label="music · nearest deadline">
              <p className="text-sm font-medium text-ink">14 open · 1 carried</p>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                <li>master delivery · jul 8 · 2d</li>
                <li>ship undertow mix · jul 15 · 9d</li>
              </ul>
              <span className="mt-2 inline-block text-xs text-muted">deadlines → more creative/admin mode days as needed</span>
            </Zone>
            <Zone label="home · quiet pile">
              <p className="text-sm font-medium text-ink">6 open · 2 waiting on · quiet 2 weeks</p>
              <p className="text-xs text-faint italic">no hard dates — separate from admin mode</p>
              <span className="mt-2 inline-block text-xs text-muted">quiet pile → candidate for an admin mode day</span>
            </Zone>
            <Zone label="errands · life area">
              <p className="text-sm font-medium text-ink">3 open · dentist fri</p>
              <p className="text-xs text-muted">Errands is both a life area and a work mode — area for categorizing tasks, mode for batching errand days</p>
            </Zone>
          </div>
        </Frame>
      </section>

      {/* ── SHAPE DAYS (MODE) ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Shape days — work mode per day</h2>
        <p className="max-w-3xl text-sm text-muted">
          The week strip assigns a <strong className="text-ink">work mode per day when you choose one</strong>. Unassigned
          days stay <strong className="text-ink">open</strong>. Built as{" "}
          <code className="text-xs">days[].focus kind: mode</code>. Not life area. Not individual tasks. Calendar load =
          context only.
        </p>

        <Frame label="Week strip + day picker" note="beat 4 · deadline markers on days">
          <p className="mb-3 text-xs text-muted">
            mon · creative ● · tue · creative ●● · thu · admin · sat · errands · wed/sun · open
          </p>
          <p className="mb-3 text-xs text-faint">● = deadline lands that day · mid-week: past days show log summary</p>
          <Zone label="thursday selected">
            <p className="text-sm text-ink">Pick mode for Thursday:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["creative · 5", "admin · 5", "errands · 1", "outreach · 1"].map((c) => (
                <span
                  key={c}
                  className={[
                    "rounded-full border px-3 py-1 text-xs",
                    c.startsWith("admin") ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
                  ].join(" ")}
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">Mode load pills only · clear × returns day to open</p>
          </Zone>
        </Frame>

        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <Anno>intention · step 3 (on place-modes page, before dragging)</Anno>
          <p className="mt-2 text-muted italic">&ldquo;Last week you wrote: Finish the undertow mix…&rdquo;</p>
          <p className="mt-2 text-ink">This week: Ship undertow — creative early, admin Thursday.</p>
          <p className="mt-2 text-xs text-faint">Reminder only from last week · user writes fresh intention</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <Anno>theme · step 4 lock (after week overview)</Anno>
          <div className="mt-2 flex gap-2">
            <span className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white">use intention as theme</span>
            <span className="rounded-lg border border-border px-3 py-1 text-xs text-muted">write own theme</span>
          </div>
        </div>
      </section>

      {/* ── TODAY CONTRACT ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Today — inherits today&apos;s mode</h2>
        <Frame label="Today · Thursday · admin day">
          <div className="space-y-3">
            <p className="text-xl font-semibold text-ink">Today</p>
            <p className="text-sm text-accent">✦ Ship undertow — admin catch-up Thursday</p>
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">admin day</span> — you planned this Sunday
            </p>
            <Zone label="admin · all active admin-mode tasks">
              <TaskRowWire title="schedule distro upload" sub="music · admin" />
              <TaskRowWire title="pay utilities" sub="home · admin" accessories={["waiting"]} state="waiting" />
              <TaskRowWire title="draft tour budget" sub="music · admin" />
            </Zone>
            <Zone label="also today · inToday from other modes" dashed>
              <TaskRowWire title="mix vocals on bridge" sub="music · creative" />
            </Zone>
            <p className="text-xs text-muted">No focus queue on mode days — full mode pile shown. Open days: theme + inToday only.</p>
          </div>
        </Frame>
      </section>

      {/* ── EDGE CASES ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Edge cases (locked)</h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted">
          <li>· Past days on strip: read-only · log summary (shipped count, dominant mode) if mid-week entry</li>
          <li>· All-open week: valid lock (nothing dragged = every day open)</li>
          <li>· Life area card with 0 tasks: still show</li>
          <li>· Calendar-blocked day: can still assign mode</li>
          <li>· Waiting-on: in area pile, distinct; normal when cleared</li>
          <li>· Day Shape on Today: optional layer, separate from week plan</li>
        </ul>
      </section>
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Supporting systems — not the week ritual</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Horizon screen</p>
            <p className="mt-2 text-muted">
              Full immovable timeline anytime anxiety spikes mid-week. Week planning pulls a slice, not a duplicate ritual.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Recipes</p>
            <p className="mt-2 text-muted">
              Backward chains from anchor dates (drops, shows). For structured releases — separate from the horizon menu,
              but milestones can appear there when due.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Duration memory</p>
            <p className="mt-2 text-muted">
              Whispers under horizon rows when history exists. Information, not judgment. Cold start = no whisper, not a
              fake guess.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-ink">Balance</p>
            <p className="mt-2 text-muted">
              Reflective in Review. Glance in planning. Never quotas, never nudges like &ldquo;you should spend 30% on
              admin.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ── DATA CONTRACT ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">What the week plan stores (new + existing)</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Used for</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              {[
                ["theme", "built", "Today header all week"],
                ["intention", "new", "step 3 · informs mode days · optional source for theme"],
                ["days[].focus kind:mode", "built", "mode per day · incl. errands"],
                ["days[].note", "built", "optional subtitle under mode"],
                ["completedAt", "built", "“you planned this Sunday”"],
                ["planningDeclinedAt", "new", "respect deferral from Review"],
                ["planReminderDay", "new · settings", "gentle nudge day"],
              ].map(([field, source, use]) => (
                <tr key={field} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink">{field}</td>
                  <td className="px-4 py-2.5 text-xs">{source}</td>
                  <td className="px-4 py-2.5">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Deadlines grouped under life areas at display time. Mode assignment uses existing{" "}
          <code className="text-ink">DayFocus</code>.
        </p>
      </section>

      {/* ── DROPPED ── */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Explicitly not this</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>· [start this week] toggles</li>
          <li>· Life area assigned to days (use mode on strip instead)</li>
          <li>· Auto-fill intentions into theme</li>
          <li>· Focus queue on mode days</li>
          <li>· Per-task day assignment</li>
        </ul>
      </section>

      <footer className="rounded-xl border border-border bg-surface p-5 text-sm">
        <p className="font-medium text-ink">Wireframes</p>
        <p className="mt-2 text-muted">
          <Link href="/design/week-planning" className="text-accent hover:underline">
            Week planning functional layouts
          </Link>{" "}
          — stepped wizard spec. Walk through at{" "}
          <Link href="/design/week-planning" className="text-accent hover:underline">
            /design/week-planning
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
