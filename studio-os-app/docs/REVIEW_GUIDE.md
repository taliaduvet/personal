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
| `studio-os.settings.v2` | Week start, week planning, life areas, nudges |
| `studio-os.activeSession.v1` | In-progress Work View session |
| `studio-os.project-links.v2` | Project Drive links + local project meta |
| `studio-os.today-captures` | Today capture chips |
| `studio-os.sheet.v1` | Sheet connection metadata |
| `studio-os.gcal-events.v1` | Cached calendar events (when connected) |
| Google OAuth keys | `studio-os.google-*` (tokens, opt-outs) |

**Sheet connected:** Tasks, reviews, activity log, logbook, and recipes also sync via the `_AppData` tab on your linked Google Sheet (merge on read, append on write).

**Not in localStorage:** Supabase auth session (cookie) when configured.

---

## Docs index

| Doc | Purpose |
|-----|---------|
| `BUILD_ROADMAP.md` | Layered plan — what’s done vs deferred |
| `SPRINT-A.md` … `SPRINT-E.md` | Shipped sprint specs + UAT checklists |
| `REVIEW_GUIDE.md` | This file |

Sprints **A–E are shipped** in code. Layer 7 (Daylight / visual polish) is next on the roadmap.

---

## Source layout (production)

```
src/
  app/(app)/          Screens (today, tasks, archive, weekly-review, …)
  components/         UI — feature components at root; today/ subfolder for Today
  components/design/  Non-routed design wireframes only
  lib/                Business logic, stores, parsers, calendar, sheet
  lib/sheet/          Google Sheet read/write + _AppData blob
```

**Ignore for functional review:** `*.design.tsx` files and `/design/*` routes — wireframes and methodology, not the live app.

---

## Test coverage

Tests live next to lib modules (`*.test.ts`). Focus areas:

- Week boundaries, do-plan, completion attribution
- Activity log merge + day-close retro
- Duration memory, day ledger compose
- Logbook, recipes, waiting-on, shelf

UI components are mostly exercised via manual UAT in sprint docs.

---

## Recent UI (post–Sprint E)

- **Today:** Day Ledger panel, day-close sheet (time + task tag + note for tomorrow)
- **Work View:** Session stats strip
- **Weekly Review:** Wide layout — collapsible 3-column boards, context + reflection split below

---

## Plain English

Studio OS is a **local-first** artist task app. Your week, tasks, sessions, and review notes stay on your machine in the browser until you optionally connect Google Sheet/Calendar. The codebase separates **stores** (React + localStorage), **lib** (pure logic), and **components** (UI).
