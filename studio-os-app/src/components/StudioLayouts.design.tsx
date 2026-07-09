/**
 * DESIGN HANDOFF — Studio OS functional layouts (v2)
 * --------------------------------------------------
 * Layout-first wireframes. NOT wired to data. NOT final visual design.
 *
 * v2 changes (from our critique of v1 + the round-two mock):
 * - Shell drawn once; every screen after is content-only at true proportions.
 * - Dashboard: greeting = header not a card · one dominant hero · radar
 *   dedupes against the hero · whispers collapse into one status strip ·
 *   balance is a slim rail, not a full-width row.
 * - Today: collapsed day-shape = dots on a thin line under header (design target;
 *   see DayShapeCollapsedStrip.design.tsx). Expanded shape panel is functional v1.
 *   Desk margins around the bench are deliberate and annotated.
 * - Lot proves 6 user-defined areas, not a fixed 3.
 * - Quick Edit gets a real desktop frame.
 * - Horizon joins the nav.
 */

import Link from "next/link";
import {
  Anno,
  BalanceBars,
  Frame,
  LensTabs,
  PhoneFrame,
  Placeholder,
  TabBar,
  TaskRowWire,
  Tap,
  Zone,
} from "@/components/design/wireframe-primitives";

const TOC = [
  { id: "shell", label: "App shell (once)" },
  { id: "two-rooms", label: "Dashboard vs Today" },
  { id: "lot", label: "Tasks (Lot)" },
  { id: "inbox", label: "Inbox + capture" },
  { id: "quick-edit", label: "Quick Edit" },
  { id: "horizon", label: "Horizon" },
  { id: "projects", label: "Projects" },
  { id: "review", label: "Weekly Review" },
  { id: "settings", label: "Settings" },
  { id: "coming", label: "Coming later" },
];

/* ────────────────────────────────────────────────────────────────────────
   Screen contents — components so the squint test can reuse them.
   ──────────────────────────────────────────────────────────────────────── */

function DashboardContent() {
  return (
    <div className="space-y-4">
      {/* greeting = page header, not a boxed card */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-ink">Good evening</p>
          <p className="text-sm text-muted">Tuesday, July 8</p>
        </div>
        <Anno>greeting is the page header — no box, no task list</Anno>
      </div>

      {/* one thin status strip — all whispers share a single line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-dashed border-faint bg-canvas/60 px-3 py-2 text-xs text-muted">
        <Anno className="normal-case tracking-normal">status strip ·</Anno>
        <span>
          2 scraps to file <Tap>inbox</Tap>
        </span>
        <span>
          plan the week <Tap>ritual — week-start day only</Tap>
        </span>
        <span>3 waiting on others</span>
      </div>

      {/* hero dominates; radar + balance share a slim right rail */}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Zone label="today jump-in · THE HERO" note="count + first 4 · complete inline · tap row → Today">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-ink">5</span>
            <span className="text-sm text-muted">in Today</span>
          </div>
          <div className="mt-2">
            <TaskRowWire title="master delivery — undertow" accessories={["due today"]} />
            <TaskRowWire title="mix vocals on the bridge" accessories={["today"]} />
            <TaskRowWire title="advance the leeds show" accessories={["jul 15 · in 7"]} />
            <TaskRowWire title="grant report — first draft" accessories={["carried 2d"]} />
          </div>
          <p className="mt-2 text-xs text-accent">
            <Tap>open today →</Tap>
          </p>
        </Zone>

        <div className="space-y-4">
          <Zone label="deadline radar" note="hard dates NOT already shown in the hero">
            <TaskRowWire title="grant report" accessories={["jul 11 · in 3"]} />
            <TaskRowWire title="visa renewal" accessories={["jul 22 · in 14"]} />
            <TaskRowWire title="poster print run" accessories={["aug 2 · in 25"]} />
            <p className="mt-1.5 text-[11px] text-muted">
              Dedupe rule: a task in the hero carries its own date chip there — the radar starts after it.
            </p>
            <Tap>horizon →</Tap>
          </Zone>

          <Zone label="life balance · slim rail" note="counts only, never task names">
            <BalanceBars
              areas={[
                ["Release", 9],
                ["Touring", 14],
                ["Promo", 5],
                ["Grant", 4],
                ["Admin", 3],
              ]}
            />
          </Zone>
        </div>
      </div>
    </div>
  );
}

function TodayContent() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-ink">Today</p>
          <p className="text-sm text-muted">Tue Jul 8 · 5 on bench · 2 lifted</p>
        </div>
        <div className="text-right">
          <button type="button" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink">
            shape today ▾
          </button>
          <p className="mt-1 text-[10px] text-faint">only entry point — no duplicate collapsed bar</p>
        </div>
      </div>

      {/* deliberate desk margins left+right of the bench */}
      <div className="grid grid-cols-[1fr_minmax(0,640px)_1fr] gap-3">
        <div className="hidden items-center justify-center rounded-lg border border-dashed border-faint/60 md:flex">
          <Anno className="rotate-180 [writing-mode:vertical-rl]">desk margin · deliberate</Anno>
        </div>

        <Zone label="the bench · HERO" note="one continuous column — lift, capture, caught all live here">
          <TaskRowWire title="master delivery — undertow" sub="release · undertow EP" accessories={["due today"]} />
          <TaskRowWire title="mix vocals on the bridge" sub="release · deep focus" accessories={["today"]} />
          <TaskRowWire title="advance the leeds show" sub="touring" accessories={["jul 15 · in 7"]} />
          <TaskRowWire title="grant report — first draft" sub="grant" accessories={["carried 2d"]} />
          <TaskRowWire title="artwork sign-off" sub="promo" accessories={["waiting · marcus"]} state="waiting" />

          <div className="mt-3 border-t border-line pt-2">
            <Anno>lifted today — visible until day ends</Anno>
            <TaskRowWire title="send stems to nadia" accessories={["4:12p"]} state="done" />
            <TaskRowWire title="confirm the hotel block" accessories={["11:20a"]} state="done" />
          </div>

          <div className="mt-3 border-t border-line pt-2">
            <Anno>capture · inline — same smart parse as inbox</Anno>
            <div className="mt-1.5 rounded-lg border border-dashed border-faint px-3 py-2 text-sm text-muted">
              + capture a thought…
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Anno>caught today ·</Anno>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">tape delay on outro</span>
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">email re: sync licensing</span>
            </div>
          </div>
        </Zone>

        <div className="hidden items-center justify-center rounded-lg border border-dashed border-faint/60 md:flex">
          <Anno className="rotate-180 [writing-mode:vertical-rl]">desk margin · deliberate</Anno>
        </div>
      </div>

      <p className="text-xs text-muted">
        <strong className="text-ink">Tap circle</strong> = lift · <strong className="text-ink">tap title</strong> = Work
        View · <strong className="text-ink">tap meta / ⋯</strong> = Quick Edit
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────── */

export default function StudioLayoutsDesign() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-14 px-6 py-10">
      <header>
        <Link href="/design" className="text-sm font-medium text-muted hover:text-accent">
          ← Design lab
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          Studio OS — functional layouts <span className="text-muted">v2</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          The map. Structure and hierarchy first; design makes it beautiful after we lock this.
        </p>
      </header>

      <nav className="rounded-xl border border-border bg-surface p-4">
        <Anno>jump to screen</Anno>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="text-accent hover:underline">
                {t.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/design/task-open" className="text-accent hover:underline">
              Work View ↗
            </Link>
          </li>
        </ul>
      </nav>

      {/* ── SHELL, ONCE ── */}
      <section id="shell" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">App shell — drawn once, never again</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Every desktop frame below shows <strong className="text-ink">content only</strong> — assume this chrome
            around it. Horizon is now in the nav (it was orphaned before).
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-8">
          <div className="w-full max-w-[560px]">
            <Anno className="mb-2">desktop · sidebar 200 + content ≤1160</Anno>
            <div className="grid min-h-[300px] grid-cols-[130px_1fr] overflow-hidden rounded-xl border-2 border-ink/70">
              <aside className="border-r border-border bg-surface p-3">
                <p className="text-xs font-semibold text-ink">Studio OS</p>
                <nav className="mt-3 space-y-1 text-[11px] text-muted">
                  {["Dashboard", "Today", "Tasks", "Horizon", "Inbox", "Projects", "Weekly Review", "Settings"].map(
                    (n) => (
                      <p key={n} className={n === "Horizon" ? "font-semibold text-accent" : ""}>
                        {n}
                        {n === "Horizon" && " ← added"}
                      </p>
                    )
                  )}
                </nav>
              </aside>
              <div className="bg-canvas/50 p-3">
                <div className="mb-2 rounded border border-border bg-surface px-2 py-1">
                  <Anno>top bar · sheet sync status</Anno>
                </div>
                <div className="flex h-40 items-center justify-center rounded border border-dashed border-faint">
                  <Anno>screen content</Anno>
                </div>
              </div>
            </div>
          </div>
          <div className="w-[240px]">
            <Anno className="mb-2">phone 390 · bottom tabs · ＋ = capture</Anno>
            <div className="overflow-hidden rounded-2xl border-2 border-ink/70 bg-surface">
              <div className="flex h-40 items-center justify-center bg-canvas/50">
                <Anno>screen content</Anno>
              </div>
              <TabBar />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Dashboard lives behind the Today tab's date header on phone — Today is home.
            </p>
          </div>
        </div>
      </section>

      {/* ── TWO ROOMS ── */}
      <section id="two-rooms" className="scroll-mt-6 space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">The two rooms — survey vs sit-down</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            The round-two failure was these feeling identical. Structure now enforces the split:{" "}
            <strong className="text-ink">Dashboard = wide grid, counts, glance</strong> ·{" "}
            <strong className="text-ink">Today = one narrow column with desk margins, tasks, live-in</strong>.
          </p>
        </div>

        <Frame label="Dashboard" note='job: "what does today look like?" answered in 5 seconds'>
          <DashboardContent />
        </Frame>

        <Frame label="Today · shape collapsed" note="job: the screen you live on — self-sufficient for a normal day">
          <TodayContent />
        </Frame>

        <Frame label="Today · shape expanded" note="optional soft timeline — never a minute grid">
          <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_1fr]">
            <div className="rounded-lg border border-border bg-canvas/30 p-3 text-xs">
              <Anno>calendar · read-only</Anno>
              <p className="mt-2 text-muted">10a — label session</p>
              <p className="mt-1 text-faint">~3 hrs open after</p>
              <p className="mt-1 text-muted">2p — venue call</p>
            </div>
            <Zone label="morning" dashed>
              <p className="text-xs text-ink">deep work — undertow</p>
              <p className="mt-1 text-[10px] text-faint">pre-filled from week focus</p>
            </Zone>
            <Zone label="afternoon" dashed>
              <p className="text-xs text-ink">advance the leeds show</p>
            </Zone>
            <Zone label="evening" dashed>
              <p className="text-xs text-faint">open — no plan is a plan</p>
            </Zone>
          </div>
          <p className="mt-2 text-xs text-muted">
            Drag from the bench into a slot · no red when plans slip · collapses entirely if unused. Bench stays the
            hero below (unchanged from the collapsed state).
          </p>
        </Frame>

        {/* squint test — same content, shrunk, side by side */}
        <div>
          <Anno className="mb-2">squint test — same two screens at 40%, side by side. do they read as different rooms?</Anno>
          <div className="grid gap-4 lg:grid-cols-2" style={{ zoom: 0.4 }}>
            <div className="rounded-xl border-2 border-ink/40 bg-surface p-6">
              <DashboardContent />
            </div>
            <div className="rounded-xl border-2 border-ink/40 bg-surface p-6">
              <TodayContent />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          <PhoneFrame label="Dashboard · phone" note="hero → radar → strip → balance">
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold text-ink">Good evening</p>
                <p className="text-xs text-muted">Tue Jul 8</p>
              </div>
              <Zone label="today jump-in · hero">
                <TaskRowWire title="master delivery" accessories={["due today"]} />
                <TaskRowWire title="mix vocals" accessories={["today"]} />
                <Tap>open today →</Tap>
              </Zone>
              <Zone label="deadline radar" note="deduped, 3 max">
                <TaskRowWire title="grant report" accessories={["in 3"]} />
              </Zone>
              <div className="rounded-lg border border-dashed border-faint px-3 py-2 text-[11px] text-muted">
                2 scraps · plan the week · 3 waiting
              </div>
              <Zone label="balance" note="horizontal scroll">
                <div className="flex gap-2 text-[10px] text-muted">
                  <span>REL 9</span>
                  <span>TOUR 14</span>
                  <span>PRO 5</span>
                  <span>→</span>
                </div>
              </Zone>
            </div>
          </PhoneFrame>

          <PhoneFrame label="Today · phone" note="bench + sticky capture">
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-lg font-semibold text-ink">Today</p>
                <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted">shape ▾</span>
              </div>
              <Zone label="bench · hero" note="max 2 accessories per row">
                <TaskRowWire title="master delivery" sub="release" accessories={["due today"]} />
                <TaskRowWire title="mix vocals on the bridge" sub="release" accessories={["today"]} />
                <TaskRowWire title="advance leeds" sub="touring" accessories={["in 7"]} />
                <TaskRowWire title="artwork sign-off" sub="promo" accessories={["marcus"]} state="waiting" />
              </Zone>
              <Zone label="caught today" dashed>
                <p className="text-[11px] text-muted">tape delay on outro · email re: sync</p>
              </Zone>
              <div className="rounded-full border border-border px-4 py-2.5 text-center text-sm text-muted">
                ＋ capture a thought…
              </div>
            </div>
          </PhoneFrame>
        </div>
      </section>

      {/* ── LOT ── */}
      <section id="lot" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Tasks — the Lot</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> everything active that isn&apos;t in Today, one lens at a
            time. The density test: this must survive <strong className="text-ink">6+ user-defined areas</strong>, not a
            curated 3.
          </p>
        </div>
        <Frame label="Lot · by area" note="groups wrap 3-up · each scrolls · sorted by effective date">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <LensTabs active="by area" />
            <div className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted">
              search all tasks…
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Release", 9],
              ["Touring", 14],
              ["Promo", 5],
              ["Grant", 4],
              ["Admin", 3],
              ["Health", 2],
            ].map(([name, n]) => (
              <Zone key={name} label={`${name} · ${n}`}>
                <TaskRowWire title="task title" accessories={["this week"]} />
                <TaskRowWire title="another task" accessories={["later"]} />
                {(n as number) > 3 && <p className="mt-1 text-[10px] text-faint">+{(n as number) - 2} more · scrolls</p>}
              </Zone>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            <Tap>title → Work View</Tap> · <Tap>⋯ → Quick Edit</Tap> · drag or swipe → Today · &quot;when&quot; lens
            buckets: today / this week / later / someday · waiting lens shows &quot;quiet for N days&quot;
          </p>
        </Frame>
        <PhoneFrame label="Lot · phone" note="stacked groups, lens tabs scroll horizontally">
          <div className="space-y-3">
            <LensTabs active="by when" />
            <Zone label="this week · 4">
              <TaskRowWire title="advance leeds" accessories={["in 7"]} />
              <TaskRowWire title="press photos" />
            </Zone>
            <Zone label="later · 11">
              <TaskRowWire title="book mastering" />
            </Zone>
          </div>
        </PhoneFrame>
      </section>

      {/* ── INBOX ── */}
      <section id="inbox" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Inbox + capture</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> thought → captured in one beat. Nothing slows it.
          </p>
        </div>
        <Frame label="Inbox" note="capture on top · unfiled scraps below · empty tray = small pleasure">
          <div className="mx-auto max-w-lg space-y-3">
            <div className="rounded-lg border-2 border-accent/40 bg-surface px-4 py-3 text-sm text-muted">
              mix vocals friday…
            </div>
            <p className="text-xs text-muted">enter → smart parse fills deadline/plan → Quick Edit opens pre-filled → filed</p>
            <Zone label="unfiled scraps · 2">
              <TaskRowWire title="email re: sync licensing" sub="parsed: no project yet" />
              <TaskRowWire title="try the tape delay on the outro" />
              <Tap>tap scrap → Quick Edit to file</Tap>
            </Zone>
          </div>
        </Frame>
      </section>

      {/* ── QUICK EDIT ── */}
      <section id="quick-edit" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Quick Edit — the most-used control</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> file or adjust in seconds. One-tap chips, implicit save.
            Field order locked: title → area → project → plan → deadline → mode → person → Today toggle → Work View →
            delete.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-8">
          <Frame label="Quick Edit · desktop" note="floating panel over the list — you never leave where you were">
            <div className="relative">
              <div className="opacity-30">
                <TaskRowWire title="task behind panel" accessories={["today"]} />
                <TaskRowWire title="another task" />
                <TaskRowWire title="a third task" accessories={["in 7"]} />
              </div>
              <div className="absolute right-0 top-0 w-72 rounded-xl border-2 border-ink bg-surface p-4 shadow-lg">
                <p className="text-sm font-medium text-ink">mix vocals friday</p>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <Anno>life area</Anno>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full border border-accent bg-accent-soft px-2 py-0.5">release</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-muted">touring</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-muted">+4</span>
                    </div>
                  </div>
                  <div>
                    <Anno>project · plan · deadline · mode · person</Anno>
                    <Placeholder lines={2} className="mt-1" />
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-2">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-white">in Today ✓</span>
                    <Tap>open Work View</Tap>
                  </div>
                </div>
              </div>
            </div>
          </Frame>
          <PhoneFrame label="Quick Edit · phone" note="bottom sheet · swipe down = save + dismiss">
            <div className="relative h-full min-h-[480px]">
              <div className="opacity-30">
                <Placeholder lines={5} />
              </div>
              <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-2 border-ink bg-surface p-4">
                <p className="text-base font-medium text-ink">mix vocals friday</p>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <Anno>life area — one-tap chips</Anno>
                    <div className="mt-1 flex gap-1">
                      <span className="rounded-full border border-accent bg-accent-soft px-2 py-0.5">release</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-muted">touring</span>
                    </div>
                  </div>
                  <div>
                    <Anno>project · plan · deadline · mode · person · Today</Anno>
                    <Placeholder lines={3} className="mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </section>

      {/* ── HORIZON ── */}
      <section id="horizon" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Horizon</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> every hard deadline, calm, at once. The only screen where
            ember dominates — and only for overdue.
          </p>
        </div>
        <Frame label="Horizon" note="overdue surfaces on top · then buckets · always relative + absolute dates">
          <div className="mx-auto max-w-lg space-y-3">
            <Zone label="overdue · ember" className="border-danger/40">
              <TaskRowWire title="stem delivery — label" sub="release" accessories={["jul 6 · 2d over"]} />
            </Zone>
            {[
              ["today", "master delivery", "jul 8 · today"],
              ["this week", "grant report", "jul 11 · in 3"],
              ["this month", "leeds advance", "jul 15 · in 7"],
              ["later", "visa renewal", "aug 22 · in 45"],
            ].map(([bucket, title, date]) => (
              <Zone key={bucket} label={bucket}>
                <TaskRowWire title={title} sub="project name" accessories={[date]} />
              </Zone>
            ))}
          </div>
        </Frame>
      </section>

      {/* ── PROJECTS ── */}
      <section id="projects" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Projects</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> index = all projects by area · room = one project&apos;s
            world with its why up top.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Frame label="Index" note="grouped by life area">
            <Zone label="release">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-3 text-sm">
                  <p className="font-medium text-ink">undertow EP</p>
                  <p className="mt-0.5 text-xs text-muted">why line · 4 open · 2 people</p>
                  <Tap>room →</Tap>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3 text-sm">
                  <p className="font-medium text-ink">spring single</p>
                  <p className="mt-0.5 text-xs text-muted">why line · 2 open</p>
                </div>
              </div>
            </Zone>
          </Frame>
          <Frame label="Project room" note="why displayed with pride · tasks · people · Drive links">
            <div className="space-y-3">
              <Zone label="why · north star">
                <p className="text-sm italic text-muted">
                  &ldquo;Put the body of work I&apos;m proudest of into the world.&rdquo;
                </p>
              </Zone>
              <Zone label="active tasks · add inline">
                <TaskRowWire title="mix vocals on the bridge" accessories={["today"]} />
                <TaskRowWire title="master delivery" accessories={["due today"]} />
              </Zone>
              <Zone label="people · drive links" dashed>
                <Placeholder lines={1} />
              </Zone>
            </div>
          </Frame>
        </div>
      </section>

      {/* ── REVIEW ── */}
      <section id="review" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Weekly Review</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> close the week honestly, set the next. The one screen
            allowed to feel warmer/slower in the pretty pass.
          </p>
        </div>
        <Frame label="Weekly Review" note="switcher → stats → boards → reflection, top to bottom">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
              <span>←</span>
              <span>jul 1 – jul 7</span>
              <span>→</span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                ["Shipped", "12"],
                ["Carried", "3"],
                ["Deadlines hit", "2/2"],
                ["Studio time", "9.5h"],
              ].map(([s, v]) => (
                <Zone key={s} label={s} className="text-center">
                  <p className="text-xl font-semibold tabular-nums text-ink">{v}</p>
                </Zone>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Zone label="shipped this week">
                <Placeholder lines={3} />
              </Zone>
              <Zone label="in flight">
                <Placeholder lines={2} />
              </Zone>
              <Zone label="carried over">
                <Placeholder lines={2} />
              </Zone>
            </div>
            <Zone label="reflection + next week intentions" note="free text · persists per week">
              <Placeholder lines={2} />
            </Zone>
          </div>
        </Frame>
      </section>

      {/* ── SETTINGS ── */}
      <section id="settings" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Settings</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            <span className="font-medium text-ink">Job:</span> tool bench, not a screen of glory.
          </p>
        </div>
        <Frame label="Settings" note="plain rows, top to bottom">
          <div className="mx-auto max-w-md space-y-2">
            {[
              "Week start day",
              "Google connection — one unified sign-in",
              "Linked Sheet · name / link / re-sync",
              "Life areas · add / rename / recolor / archive",
              "Daylight override · auto / always day / always evening",
              "Sign out",
            ].map((row) => (
              <div key={row} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink">
                {row}
              </div>
            ))}
          </div>
        </Frame>
      </section>

      {/* ── COMING ── */}
      <section id="coming" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Coming later — known, not designed</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Sessions", "start/end on a task · reentry note · feeds review stats + in-nav indicator"],
            ["Shelf", "shipped archive, newest first · a mirror, never analytics"],
            ["Logbook", "auto-assembled studio diary · then-vs-now moments"],
            ["Recipes", "milestone chain marching toward an anchor date"],
            ["Waiting-on", "already a lens in the Lot + a Dashboard whisper — no new screen"],
            ["Duration memory", "hooks on Work View + project rooms once sessions exist"],
          ].map(([name, desc]) => (
            <div key={name} className="rounded-lg border border-dashed border-faint bg-surface/50 p-4">
              <p className="font-medium text-ink">{name}</p>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
        <p>
          <strong className="text-ink">How we work this:</strong> walk one screen at a time — add, cut, reorder zones.
          When the map locks, this page + the round-two token sheet become the contract design gets. Pretty never
          changes structure.
        </p>
      </footer>
    </div>
  );
}
