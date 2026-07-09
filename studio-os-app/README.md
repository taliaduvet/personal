# Studio OS — App

Mobile-first PWA for tasks, projects, weekly review, and studio time memory. Installable on a phone home screen.

- **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4
- **Data:** Local-first (`localStorage`) · optional Google Sheet `_AppData` sync · Supabase auth when configured
- **Design:** “Soft Desk” — accent `#5B61E8`

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build      # production build + type-check
```

> First Turbopack compile on an external volume can take a few seconds; after that it’s fast.

**Reviewer?** Start with [`docs/REVIEW_GUIDE.md`](docs/REVIEW_GUIDE.md) — local storage keys, architecture map, sprint index.

---

## What’s built (Layers 1–6)

| Screen | Job |
|--------|-----|
| **Dashboard** | Week planning ritual, Today count, radar |
| **Today** | Mode bench, shape, Day Ledger, day-close retro |
| **Tasks (Lot)** | Lenses, waiting-on, search |
| **Work View** | Sessions, stats, subtasks, classify |
| **Projects** | Why, tasks, session rollup |
| **Weekly Review** | Stats, collapsible boards, balance, reflection |
| **Archive** | Shelf · Logbook · Recipes |
| **Settings** | Week start, Sheet, life areas |

Sprint specs and UAT: `docs/SPRINT-A.md` through `docs/SPRINT-E.md`. Roadmap: `docs/BUILD_ROADMAP.md`.

---

## Local persistence

All core data saves automatically in the browser on **this machine**:

- Tasks, review notes, activity log (sessions + day-close), logbook, recipes, settings, active session

See the full key list in [`docs/REVIEW_GUIDE.md`](docs/REVIEW_GUIDE.md). Clearing site data in the browser wipes it; Sheet sync can restore `_AppData` if connected.

---

## Supabase (optional)

```bash
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Without keys, the app runs locally with sample data and no login redirect.

---

## Project map

```
src/
  app/(app)/              Authenticated routes
  components/             UI (today/ subfolder for Today)
  components/design/      Wireframes only — not production
  lib/                    Stores + pure logic
  lib/sheet/              Sheet + _AppData sync
docs/                     Roadmap, sprints, REVIEW_GUIDE
```
