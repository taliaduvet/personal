<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Studio OS — agent context

**Start here:** [`docs/REVIEW_GUIDE.md`](docs/REVIEW_GUIDE.md) — local storage, architecture map, test commands.

**Roadmap:** [`docs/BUILD_ROADMAP.md`](docs/BUILD_ROADMAP.md) — Layers 1–6 and 7A (Trust Core) shipped; next priority is the Duvet Department port (Astro/Cloudflare/D1), not Layer 7B (Daylight/visual polish) — that's deferred to last. Check `git log -1` before trusting any "shipped" claim: this repo's local working tree has a history of drifting ahead of what's committed.

**Sprint specs (all DONE):** `docs/SPRINT-A.md` … `docs/SPRINT-E.md`

## Conventions

- **Local-first:** Tasks, reviews, activity log, settings persist in `localStorage` (see REVIEW_GUIDE for keys).
- **Logic in `src/lib/`**, UI in `src/components/`, routes in `src/app/`.
- **`*.design.tsx`** and `/design/*` routes are wireframes — not production behavior.
- Run `npm test` and `npm run build` before declaring a sprint complete.

## Current state

Sprints A–E shipped: timestamps, sessions, waiting-on, archive wing, duration memory, Day Ledger, day-close with yesterday note. Weekly Review uses a wide collapsible 3-column board layout.

Also shipped (Layer 7A): Trust Core (`src/lib/trust/` — completeness invariant, commitment/handoff tracking, delivery loop, week-check), multi-mode day focus (a day can be stamped with several work modes), Today-bench Defer, Habits tracker (`/habits`), session timer + transition warnings + break-habit nudges, Practice tracker (`/practice`), Journal (`/journal`). Per-day task slotting in week planning + a Today "start your day" confirm gate + a Google OAuth refresh-token fix (Sep 21, 2026). 337/337 tests pass. Full detail in `docs/BUILD_ROADMAP.md`.

## End-of-session rule

**At the end of every Studio OS session, update `docs/BUILD_ROADMAP.md`** to reflect any new features, fixes, or architectural changes made during the session. Do this before your final response. Keep the "Last updated" date current.
