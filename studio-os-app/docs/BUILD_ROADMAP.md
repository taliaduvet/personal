# Studio OS — Build Roadmap

*Last updated: August 10, 2026*  
*Single source of truth — what's live, what's next, and why it's ordered the way it is.*

---

## The promise

> **Nothing you've captured will silently fall through. What needs you will come to you. When the system can't keep that promise, it says so instead of looking fine.**

Studio OS is an external brain for an autistic musician managing parallel commitments (releases, grants, touring, day job, other artists). Every trade-off is decided in favour of that user. A half-trusted system is worse than none — so the design optimises for trustworthiness over capability and prefers saying nothing to saying something it hasn't earned.

---

## What's live right now

### App shell
- Next.js 16, Tailwind v4, local-first (localStorage), optional Google Sheet sync, optional Supabase cloud sync
- Deployed to **studio-os-246.netlify.app** (auto-deploys from `main`)
- **Dark mode** — system auto (time-based: light 7am–8pm, dark otherwise), manual ☀︎/Auto/☽ toggle in sidebar
- **Source Serif 4** loaded via Next.js font pipeline (used in Journal compose)

### Navigation
| Route | Screen | Status |
|-------|--------|--------|
| `/` | Dashboard + Trust Panel | ✅ Live |
| `/today` | Today (mode bench, captures, day shape) | ✅ Live |
| `/journal` | Journal (list, calendar, compose, detail) | ✅ Live |
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
| `studio-os.activeSession.v1` | In-progress Work View session |
| `studio-os.project-links.v2` | Project Drive links + local project meta |
| `studio-os.today-captures` | Today capture chips |
| `studio-os.sheet.v1` | Sheet connection metadata |
| `studio-os.gcal-events.v1` | Cached calendar events (when connected) |
| `studio-os:journal-entries` | Journal entries (text, html, mood, source, date) |
| `studio-os:theme` | Theme preference (light / dark / system) |
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

## What's not built yet

### Layer 7B — Daylight / visual polish
The next planned layer. Can be built in parallel once design tokens are defined.

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
| Goals screen | ❌ Route exists, not built | `/goals` is an empty placeholder |
| Settings — full sheet project write | ❌ Not built | |
| Push notification scheduling (not just registration) | ⚠️ Partial | Queue exists; daily trigger timing TBD |

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
Layer 7B — Daylight / visual polish     ← NEXT
```

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

## Source documents
- Design brief: `../Claude Designs/studio-os-round2-brief.md` (§3.5, §3.6, §4)
- Trust Core design doc: `docs/TRUST-CORE.md`
- Sprint specs (all done): `docs/SPRINT-A.md` … `docs/SPRINT-E.md`
- Layouts contract: `src/components/StudioLayouts.design.tsx`
- Today contract: `src/components/TodayConcepts.design.tsx`
