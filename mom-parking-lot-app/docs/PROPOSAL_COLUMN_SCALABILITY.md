# Column Scalability and Anti-Overwhelm — Proposal

## Problem

Columns can feel overwhelming when there are many tasks, but hiding tasks creates “did I forget something?” anxiety. We want to keep tasks visible and findable without visual overload.

## Principles

1. **No silent hiding:** Users should always have a way to see that more exists (counts, “show more,” or expand) rather than tasks disappearing with no cue.
2. **Progressive disclosure:** Default view stays scannable; detail or full list on demand.
3. **Same mental model:** Columns and piles stay the same; we only change how many items are shown by default and how to reveal the rest.

## Options

### 1. Cap visible tasks per column with “Show more”

- **What:** Each column shows the first N tasks (e.g. 5–8) by current sort. A “Show more (12)” or “+7 more” link/button expands that column to show all (or next batch).
- **Pros:** Predictable height; “12” tells you nothing is hidden without looking. One click to see all in that column.
- **Cons:** Extra click for power users who want everything visible; need to decide N and whether it’s per-column or global.

### 2. Collapse column bodies by default when over threshold

- **What:** If a column has more than K tasks (e.g. 10), the task list starts collapsed with “N tasks — click to expand.” Header (and count) always visible.
- **Pros:** Very compact when many columns are busy; expand only what you need.
- **Cons:** Two states (collapsed/expanded) to maintain; can feel like “hiding” if users forget which columns are expanded.

### 3. “Focus this column” / single-column drill-down

- **What:** You already have drill-down (click column header to see one column). Promote it: “Too much? Click a column to focus only that one.” Back button returns to full grid.
- **Pros:** No new UI; reduces overwhelm by showing one column at a time. Counts in the grid still show total so nothing is “forgotten.”
- **Cons:** Doesn’t reduce clutter within a single column; only when many columns are busy.

### 4. Virtual scrolling or windowing

- **What:** Render only visible rows in the viewport; scroll to load more. Total count still shown.
- **Pros:** Smooth with 100+ tasks per column.
- **Cons:** More complex; can feel like “infinite scroll” and make “have I seen everything?” harder. Better for very large lists than for “a bit overwhelming.”

### 5. Summary row + expand

- **What:** Column shows a single “summary” row when collapsed (e.g. “5 overdue, 3 due this week, 4 later”) and a control to expand to full list.
- **Pros:** Glanceable “what’s urgent here” without showing every title.
- **Cons:** More logic and design; summary might be wrong if sort or bands change.

## Recommendation

- **Short term:** **Option 1** — Cap at N (e.g. 7) tasks per column with “Show more (X)” that expands in place. No silent hiding; count is always visible. Optional setting “Max tasks per column before ‘Show more’” (e.g. 5, 7, 10, Off).
- **Keep:** **Option 3** — Make “click header to focus this column” more discoverable (e.g. tooltip or one-time hint) so heavy users can reduce overwhelm without new components.
- **Later:** If single columns still feel overwhelming, add **Option 2** (collapse when over K) as an alternative mode or combine with Option 1 (show first N, then “Show more” expands the rest).

## Data / state

- No new persistence if we only add “max visible per column” (could be a setting) and “expanded” state can be in-memory or per-session (e.g. `state.columnExpanded[catId]`).
- If we add “collapsed by default when > K,” we need `state.columnCollapsed[catId]` or derive from task count.

## Copy and accessibility

- “Show more (12)” or “Show 12 more” so screen-reader and glance both get “12 more exist.”
- Avoid “Hide” without a clear “X items hidden” so users don’t wonder if something disappeared.
