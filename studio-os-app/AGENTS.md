<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Studio OS — agent context

**Start here:** [`docs/REVIEW_GUIDE.md`](docs/REVIEW_GUIDE.md) — local storage, architecture map, test commands.

**Roadmap:** [`docs/BUILD_ROADMAP.md`](docs/BUILD_ROADMAP.md) — Layers 1–6 shipped; Layer 7 (Daylight) is next.

**Sprint specs (all DONE):** `docs/SPRINT-A.md` … `docs/SPRINT-E.md`

## Conventions

- **Local-first:** Tasks, reviews, activity log, settings persist in `localStorage` (see REVIEW_GUIDE for keys).
- **Logic in `src/lib/`**, UI in `src/components/`, routes in `src/app/`.
- **`*.design.tsx`** and `/design/*` routes are wireframes — not production behavior.
- Run `npm test` and `npm run build` before declaring a sprint complete.

## Current state

Sprints A–E shipped: timestamps, sessions, waiting-on, archive wing, duration memory, Day Ledger, day-close with yesterday note. Weekly Review uses a wide collapsible 3-column board layout.
