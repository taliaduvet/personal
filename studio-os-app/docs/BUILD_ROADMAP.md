# Studio OS — Build Roadmap

*Last updated: August 17, 2026 (Habits system + session timer/transition-warning added)*  
*Single source of truth — what's live, what's next, and why it's ordered the way it is.*

---

## The promise

> **Nothing you've captured will silently fall through. What needs you will come to you. When the system can't keep that promise, it says so instead of looking fine.**

Studio OS is an external brain for an autistic musician managing parallel commitments (releases, grants, touring, day job, other artists). Every trade-off is decided in favour of that user. A half-trusted system is worse than none — so the design optimises for trustworthiness over capability and prefers saying nothing to saying something it hasn't earned.

---

## What's live right now

### App shell
- Next.js 16, Tailwind v4, local-first (localStorage), optional Google Sheet sync, optional Supabase cloud sync
- Deployed to **studio-os-246.netlify.app** — ⚠️ **manual deploy only**, not auto-deploy from `main`. Verified Aug 17, 2026: the Netlify site has no GitHub deploy hook or build_settings configured (`netlify api getSite` → `deploy_hook: null`, `build_settings: {}`). The documented "Deploy" command below (`netlify-cli deploy --prod`) is the only way changes go live — pushing to GitHub alone does nothing.
- ⚠️ **Local working tree can drift far ahead of both git and the live site.** As of Aug 17, 2026 a large amount of work described as done elsewhere in this doc (Trust Core, nudges, delivery prompt, error boundaries, settings-merge, defer-today, etc. — `src/lib/trust/`, `src/lib/nudges.ts`, `src/components/TrustPanel.tsx`, `src/components/DeliveryPrompt.tsx`, and ~50 more files) was **never committed**, so it was never deployed either. Before trusting any "✅ Live" claim in this doc, check `git status` — if the file isn't committed, it isn't live.
- **Dark mode** — system auto (time-based: light 7am–8pm, dark otherwise), manual ☀︎/Auto/☽ toggle in sidebar
- **Source Serif 4** loaded via Next.js font pipeline (used in Journal compose)

### Navigation
| Route | Screen | Status |
|-------|--------|--------|
| `/` | Dashboard + Trust Panel | ✅ Live |
| `/today` | Today (mode bench, captures, day shape) | ✅ Live |
| `/journal` | Journal (list, calendar, compose, detail) | ✅ Live |
| `/practice` | Practice — personal hypermobility routine tracker (Daily/Stability/Mobility + Notes, per-item timers, weekly compliance grid, feel log) | ✅ Live — deployed to production Aug 17, 2026 |
| `/habits` | Habits — general, user-editable habit tracker (Break resets / Routines, weekly target, 7-day history, archive/restore) | ⚠️ Built + verified locally, **not committed, not deployed** |
| `/tasks` | Tasks Lot (5 lenses + search) | ✅ Live |
| `/inbox` | Inbox + smart capture parse | ✅ Live |
| `/projects` | Projects index + room | ✅ Partial (no sheet project write) |
| `/deadlines` | Horizon (M1 buckets, overdue-first) | ✅ Live |
| `/weekly-review` | Weekly Review (studio time, make/manage, 3-col boards) | ✅ Live |
| `/archive` | Archive wing (Shelf → Logbook → Recipes) | ✅ Live |
| `/settings` | Settings (week start, life areas, sheet/calendar connect) | ✅ Partial |
| `/logbook` | Logbook diary | ✅ Live |

### Features by sprint

**Sprints A–E (all shipped)**

| Sprint | What it delivered |
|--------|-------------------|
| A | Timestamps (`completedAt` ISO), shared date helper, sync indicator, Horizon overdue section |
| B | Sessions (start/end on task, reentry notes), Activity Log |
| C | Waiting-on task state + Lot lens, Weekly Review make/manage bar |
| D | Archive wing — Shelf (shipped wall), Logbook (studio diary), Recipes (release chains) |
| E | Duration memory (honest task durations), Day Ledger, day-close retro (time + tag + tomorrow note) |

**Post-sprint E (recent additions)**
- **Push notifications** — service worker + Supabase-backed cloud push queue
- **Cloud sync** — Supabase vault syncs tasks across devices
- **AI morning briefing** — `/api/briefing` endpoint (Gemini-powered), daily summary
- **Quick capture** — `/api/capture` endpoint + share-sheet integration
- **Export** — data export from Settings
- **Trust Core (Layer 7A)** — `src/lib/trust/` — completeness invariant, commitment tracking, handoff risk, delivery loop:
  - Every active task is either *triggered* (has a return date) or *dormant* (parked, swept at review) — never lost
  - `TrustPanel` on Dashboard surfaces only genuine risks — not dormant work
  - Done tasks with an undelivered person show a quiet "sent ✓" row (not counted in "things need you")
  - `allClear` triggers only when nothing genuinely needs you
- **Nudges** — `src/lib/nudges.ts` — unplanned day nudge, defer-today logic
- **Journal section** — `/journal` route:
  - List view grouped by Today / Yesterday / This week / Earlier
  - Calendar view with mood dots
  - Full-screen compose with rich text (bold, italic, font size S/M/L), mood picker (Calm / Grounded / Foggy / Heavy / Bright)
  - Auto-tag detection (Touring / Release / Grant / Promo / Admin)
  - Source badges for entries auto-pulled from day-close or weekly review
  - Persists to `studio-os:journal-entries` in localStorage
- **Practice tracker** — `/practice` route, `src/lib/body-program.ts` + `src/components/BodyProgramView.tsx`:
  - Ported from a personal standalone HTML tool (not a generic habit tracker — one specific hardcoded routine, for Talia only)
  - Daily / Stability / Mobility tabs, each with items, per-item multi-phase countdown timers (Web Audio beep, screen wake lock while running), weekly compliance grid (per-track target vs. actual, capped at "this week"), and a Notes/reference tab with a JSON export button
  - Fully self-contained and device-only (own localStorage key, not synced to Sheet/Supabase/global export), same posture as Journal
  - Participates in the app's existing light/dark theme system via new `--color-track-*` tokens in `globals.css`, rather than the original's hardcoded dark theme
- **Habits system** — ⚠️ **built + locally verified, uncommitted, not deployed.** `/habits` route, `src/lib/habits.ts` + `src/components/HabitsView.tsx`:
  - A real, general, user-editable habit tracker — deliberately separate from Practice (no shared data model, Practice stays hardcoded/personal)
  - Habits have a `type: "break" | "routine"`; break-type habits are what the session nudge banner (below) suggests mid-session
  - Add/edit/archive/restore, check off today, optional weekly target, 7-day history dot strip, empty-state suggestion chips for common break activities
  - Own localStorage key, device-only, same posture as Journal/Practice
- **Session timer + transition warning + break-habit loop** — ⚠️ **core built + locally verified, uncommitted, not deployed. Push/Supabase portion not yet started.**
  - `src/lib/sessions.ts` — `ActiveSession` gained optional timed fields (`targetDurationMs`, `warnBeforeMs`, one-shot `warningFiredAtIso`/`timesUpFiredAtIso`) and ambient fields (`ambientThresholdMs`, `ambientRepeatMs`, `ambientLastFiredAtIso`, `ambientAcknowledgedAtIso`) — kept separate because timed nudges fire once, ambient ones repeat until acknowledged
  - `src/lib/session-nudge.ts` — pure timing logic (`timedNudgeDue`, `ambientNudgeDue`, `msUntilNext*`), unit tested
  - `src/components/SessionStartSheet.tsx` — "Sit with this" now always opens a duration picker (quick-pick chips seeded from `duration-memory.ts` history + generic 25/45/90m, warn-before selector, one-tap "No timer, just start")
  - `src/components/SessionIndicator.tsx` — shows a countdown + progress bar when a target is set; tints amber after the warning fires, red once over time
  - `src/components/SessionNudgeBanner.tsx` — non-modal, globally mounted; warning / times-up / ambient-checkin states, each offering 1-2 break-habit suggestions pulled live from the Habits system (not Practice), "Log it" writes through to Habits + logs a new `session_break_taken` activity-log entry
  - Ambient fallback: untimed sessions still get a soft "been at this a while?" nudge after a default 90 min, re-firing every 10 min until acknowledged or the session ends — catches hyperfocus that wasn't anticipated at session start
  - New `AppSettings` fields: `defaultSessionWarnBeforeMs`, `ambientHyperfocusThresholdMs`, `ambientHyperfocusRepeatMs`
  - Shared `src/lib/audio-cue.ts` beep helper, extracted out of Practice's timer so both use the identical cue
  - **Not yet built**: real server-sent push for the warning/times-up/ambient moments (reaching the user with the browser fully closed). Research found no send-side push infrastructure exists anywhere in this repo despite being described as shipped elsewhere in this doc — see Known issues below. A `reminders` table already exists live in Supabase with almost the right shape for this, and `pg_cron`/`pg_net` are already-installed extensions, but the migration, Edge Function, cron wiring, and a new VAPID key pair (no private key exists anywhere) are all still pending.

---

## localStorage keys (all data)

| Key | Contents |
|-----|----------|
| `studio-os.tasks.v7` | All tasks (status, plans, notes, overlays) |
| `studio-os.reviews.v1` | Weekly review reflection + intentions per week |
| `studio-os.activityLog.v1` | Sessions, completions, day-close retro |
| `studio-os.logbook.v1` | Logbook lines by date |
| `studio-os.recipes.v1` | Release recipes |
| `studio-os.settings.v2` | Week start, week planning, life areas, nudges |
| `studio-os.activeSession.v1` | In-progress Work View session — now also carries optional timer/warning fields and ambient-nudge state |
| `studio-os.project-links.v2` | Project Drive links + local project meta |
| `studio-os.today-captures` | Today capture chips |
| `studio-os.sheet.v1` | Sheet connection metadata |
| `studio-os.gcal-events.v1` | Cached calendar events (when connected) |
| `studio-os:journal-entries` | Journal entries (text, html, mood, source, date) — ⚠️ **device-only, never synced or exported** |
| `studio-os.bodyprogram.v1` | Practice tracker — daily checks + feel log, keyed by date, trimmed to last 90 days — ⚠️ **device-only, never synced or exported** |
| `studio-os.habits.v1` | Habits — habit list + daily checks, keyed by date — ⚠️ **device-only, never synced or exported** |
| `studio-os:theme` | Theme preference (light / dark / system) |
| `studio-os.data-source.v1` | Vault ownership — `local` / `sheet` / `cloud` |
| `studio-os.google-*` | Google OAuth tokens + opt-outs |

**Sheet connected:** Tasks, reviews, activity log, logbook, and recipes also sync via the `_AppData` tab on your linked Google Sheet.  
**Supabase:** Auth session (cookie) + cloud push queue when configured.

---

## Source layout

```
src/
  app/(app)/          Routes — today, tasks, journal, archive, weekly-review, …
  components/         Feature UI components (Sidebar, TrustPanel, JournalView, …)
  components/today/   Today sub-components (DayShapePanel, RespondStrip, …)
  components/design/  Non-routed wireframes only — ignore for functional review
  lib/                Business logic, stores, parsers
  lib/trust/          Trust Core — completeness, commitments, summary, nudges
  lib/sheet/          Google Sheet read/write + _AppData blob
```

**Interaction contract (locked):** tap task **title** → Work View · tap **meta row** → Quick Edit.  
**Today bench contract (locked):** mode-day bench = matching mode + (approved this week OR do-plan in week). Add to Today also approves.

---

## Path to market (paid public product)

*Target decided August 10, 2026: strangers sign up and pay.*

### Destination: Duvet Department

**All products launch under Duvet Department**, alongside the existing website stack
(`taliaduvet-website`). Studio OS is one product in that portfolio, not a standalone app.

**Decided August 10, 2026: migrate FIRST, then launch.** Studio OS ships from the
Duvet Department stack, not from Netlify/Supabase. Supabase work stops here — anything
built deeper into it is thrown away.

### What we're migrating to

Repo: `/Volumes/BitchBaby1999/Coding/Talia Duvet/taliaduvet-website` — a Bun workspace
monorepo (`apps/*`, `packages/*`), Terraform-managed, Varlock + Bitwarden secrets.

| | Studio OS today | Duvet Department |
|---|---|---|
| Framework | Next.js 16 (app router, RSC) | **Astro 7** + islands |
| Runtime | Netlify | **Cloudflare Workers** (wrangler) |
| Database | Supabase **Postgres** | **D1** (SQLite), `td-portal` |
| Auth | Supabase Auth | **authstar** — magic links, OIDC, sessions in KV |
| Tests | vitest | vitest + **Playwright** e2e |

Existing apps: `website`, `portal` (Astro + D1 + auth), `hub` (raw Worker, routing +
`vein-api`), `sanity` (CMS), `rebuild`. Studio OS becomes a sixth.

### This is a platform port, not a data migration

Honest assessment — the two stacks share almost nothing. But it's much less bad than
that sounds, for one specific reason:

**Studio OS is already almost entirely client-side.** Nearly every component is
`"use client"`, state lives in localStorage, and the trust core is pure functions in
`src/lib/`. Those port to Astro islands close to unchanged. The genuinely server-shaped
surface is small: 5 API routes (`briefing`, `capture`, 3 Google OAuth) and the auth
guard in `src/proxy.ts`. **`src/lib/` — the whole trust core, 39 test files, 274 tests —
should survive the port intact.** That is the bulk of the actual thinking in this repo.

### ⚠️ The one thing that gets *worse*: no RLS

The single strongest guarantee in the current system is that tenant isolation is
enforced **by Postgres**, not by application code — every `sos_*` table has
`user_id = auth.uid()` on `USING` and `WITH CHECK`. Verified sound.

**D1 is SQLite. SQLite has no row-level security.** After migration, isolation is
enforced only by remembering a `WHERE user_id = ?` on every single query. The portal
already works this way — raw `env.DB.prepare(...)` with manually bound `user_id`
(see `apps/portal/src/lib/auth.ts`) — and Studio OS has far more per-user tables than
the portal does (7 vs 3).

**One forgotten WHERE clause is a cross-account data leak in a paid product.**
This must be solved with a mechanism, not discipline: a scoped-query helper that
*cannot* build a statement without a user id, so the unsafe version is unwriteable
rather than merely discouraged. Design this before porting the first table.

### Is the stack ready to host a paid app?

**Infrastructure: yes, and it's ahead of where Studio OS is today.** `apps/portal`
already has a staging environment with its own D1/KV/worker, observability (persisted
logs + traces), a Durable Object auth rate limiter, Turnstile bot protection, Brevo
transactional email, Cloudflare Access on staging, declared-and-required secrets, and
smart placement. Studio OS currently has none of that.

**Commerce: no. There is zero billing infrastructure.** The only Stripe reference in
the entire monorepo is a CSP `form-action` allowlist for `donate.stripe.com` /
`checkout.stripe.com` in `apps/hub/src/index.ts` — hosted donation links, not an
integration. `portal_users` has no plan, entitlement, or subscription column. Phase 3
billing is genuinely from-scratch: Stripe account, checkout, webhook → entitlement,
customer portal, trials, dunning, Stripe Tax (GST/HST).

**To verify:** whether the Cloudflare account is on the Workers **Paid** plan. D1's
free tier (5 GB, 5M rows read/day) is not a foundation for a paid product. Studio OS's
per-user data volume is tiny, so D1 capacity itself is a non-issue for a long time.

### ⚠️ There is no React in this monorepo

`apps/portal` is **pure Astro** — no React dependency anywhere in the workspace.
Studio OS would be the first React app in the stack. Astro supports this officially
via `@astrojs/react`, but it means:

- No existing component precedent to copy. Use `apps/portal` as the reference for
  **auth, D1, wrangler and middleware** patterns only — not for UI.
- **Astro islands do not share React context.** Each island is a separate React root,
  and Studio OS's architecture is six nested providers (`SettingsProvider`,
  `TasksProvider`, `SessionsProvider`, …) wrapping every screen. Porting screens as
  individual islands would break the entire state model.
- **Therefore: mount Studio OS as one `client:only="react"` island** inside a thin
  Astro shell — an SPA in an Astro wrapper. Astro then owns auth middleware, API
  endpoints, and the marketing/marketing-adjacent pages; React owns everything inside
  the app. This is the single most important architectural decision in the port, and
  it makes the component work far cheaper than a page-by-page rewrite.
- Consequence: Next's file-based routing does not carry over. The 31 routes become
  client-side routes inside the island.

### Decision: don't rewrite Studio OS as an Astro-native MPA

Considered and rejected (Aug 10, 2026) — the question was whether the lack of a release
deadline makes a full Astro rewrite worthwhile.

`apps/portal` runs `output: "server"` with **no client-side routing** — a classic MPA,
full page load per navigation. Nothing in the monorepo uses `<ClientRouter />`.

Studio OS is application-shaped, not document-shaped: six nested context providers, a
continuously-running `CloudSyncBridge`, a session timer that persists across screens,
localStorage as a live working copy, plus a service worker and push. Under an MPA every
navigation would rehydrate all task state, restart the sync bridge, and remount the
session indicator. Avoiding that would mean `<ClientRouter />` + `transition:persist`
throughout — an SPA rebuilt with more moving parts than simply using one.

Cost: ~50 components rewritten. Benefit for an authenticated, install-as-PWA daily-use
app: close to zero — nothing behind a login is indexed, and cold-load time barely
matters for a home-screen app. It would also reintroduce risk in the trust-critical
paths just stabilised.

**No deadline should buy the no-RLS mechanism, Playwright coverage and a real billing
model — not the same screens re-rendered in a different template language.**

**Adopted split:**

| Surface | Built as | Why |
|---|---|---|
| Landing, pricing, legal, docs, login | **Astro-native** | Needs SEO (paid product), content-shaped, matches `website`/`portal`. Net-new work — nothing to rewrite. |
| The authenticated app | **React island** (`client:only`) | Stateful, no SEO value behind a login, already built and tested. |
| API endpoints, auth middleware | **Astro-native** | Small, and being rewritten regardless. |

### D1 database layout — decide before 1.1

Auth tables (`portal_users`, `auth_sessions`) live in `td-portal`. **D1 has no
cross-database joins**, so either Studio OS tables join `td-portal`, or they go in a
separate `td-studio-os` with `user_id` stored as an opaque string.

**Recommend separate.** Session validation is JWT-based (`JWT_ISSUER` / `JWT_AUDIENCE`),
so it doesn't need a DB join — and a separate database avoids recreating the exact
"one database holding several unrelated products" problem we're migrating away from.

**Bonus:** `portalCookieDomain()` in `apps/portal/src/lib/auth-route.ts` already scopes
the session cookie to `.taliaduvet.com`, so a Studio OS app on a `*.taliaduvet.com`
subdomain can share the portal session — sign in once, signed in everywhere.

### What gets easier

- **The auth migration mostly evaporates.** authstar uses **magic links**, so there
  are no passwords to migrate — the "password reset for everyone" event I flagged
  doesn't happen. And there is currently one real user, so identity migration is
  approximately a non-problem *if done now*.
- **Item 1.3 is resolved by the migration itself.** Leaving the shared Supabase
  project is the point; don't also split to a dedicated Supabase project first.
- **Netlify's 300-credit deploy ceiling stops mattering.**
- **Google OAuth scope narrowing (Phase 2) should happen during the port**, not
  before — the OAuth callback routes are being rewritten anyway.

Everything below Layer 7A was built for **one known user on one browser**. That is a
different product from a paid multi-tenant SaaS, and most of the remaining work is
not features — it is the difference between "works for Talia" and "safe to sell."

**Layer 7B (visual polish) is no longer the right next layer.** It is the last phase
here, not the first: polishing a product that loses journal entries is effort spent
in the wrong place.

### Phase 0 — Stop the bleeding *(nothing ships before this)*
Fixes to things that are already broken for the current user.

| # | Work | Why it's first |
|---|------|----------------|
| 0.1 | Journal durability | Known issue 1. The app's newest headline feature can be destroyed by clearing browser data. **Now that migration comes first, do NOT build this as a Supabase table** — that's throwaway work. Either ship it directly as a D1 table during Phase 1.1, or, if entries are at risk before then, ship the Drive mirror as the stopgap (it survives the migration untouched, since it's the user's own Drive). |
| 0.2 | ~~Settle `allClear` vs. `awaitingDelivery`~~ | ✅ **Done** — Aug 10, 2026. Ruling: completion and delivery stay separate events (per TRUST-CORE §"Loop closing"), and undelivered work **does** block the all-clear. Made safe by a new `DeliveryPrompt` that asks *"Send to Kim?"* at the moment of completion, so `awaitingDelivery` holds genuinely-undelivered work rather than merely un-annotated work. |
| 0.3 | ~~Thread `now` through `weekRange()`~~ | ✅ **Done** — Aug 10, 2026. Also fixed a latent UTC date-shift bug in `isoDate()`. |
| 0.4 | ~~Error boundaries~~ | ✅ **Done** — Aug 10, 2026. |
| 0.5 | Get to 274/274 green | 273/274. Last one falls out of 0.2. |

**Cleanup surfaced while doing 0.3:** `dateWithOffset` is implemented twice, identically,
in `week.ts` (private) and `do-plan.ts` (exported). Collapse to one.

### Phase 1 — The port *(now the critical path)*

Ordered so the risky, decision-heavy work happens before the volume work.

| # | Work | Notes |
|---|------|-------|
| 1.0 | **Design the scoped-query mechanism** | The no-RLS problem above. Must make an unscoped query unwriteable. Nothing else starts until this exists. |
| 1.1 | Port the D1 schema | 7 `sos_*` tables, Postgres → SQLite. Watch types: no native `jsonb`, no `timestamptz`. Migrations live in `apps/studio-os/migrations/`. |
| 1.2 | Stand up `apps/studio-os` — Astro + `@astrojs/react` + Cloudflare, wired to authstar | Follow `apps/portal` for auth/D1/wrangler/middleware. First React app in the monorepo. |
| 1.3 | Move `src/lib/` across intact | The trust core + 274 tests. Should be near-lift-and-shift; treat any test that *needs* changing as a signal something was framework-coupled that shouldn't have been. |
| 1.4 | Mount the app as one `client:only="react"` island + client-side router | Not a page-by-page island port — see the context constraint above. Replaces Next's file routing. |
| 1.5 | Rewrite the 5 API routes as Astro endpoints | Narrow the Google OAuth scopes here (Phase 2) rather than porting `drive.readonly` forward. |
| 1.6 | Replace `src/proxy.ts` guard with Astro middleware | Drop `SKIP_AUTH` entirely — don't port known issue 7. |
| 1.7 | Migrate the real data | One user, one shot. Snapshot Supabase → D1. Verify row counts per table before cutover. |
| 1.8 | Playwright e2e for the trust-critical paths | The stack provides it and this app has never had UI tests. Cover: complete → delivery prompt → all-clear. |

### Phase 1b — Multi-tenant safety *(carries over regardless of stack)*

| # | Work | Notes |
|---|------|-------|
| 1b.1 | Clear all `studio-os.*` localStorage on sign-out **and** on user-id change | Known issue 6. Account B inherits account A's rows *and uploads them into B's vault*. A data-leak bug, not polish. Still true after the port — localStorage is stack-independent. |
| 1b.2 | Gate first-pull seed-up on "same user as last session" | What turns 1b.1 from a display bug into contamination. |
| 1b.3 | Account deletion + full data export | Legally required (below), currently absent. |

### Phase 2 — Google OAuth verification *(start now — longest lead time)*

**This is the critical-path item and the one most likely to be underestimated.**
Studio OS currently requests:

| Scope | Google's classification | Consequence |
|-------|------------------------|-------------|
| `drive.readonly` | **Restricted** | Annual third-party CASA security assessment — costs thousands/yr, takes months |
| `contacts`, `contacts.readonly` | Sensitive | Verification required |
| `calendar`, `calendar.readonly` | Sensitive | Verification required |
| `spreadsheets`, `spreadsheets.readonly` | Sensitive | Verification required |
| `drive.file` | **Non-sensitive** ✅ | No verification burden — Google's recommended scope |

Unverified, the app is capped at 100 test users behind an "unverified app" warning
screen — which is fine today and fatal for a paid launch.

**Recommendation: drop `drive.readonly` and narrow to `drive.file`**, which is already
in use. `drive.file` grants access only to files the app itself created or the user
explicitly picked, which is what Studio OS actually does. Eliminating the one
restricted scope removes the CASA assessment entirely and reduces this from a
months-and-thousands problem to a standard sensitive-scope verification. Audit
whether `contacts` and the `*.readonly` duplicates are genuinely used, and drop
every scope that isn't.

### Phase 3 — Become a business

| Area | Work |
|------|------|
| Billing | Stripe — none exists. Subscription, checkout, customer portal, webhook → entitlement, trial, dunning, tax (Stripe Tax; Talia is Canadian → GST/HST). |
| Legal | Privacy policy, Terms of Service, DPA. PIPEDA + GDPR (data lives in `ca-central-1`; EU users trigger transfer obligations). Right to access, export and erasure — ties to 1.5. |
| Onboarding | A stranger has none of Talia's mental model. Empty states, first-run guidance, and an explanation of the mode bench / do-plan / dormant-vs-triggered vocabulary the whole app assumes. |
| Marketing site | No landing page exists — `/login` is the front door. Needs positioning, pricing, and the trust promise made legible to someone who's never seen it. |
| Hosting | Netlify free plan (300 deploy credits/cycle, exhausted monthly) will not carry a paid product. Move to a paid tier. |
| Observability | Error tracking (Sentry), uptime monitoring, and alerting. Right now a production break is discovered by using the app. |
| Support | Inbound channel, password reset flow, status page. |
| Unit economics | Gemini calls (briefing + capture parse) are billed per user with no quota, rate limit or abuse protection. Model the per-seat cost before pricing. |

### Phase 4 — Layer 7B, Daylight / visual polish
Now appropriate. See below.

---

## What's not built yet

### Layer 7B — Daylight / visual polish
Deferred behind the market-readiness phases above. Can be built in parallel once design tokens are defined.

| Item | Notes |
|------|-------|
| Daylight token v2 | Lift glow, richer colour system beyond current Tailwind tokens |
| Phone density pass | Mobile spacing and tap targets on all screens |
| Collapsed day-shape strip | Shaped tasks + calendar events as dots along a thin horizontal line under Today header — tap to reopen. Wireframe exists at `src/components/design/DayShapeCollapsedStrip.design.tsx` |
| Confidence UI | Visual difference between "held" and "at risk" states |

### Missing / partial features
| Item | Status | Notes |
|------|--------|-------|
| Project CRUD push to Sheet | ❌ Not built | New projects are local-only; links/people already sync |
| Mid-week focus patch without full wizard | ❌ Not built | `patchTodayDayEntry` deferred from Sprint A |
| Dashboard mid-week nudge → planning step 2 | ❌ Not built | |
| Day-shape collapsed strip | ❌ Design mode only | See wireframe |
| Drag task into shape block | ❌ Deferred | Needs drag-and-drop library |
| Day-close retro chips (activity-sourced) | ⚠️ Partial | Needs Activity Log wiring |
| Journal → day-close / weekly review auto-pull | ⚠️ Plumbing only | Source badge renders but pull logic is not wired |
| Journal voice capture | ❌ Not built | Button present in design, omitted from implementation |
| Journal edit existing entry | ❌ Not built | Delete works; edit opens task detail but doesn't save |
| Goals screen | ❌ Not built | `src/app/(app)/goals/` exists but holds no `page.tsx` — the route does not build or resolve |
| Settings — full sheet project write | ❌ Not built | |
| Push notification scheduling (not just registration) | ⚠️ Partial | Queue exists; daily trigger timing TBD |

---

## Verified state (audit — August 10, 2026)

Roadmap claims checked against the codebase rather than against memory.

**Green:**
- `npm run build` passes clean; 31 routes generate.
- Supabase RLS is enabled **and correctly user-scoped** on every `sos_*` table
  (`user_id = auth.uid()` for both `USING` and `WITH CHECK`, `authenticated` role only).
  Server-side tenant isolation is sound.
- Auth guard lives in `src/proxy.ts` (Next.js 16 renamed `middleware` → `proxy`).

**Known issues — real, currently unfixed:**

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | **Journal is not durable** | 🔴 High | `studio-os:journal-entries` is localStorage-only. No cloud table, no sheet sync, not in export. Clearing browser data destroys every entry irrecoverably. Directly contradicts the promise at the top of this file. |
| 2 | ~~**`allClear` ignores undelivered work**~~ | ✅ **Fixed** | `allClear` now includes `awaitingDelivery`. The enabling piece is `DeliveryPrompt` — completion announces `studio-os:delivery-prompt` from the single `completeTask` choke point in `store.tsx` (completion fires from 8 surfaces, so a per-call-site prompt would have been 8 chances to forget), and one listener in the app layout renders it. "Not yet" is a legitimate answer, not a failure state. |
| 3 | ~~**`weekRange()` ignores injected `now`**~~ | ✅ **Fixed** | `weekRange`, `weekKey`, and both duplicate `dateWithOffset` implementations (`week.ts`, `do-plan.ts`) plus `dateKeyFromOffset` now take an optional `now`, threaded through `weekTrustCheck`. Backward-compatible across all 22 call sites. Also fixed `isoDate()` using `toISOString()`, which reported the previous day for any timezone east of Greenwich — latent until the first non-Americas user. |
| 4 | ~~**Failing tests**~~ | ✅ **Fixed** | `274/274` pass. |
| 8 | **Hydration mismatch on every page** | 🟡 Low | The inline theme script in `app/layout.tsx` sets `data-theme` before React hydrates, so server and client HTML disagree and React logs a hydration error on every load. Cosmetic today, but it means the console is never clean — which makes a *real* error easy to miss. |
| 5 | ~~**No error boundaries**~~ | ✅ **Fixed** | Added `(app)/error.tsx`, `global-error.tsx`, `not-found.tsx`. `global-error` uses inline styles deliberately — if the stylesheet is what broke, token-based markup would render invisible. All three state plainly that a render failure is not a data failure. |
| 6 | **localStorage survives sign-out** | 🟠 Medium | `AccountSection.signOut()` calls `supabase.auth.signOut()` only. Combined with `CloudSyncBridge`'s `seedLocalOnlyUp` on first pull, a second account signing in on the same browser inherits the previous user's local rows *and uploads them into their own cloud vault*. Single-user today; a hard blocker for any second user. |
| 7 | **`SKIP_AUTH` escape hatch** | 🟡 Low | `SKIP_AUTH=true` disables the auth redirect entirely (`src/lib/supabase/env.ts:8`). Intended for local pre-deploy; must never reach a production environment. |

---

## Layer model (dependency order)

```
Spine (built)
    ↓
Layer 1 — Data truth              ← Sprint A ✅
    ↓
Layer 2 — Today completeness      ← Sprint A ✅
    ↓
Layer 3 — Sessions + Activity Log ← Sprint B ✅
    ↓
Layer 4 — Review + Waiting-on     ← Sprint C ✅
    ↓
Layer 5 — Archive wing            ← Sprint D ✅
    ↓
Layer 6 — Duration memory + Day Ledger  ← Sprint E ✅
    ↓
Layer 7A — Trust Core + Journal + Cloud ← Post-E ✅
    ↓
Phase 0 — Stop the bleeding             ← 4 of 5 done; only 0.1 left
    ↓
Phase 1 — Port to Duvet Department      ← NEXT (critical path)
    ↓
Phase 1b — Multi-tenant safety
    ↓
Phase 2 — Google OAuth verification     ← fold into 1.5; longest external lead time
    ↓
Phase 3 — Become a business
    ↓
Layer 7B / Phase 4 — Daylight polish
```

**Sequencing note:** Phase 2 has months of external lead time (Google's review), so
begin the scope-narrowing paperwork as soon as 1.5 defines the final scope list —
don't wait for the port to finish.

---

## Quick start

```bash
cd studio-os-app
npm install
npm test          # vitest — lib logic
npm run build     # type-check + production build
npm run dev       # http://localhost:3000
npm run build && npm start   # production mode (service worker registers here)
```

**Deploy:**
```bash
npx netlify-cli deploy --prod
```
Credits reset the 10th of each month (Free plan, 300/cycle). If blocked, `npm run build && npm start` serves prod locally.

---

## Session automation

- **`.claude/settings.json`** — Stop hook with `asyncRewake` checks if `src/` or `public/` files changed but `BUILD_ROADMAP.md` wasn't updated; if so, re-wakes Claude with the update instruction.
- **`AGENTS.md`** — End-of-session rule tells every new chat to update this file before its final response.

---

## Source documents
- Design brief: `../Claude Designs/studio-os-round2-brief.md` (§3.5, §3.6, §4)
- Trust Core design doc: `docs/TRUST-CORE.md`
- Sprint specs (all done): `docs/SPRINT-A.md` … `docs/SPRINT-E.md`
- Layouts contract: `src/components/StudioLayouts.design.tsx`
- Today contract: `src/components/TodayConcepts.design.tsx`
