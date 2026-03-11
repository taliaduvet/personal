# Parking Lot App — Full Roadmap (Consolidated Plan)

One plan for all planned features: **Piles + Piles view + bottom-up prioritization**, **first step / column notes / seed the render**, and **Consistency Dashboard** (habits, completions, link to column/pile). Formerly split across "Piles View and Bottom-Up Prioritization" and "Consistency Dashboard Integration."

---

## Overview

- **Piles & views**: User-defined piles (e.g. Admin, Creative) as optional tags on tasks. Toggle between **Columns view** (life areas) and **Piles view** (batch by type; life area shown as tag). Reduces context switching for neurodivergent users.
- **Bottom-up prioritization**: Optional **friction** (quick/medium/deep) on tasks. Sort by **time bands** (overdue → due today → due this week → later → none) then **friction** (quick first). **Suggest next** after marking a task done (same pile, or fallback to full list) to reduce the transition gap.
- **First step / one-inch**: Optional "first step" field per task; show on card and in suggest-next so starting is easier.
- **Column notes**: Note icon per column; one note per life area. Select text → **Turn into task** (task created in that column).
- **Seed the render**: Optional "Seed my render" / "Taking a break?" flow — pick one task or type one question to sit with before rest.
- **Consistency Dashboard**: Small summary on main page + full dashboard from sidebar. Habits with optional link to **column** and/or **pile**; completing a task in that column or pile auto-checks the habit. Weighted %, 7-day rolling, zone guide, daily trend, month view, manage habits.

**External services**: None. All data in localStorage and existing device_preferences sync (Supabase).

---

## Research summary (neurodivergent-friendly design)

- **Bottom-up processing**: Details first, then big picture. Prioritization should surface "what can I do right now?" (friction, time bands) not only "what's most important."
- **Context switching**: Costly; batching by type (piles) reduces it. Columns = life area; piles = type of work.
- **Transition gap**: After completing a task, "what's next?" is where time is lost. Suggest next = one concrete next thing visible immediately.
- **Energy/friction**: "What do I have energy for?" — quick/medium/deep lets users match tasks to capacity.

References: [ADD Resource Center – Next Step Ready](https://www.addrc.org/mastering-adhd-transitions-the-next-step-ready-strategy/), [Helen Olivier – Bottom-up thinking](https://helen-olivier.com/bottom-up-processing-explains-why-you-think-differently-and-how-to-work-with-your-brain-not-against-it/), [Task batching for ADHD](https://www.upskillspecialists.com/post/task-batching).

---

# Part A: Piles, Views, and Bottom-Up Prioritization

## A1. Piles (definition and tagging)

- **Piles**: User-created labels for type of work (e.g. Admin, Creative, Outreach). `state.piles = [{ id, name, order? }]`. Persist and device sync (`__piles`).
- **Tasks**: Optional `task.pileId` (string | null). Column = life area; pile = type of work.
- **UI**: Columns view shows pile tag on cards when set. Add/Edit task: Pile dropdown (optional). **Manage piles**: Settings or sidebar — add, rename, delete. On delete: set tasks' `pileId` to null with confirmation ("X tasks will become uncategorized").
- **Piles view**: Add an **Uncategorized** column for tasks with `pileId === null` so they still appear.

## A2. Columns view vs Piles view (toggle)

- **Toggle** above columns: "Columns | Piles" (or similar). `state.viewMode = 'columns' | 'piles'`.
- **Today's Suggestions**: Stay visible at the top in **both** views; tasks can appear in both Today and their pile column (no deduplication).
- **Columns view**: Columns = life areas (categories). Cards show pile tag if set.
- **Piles view**: Columns = piles (+ Uncategorized). Each pile column shows all tasks with that `pileId`; card shows **life area** (original category) as tag. Empty piles show as column with "No tasks in this pile."
- **Column notes**: Note icon exists only in Columns view. When switching to Piles view, collapse/close any open note.

## A3. Task friction (quick / medium / deep)

- **Friction**: `task.friction: 'quick' | 'medium' | 'deep' | null` (null = medium for sort). Optional in Add/Edit; small indicator on card.
- **Use**: In Piles view (and suggest-next), sort by time bands then friction (quick → medium → deep). Optional filter "Show only Quick" (v1 or later).

## A4. Prioritization logic: time bands then friction

- **Sort order** (Columns view, Piles view, and suggest-next list):
  1. **Time bands**: Overdue → Due today → Due this week (7 days) → Due later → No deadline.
  2. **Within each band**: Friction quick → medium → deep (null = medium).
- **Columns view** and **Piles view** both use this auto-sort within each column. Drag-reorder **within** a column is removed; drag **between** columns (change category) and drag to Today still work.
- **Today's Suggestions**: Remain **user-ordered** (no auto re-sort). Suggest-next is the bridge.
- **Suggest next**: Same pile as completed task; apply above sort; suggest **first** task in list that isn’t the one just completed. If no other task in same pile, **fallback**: suggest first task from **all tasks** (same sort). Optionally show "Due today" / "Overdue" on suggestion. Optional setting: "Show suggest next after completing a task: on / off."

## A5. Suggest next (implementation)

- After `markDone()` (and after undo window), call `suggestNext(completedItem)`. UI: compact strip or toast with "Next in [Pile]: [name]" (or "Next: [name]"), "Add to Today" / "Go", auto-hide after N seconds. If task has `firstStep`, show it in the suggestion.

---

# Part B: First Step, Column Notes, Seed the Render

## B1. First step (one-inch)

- **Data**: `task.firstStep: string | null`. Optional in Add/Edit with prompt: "What's the one tiny thing that would get you started?" Placeholder: "e.g. Open the file and add the title."
- **Display**: On card, show "Start by: [first step]" when set. In suggest-next, include first step when present. Optional soft max length (e.g. 200 chars); v1 can rely on copy only.
- **Detail deadline**: Keep single `deadline`; add copy in Add task: "Tip: For big tasks, set the deadline for the first small step." Optional later: `firstStepDue` or sub-steps / Goblin.tools link.

## B2. Column notes + selection-to-task

- **Data**: `state.columnNotes = { [categoryId]: string }`. Persist and device sync (`__columnNotes`). **Migrate on preset change**: when category preset changes, migrate columnNotes keys with same map as task categories (e.g. work → misfit).
- **UI**: In Columns view only, note icon at top of each column (drill-down still shows note for that column). Click opens/expands note (inline below header). Collapse by default; show indicator when note has content (e.g. "3 lines" or dot). **Debounce** save 300–500 ms.
- **Turn into task**: On text selection in note, show "Turn into task" (floating button or context menu). If selection is empty/whitespace after trim, disable or ignore. On action: create task with `text = selectedText.trim()`, `category = that column's categoryId`; optionally open Add modal pre-filled. v1: leave selected text in note after create. Support both textarea (selectionStart/selectionEnd) and contenteditable (getSelection()); store plain text only.
- **Edge case**: Optional soft limit on note length (e.g. 50k chars) in a later pass.

## B3. Seed the render (before rest)

- **Data**: `state.lastSeed: string | null` — last seed text shown on return. Persist and per-user sync (`__lastSeed`).
- **Trigger**: Sidebar or footer — "Seed my render" / "Taking a break?". Explicit; not automatic.
- **Flow**: Prompt "What's one thing to sit with?" Options: (1) Pick an open task from a dropdown (sort by time bands + friction). (2) Type one question (e.g. "What's the most important truth about this grant?"). Show "Let your brain work on: [task or question]." Optional: save last seed, show on return ("You left with: [seed]").

---

# Part C: Consistency Dashboard

## C1. Goal

- **Dual view**: Compact block on main page (below Today's Suggestions, above columns); full dashboard openable from sidebar ("Consistency").
- **Linking**: Each habit can optionally link to a **column** (category) and/or a **pile**. Completing any task in that column **or** that pile auto-marks the habit done for today. Manual-only habits (no link) stay checkbox-only. **One column/pile can contain many kinds of tasks**; one completion per habit per day regardless of how many tasks in that column/pile.

## C2. Data shapes

- **Habit**: `{ id, name, weight (e.g. 1–5), linkedCategoryId: string | null, linkedPileId: string | null }`. At least one of the links optional; can have both (OR logic).
- **Completion**: `{ habitId, date (YYYY-MM-DD), source: 'manual' | 'task', taskId?: string }`. Dates in **local** YYYY-MM-DD.
- **Done on date D**: true if at least one completion (any source) for that habit on D.

## C3. Business logic

- **Auto-check**: In `markDone(item)`, for each habit where `linkedCategoryId === item.category` **or** `linkedPileId === item.pileId`, add a completion for today with `source: 'task'`, `taskId: item.id`. If habit has both links, one completion from either source is enough (OR).
- **Undo**: In markDone undo callback, remove completions for today where `taskId === id`. If other completions for that habit+date remain, habit stays done.
- **Manual**: Toggle checkbox adds/removes completion with `source: 'manual'` (no taskId).
- **Category preset change**: When preset changes, **migrate** `linkedCategoryId` for each habit using PRESET_MIGRATION so habits still point at the correct column. Pile ids unchanged.

## C4. Metrics

- **Weighted % (day)**: `sum(weight for habits where done today) / sum(weight of all habits)`; if no habits, 0.
- **7-day rolling**: **Average of (weighted % per day for each of the last 7 days)**.
- **Zone guide**: e.g. 70–85% "Strong", 50–69% "Unstable but recoverable", <50% "Reduce volume", >85% "Check minimums".

## C5. Small view (main page)

- Today's habits: label + checkbox (checked if done today; linked habits can still be toggled manually).
- One line: "Weighted: 72% · 7-day: 68%" and zone label.
- Button: "Consistency" / "View full dashboard" opens full view.

## C6. Full dashboard (sidebar)

- New sidebar item "Consistency". Panel or full-width section with: weighted %, daily %, 7-day rolling, zone guide, daily trend (last 7–14 days, weighted % per day), month view (days × habits, read-only checkmarks), **Manage habits**: add/edit/delete, name, weight, **Link to column** dropdown, **Link to pile** dropdown. List shows "Linked to [Column]", "Linked to [Pile]", "Both", or "Manual only".

## C7. Persistence and sync

- `state.habits`, `state.habitCompletions`. Persist in main blob (loadState/saveState).
- **Per-user sync**: Piles, columnNotes, habits, habitCompletions, and lastSeed are **per-user** (not shared between couple-sync partners). Sync keys must be namespaced per user (e.g. `__piles_[userId]` or stored in a user-specific channel) so each partner has their own piles, habits, notes, and consistency data. Shared data (items, todaySuggestionIds, etc.) remains in the existing pairId-based sync.

## C8. Helpers (reference)

- `getHabits()`, `getCompletionsForDate(date)`, `recordCompletion(habitId, date, source, taskId?)`, `removeCompletionsForTask(taskId, date)`, `isHabitDoneOnDate(habitId, date)`, `computeWeightedPct(date)`, `compute7DayRolling()`, `getZoneLabel(pct)`.

---

# Part D: Deferred

- **Interest-driven motivation** (spark / whyItMatters): Deferred; interest changes moment to moment. Optional future: "Pick for me" that randomizes from due-soon/quick tasks for novelty.

---

# File impact (single table)

| Area | Files | Changes |
|------|--------|--------|
| **Piles** | app.js, index.html | state.piles; load/save/sync; Manage piles UI; default or seed piles. |
| **Task pile + friction** | app.js, index.html | task.pileId, task.friction; Add/Edit; pile tag and friction badge on cards. Migration: existing tasks pileId/friction null. |
| **View toggle + Piles view** | index.html, app.js, styles.css | Toggle; viewMode; Piles view columns = piles + Uncategorized; card shows life-area tag; sort time bands + friction. |
| **Sort (time bands + friction)** | app.js | Single sort function used in Columns view, Piles view, and suggest-next. Today's Suggestions stay user-ordered. |
| **Suggest next** | app.js, index.html, styles.css | suggestNext(); call after markDone; strip/toast with next task + first step if set; fallback to all tasks; optional setting. |
| **First step** | app.js, index.html | task.firstStep; Add/Edit + prompt; card "Start by: …"; suggest-next shows first step. |
| **Column notes** | app.js, index.html, styles.css | state.columnNotes; note icon per column; textarea/contenteditable; debounce save; selection → "Turn into task"; createItem with column categoryId; migrate notes on preset change. |
| **Seed the render** | app.js, index.html | Sidebar/footer entry; pick task (sorted) or type question; "Let your brain work on: …"; optional store last seed. |
| **Consistency state + persistence** | app.js | state.habits, state.habitCompletions; load/save; device sync __habits, __habitCompletions. |
| **Consistency helpers** | app.js | getHabits, getCompletionsForDate, recordCompletion, removeCompletionsForTask, isHabitDoneOnDate, computeWeightedPct, compute7DayRolling, getZoneLabel. |
| **Mark-done hook** | app.js | In markDone: recordHabitCompletionsForTask(item) for habits where linkedCategoryId === item.category OR linkedPileId === item.pileId. Undo: removeCompletionsForTask(id). Migrate linkedCategoryId on preset change. |
| **Consistency small view** | index.html, app.js, styles.css | #consistency-small: today's habits + checkboxes, weighted + 7-day + zone, "View full dashboard". |
| **Consistency full dashboard** | index.html, app.js, styles.css | #consistency-dashboard: metrics, zone, trend, month grid, Manage habits (add/edit/delete, link to column + link to pile). Sidebar "Consistency". |

---

# Implementation order (single sequence)

1. **Piles**: state.piles, CRUD, persist, device sync, Manage piles UI. Task pileId + friction; Add/Edit; show on cards.
2. **View toggle + Piles view**: Toggle; viewMode; render Piles view (piles + Uncategorized); card life-area tag. Sort: time bands + friction in one shared sort; use in Piles view and suggest-next.
3. **Suggest next**: suggestNext(); call after markDone; fallback to all tasks; UI strip with "Add to Today" / "Go"; optional setting.
4. **First step**: task.firstStep; Add/Edit; card and suggest-next display.
5. **Column notes**: state.columnNotes; note icon per column; note UI; debounce save; selection → Turn into task; migrate on preset change.
6. **Seed the render**: Sidebar entry; flow (pick task or question); optional last seed.
7. **Consistency**: state.habits, habitCompletions; persist + sync; helpers; markDone hook (column + pile, OR logic; undo; preset migration). Small view (main page). Full dashboard (sidebar). Manage habits (link to column + link to pile).

---

# Plan audit: gaps, edge cases, improvements

- **Uncategorized column**: Piles view includes column for tasks with pileId === null.
- **habitCompletions data growth**: Array grows indefinitely (one entry per habit per day). Future cleanup: optionally prune or archive completions older than 90 days; not required for v1.
- **Suggest next fallback**: If no other task in same pile, suggest first from all tasks (same sort).
- **Pile delete**: Set tasks' pileId to null; confirm "X tasks will become uncategorized."
- **Note close on view switch**: When switching to Piles view, collapse/close open note.
- **Turn into task**: Require selectedText.trim().length > 0; disable or ignore otherwise.
- **7-day rolling**: Average of (weighted % per day for each of last 7 days).
- **Habit both column and pile**: OR logic — done if task matches either.
- **Preset change**: Migrate columnNotes keys and habit linkedCategoryId with PRESET_MIGRATION.
- **Friction null**: Treated as medium in sort.
- **Recurring + habit**: Record completion for completed task id; undo removes by that id; respawned task is new id (no double-count).
- **Debounce** column note save (300–500 ms).
- **Optional** "Show suggest next" setting.
- **Seed the render**: Sort task list by time bands + friction.
- **Dates**: Completions YYYY-MM-DD local.

---

# References from your doc (mapped)

| Concept | How it's reflected |
|--------|---------------------|
| Bottom-up processing | Time bands + friction + first step; prompt for "one inch." |
| Monotropism | Piles view = one tunnel; suggest next in same pile. |
| Afternoon crash / rendering | Seed the render before rest. |
| Clustering over prioritizing | Piles view = cluster by type. |
| One-inch rule | First step field + on card and suggest-next. |
| Reverse engineer / detail deadline | Copy in Add task re first-step deadline. |
| Goblin.tools | Optional later: sub-steps or "Break this down" link. |
