# Studio OS — Review Guide

*For humans or another AI reviewing this codebase.*

---

## Quick start

```bash
cd studio-os-app
npm install
npm test          # vitest — lib logic
npm run build     # type-check + production build
npm run dev       # http://localhost:3000
```

Entry points for reading code:

| Area | Start here |
|------|------------|
| App shell + routes | `src/app/(app)/layout.tsx`, `src/app/(app)/*/page.tsx` |
| Task state | `src/lib/store.tsx` |
| Settings + week plan | `src/lib/settings-store.tsx` |
| Sessions | `src/lib/sessions-store.tsx`, `src/lib/sessions.ts` |
| Activity evidence | `src/lib/activity-log.ts` |
| Time memory (Sprint E) | `src/lib/duration-memory.ts`, `src/lib/day-ledger.ts`, `src/lib/day-close.ts` |
| Weekly review | `src/lib/weekly-review.ts`, `src/components/WeeklyReviewView.tsx` |
| Archive wing | `src/app/(app)/archive/`, `src/lib/logbook.ts`, `src/lib/recipes.ts` |
| Sheet sync | `src/lib/sheet-store.tsx`, `src/lib/sheet/app-data.ts` |
| Roadmap | `docs/BUILD_ROADMAP.md` |

---

## Is data saved locally?

**Yes.** Almost all app state lives in your browser’s **localStorage** on the machine where you use the app. Nothing requires a server for day-to-day use (sample data ships in code; Sheet sync is optional).

| localStorage key | Contents |
|------------------|----------|
| `studio-os.tasks.v7` | All tasks (status, plans, notes, overlays) |
| `studio-os.reviews.v1` | Weekly review reflection + intentions per week |
| `studio-os.activityLog.v1` | Sessions, completions, day-close retro (Sprint E) |
| `studio-os.logbook.v1` | Optional logbook lines by date |
| `studio-os.recipes.v1` | Release recipes |
| `studio-os.settings.v2` | Week start, week planning, life areas, session-timer settings, nudges |
| `studio-os.activeSession.v1` | In-progress Work View session, incl. timer/warning + ambient-nudge state |
| `studio-os.project-links.v2` | Project Drive links + local project meta |
| `studio-os.today-captures` | Today capture chips |
| `studio-os.sheet.v1` | Sheet connection metadata |
| `studio-os.gcal-events.v1` | Cached calendar events (when connected) |
| `studio-os:journal-entries` | Journal entries — device-only, never synced or exported |
| `studio-os.bodyprogram.v1` | Practice tracker daily checks — device-only, never synced or exported |
| `studio-os.habits.v1` | Habits list + daily checks — device-only, never synced or exported |
| `studio-os:theme` | Theme preference (light / dark / system) |
| `studio-os.data-source.v1` | Vault ownership — `local` / `sheet` / `cloud` |
| Google OAuth keys | `studio-os.google-*` (tokens, opt-outs) |

See `BUILD_ROADMAP.md`'s localStorage table for the full list, including internal/migration-only keys omitted here.

**Sheet connected:** Tasks, reviews, activity log, logbook, and recipes also sync via the `_AppData` tab on your linked Google Sheet (merge on read, append on write).

**Not in localStorage:** Supabase auth session (cookie) when configured.

---

## Docs index

| Doc | Purpose |
|-----|---------|
| `TRUST-CORE.md` | **Design doc (draft)** — the follow-up/nudge system: promise, research basis, 3-layer architecture |
| `BUILD_ROADMAP.md` | Layered plan — what’s done vs deferred |
| `SPRINT-A.md` … `SPRINT-E.md` | Shipped sprint specs + UAT checklists |
| `REVIEW_GUIDE.md` | This file |

Sprints **A–E are shipped** in code, and so is **Layer 7A (Trust Core)** — completeness invariant, commitments, delivery loop, multi-mode day focus, Habits, session nudges. **Layer 7B (Daylight / visual polish) is explicitly deferred to last** — the next priority is porting to the Duvet Department stack (Astro + Cloudflare + D1); see `BUILD_ROADMAP.md`'s "Path to market" section.

---

## Source layout (production)

```
src/
  app/(app)/          Screens (today, tasks, archive, weekly-review, habits, …)
  components/         UI — feature components at root; today/ subfolder for Today
  components/design/  Non-routed design wireframes only
  lib/                Business logic, stores, parsers, calendar, sheet
  lib/trust/          Trust Core — completeness invariant, commitments, summary, week-check
  lib/sheet/          Google Sheet read/write + _AppData blob
  lib/google/         Per-service Google OAuth (calendar, drive, sheets, contacts) + unified auth
```

**Ignore for functional review:** `*.design.tsx` files and `/design/*` routes — wireframes and methodology, not the live app.

---

## Test coverage

Tests live next to lib modules (`*.test.ts`) — 47 files, 337 tests. Focus areas:

- Week boundaries, do-plan (absolute dateKey model), completion attribution
- Activity log merge + day-close retro
- Duration memory, day ledger compose
- Logbook, recipes, waiting-on, shelf
- Trust Core (`src/lib/trust/*.test.ts`) — completeness invariant exhaustiveness, commitment/handoff tracking, week-check, recurring-obligation dormancy
- Multi-mode day focus (`week-focus-modes.test.ts`), Today-bench Defer (`defer-today.test.ts`)

UI components are mostly exercised via manual UAT in sprint docs.

---

## Recent UI (post–Sprint E)

- **Dashboard:** Trust Panel (`TrustPanel.tsx`) — "N things need you", all-clear message; pulls from `lib/trust/summary.ts`
- **Today:** Day Ledger panel, day-close sheet (time + task tag + note for tomorrow), Defer button per task, session nudge banner (break-habit suggestions mid-session)
- **Work View:** Session stats strip, timer + transition-warning countdown on `SessionIndicator`
- **Weekly Review:** Wide layout — collapsible 3-column boards, context + reflection split below; trust-check warnings on un-approving a commitment
- **Habits (`/habits`):** Break resets / Routines, weekly target, 7-day history dot strip
- See `BUILD_ROADMAP.md` "Features by sprint" for the full, current list — this section is an orientation snapshot, not exhaustive.

---

## Plain English

Studio OS is a **local-first** artist task app. Your week, tasks, sessions, and review notes stay on your machine in the browser until you optionally connect Google Sheet/Calendar. The codebase separates **stores** (React + localStorage), **lib** (pure logic), and **components** (UI).
