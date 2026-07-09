# Studio OS — Build Roadmap

*Last updated: July 9, 2026*  
*Status: Active planning document — agents and humans should read this before starting a new feature.*

This is the dependency-ordered plan for building the **entire** app. Each phase unlocks the next. Do not build downstream features on missing foundations (e.g. Logbook before Sessions, duration memory before Activity Log).

---

## What’s already built (the spine)

| Surface | Status |
|---------|--------|
| Week planning wizard (4 steps) | Functional |
| Today (mode bench, also-today, open day, capture, unplanned nudge) | Functional |
| Tasks Lot (5 lenses + search, incl. Waiting) | Functional |
| Inbox + smart capture parse | Functional |
| Quick Edit + Work View | Functional |
| Projects index + room | Partial (no sheet project write) |
| Horizon (`/deadlines`) | Functional (M1 buckets) |
| Weekly Review | Functional (studio time + make/manage bar) |
| Waiting-on | **Shipped** (Sprint C) |
| Settings + Sheet sync | Partial |
| Sessions + Activity Log | **Shipped** (Sprint B) |
| Shelf, Logbook, Recipes | **Shipped** (Sprint D) |
| Daylight visual system | **Not built** |

**Interaction contract (locked):** tap task **title** → Work View · tap **meta row** → Quick Edit.

**Today bench contract (locked):** mode-day bench = matching mode + (approved this week OR do-plan in week). Add to Today also approves. Title → Work View.

---

## Layer model (what informs what)

```
Spine (built)
    ↓
Layer 1 — Data truth          ← SPRINT A ✓
    ↓
Layer 2 — Today completeness  ← SPRINT A ✓
    ↓
Layer 3 — Sessions + Activity Log  ← SPRINT B ✓ (code)
    ↓
Layer 4 — Review ritual + Waiting-on  ← SPRINT C ✓
    ↓
Layer 5 — Archive (Shelf → Logbook)  ← SPRINT D ✓
    ↓
Layer 6 — Duration memory + Day Ledger  ← SPRINT E ✓
    ↓
Layer 7 — Daylight / visual polish (parallel-safe once tokens defined)
```

---

## Phase 1 — Data truth

**Why first:** Every memory feature (lifted times, Logbook, Sessions, Shelf) needs honest timestamps and sync.

| Item | Unlocks |
|------|---------|
| `completedAt` ISO in `_AppData` overlay (Sheet keeps date-only column) | Lifted times, Activity Log, Logbook evidence |
| Shared relative date helper (`Jul 15 · in 7 days`) | Horizon, task rows, Dashboard radar |
| Review notes → `_AppData` sync | Multi-device weekly review |
| Top-bar sheet sync indicator | Trust in save state |
| Fix stale SheetConnect copy | User confidence |
| Horizon overdue-first section | Brief §4.8 peace-of-mind |

**Defer from Phase 1:** Project CRUD push to Projects tab (links/people already in overlay; new projects are local-only today).

---

## Phase 2 — Today completeness

**Why second:** Today is the daily home; finish before new screens.

| Item | Unlocks |
|------|---------|
| Wire **Day Shape** (calendar + today focus patch + soft blocks) | Day Ledger attribution, “live here all day” |
| Real **lifted** timestamps | Proof of shipping today |
| `patchTodayDayEntry` (mid-week focus without full wizard) | Shape today without replanning whole week |
| Dashboard mid-week nudge → planning step 2 | Honest plan mid-week |

**Deferred (design mode):** Collapsed day-shape strip after shaping — shaped tasks and calendar events as **dots along a thin horizontal line** under the Today header (morning → evening), tap to reopen shape panel. Not the interim 3-column text summary. Wireframe: `src/components/design/DayShapeCollapsedStrip.design.tsx`. Relates to round-two brief day-arc language.

**Defer:** Drag task from bench into shape block (needs DnD); day-close retro chips (needs Activity Log).

---

## Phase 3 — Sessions + Activity Log

**Why third:** Hub feature for time memory — brief §4.11.

| Item | Unlocks |
|------|---------|
| Start/end session on task | Work View depth |
| Reentry note on end | Cold-start tax fix |
| In-session nav indicator | “In the studio” feel |
| Append-only Activity Log in `_AppData` | Logbook, Day Ledger, attribution |

---

## Phase 4 — Review + Waiting-on

| Item | Unlocks |
|------|---------|
| Waiting-on task state + Lot lens + Dashboard whisper | Peace of mind |
| Weekly Review studio time + make/manage bar | Closed loop week → plan |
| Sync reflections (already in Phase 1 if done) | Logbook content |

---

## Phase 5 — Archive wing

| Order | Screen | Depends on |
|-------|--------|------------|
| 1 | **Shelf** (shipped wall) | `completedAt` ISO, done tasks |
| 2 | **Logbook** (studio diary) | Activity Log, Sessions, reflections |
| 3 | **Recipes** (release chains) | Horizon dates + duration memory |

---

## Phase 6 — Visual system (can overlap late Phase 3+)

Daylight engine, token v2, lift glow, phone density, confidence UI. Does not block Sessions logic.

---

## Sprint map

| Sprint | Scope | Doc |
|--------|-------|-----|
| **A** | Phase 1 + Phase 2 | [`SPRINT-A.md`](./SPRINT-A.md) |
| **B** | Sessions + Activity Log v1 | [`SPRINT-B.md`](./SPRINT-B.md) |
| **C** | Waiting-on + Review depth | [`SPRINT-C.md`](./SPRINT-C.md) ✓ |
| **D** | Shelf → Logbook → Recipes | [`SPRINT-D.md`](./SPRINT-D.md) ✓ |
| **E** | Duration memory + Day Ledger | [`SPRINT-E.md`](./SPRINT-E.md) |

---

## Source documents

- Product: `Claude Designs/studio-os-round2-brief.md` (especially §3.5, §3.6, §4)
- Layouts contract: `src/components/StudioLayouts.design.tsx`
- Today contract: `src/components/TodayConcepts.design.tsx`
- Collapsed day-shape target: `src/components/design/DayShapeCollapsedStrip.design.tsx`
- Methodology / data layers: `src/components/Methodology.design.tsx`

---

## Plain English

The app’s **daily loop works**. Sprint A added **when** things happened and **shape today**. Sprint B added **sessions and an Activity Log**. Sprint C added **waiting-on** and **Review make/manage depth**. Sprint D added the **archive wing**. Sprint E added **time memory** — honest durations on tasks, project rollups, day-close retro, and a read-only Day Ledger.
