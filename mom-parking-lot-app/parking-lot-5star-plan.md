# Parking Lot App — 5-Star Improvement Plan
> Cursor implementation plan. Work top-to-bottom. Each task is self-contained with a clear Definition of Done.

---

## Current State Summary

| Area | Current | Target |
|---|---|---|
| Architecture | ⭐⭐⭐⭐½ | ⭐⭐⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐⭐ | ✅ already there |
| Testing | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Code Cleanliness | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| State Management | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Product Thinking | ⭐⭐⭐⭐⭐ | ✅ already there |

---

## PHASE 1 — State Management (⭐⭐⭐ → ⭐⭐⭐⭐⭐)
*Do this first. Everything else builds on a clean state layer.*

---

### TASK 1.1 — Add JSDoc interfaces for all core data shapes

**Files to edit:** `js/state.js`, `js/domain/tasks.js`, `js/domain/habits.js`, `js/domain/piles-people.js`, `js/domain/journal-daily.js`

**What to do:**

Add a `js/types.js` file (no runtime code, JSDoc only) defining the following `@typedef` shapes:

```js
/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} text
 * @property {string} category
 * @property {string|null} deadline       - YYYY-MM-DD
 * @property {string|null} doingDate      - YYYY-MM-DD
 * @property {'critical'|'high'|'medium'|'low'|null} priority
 * @property {'daily'|'weekly'|'monthly'|null} recurrence
 * @property {string|null} reminderAt
 * @property {string|null} pileId
 * @property {'quick'|'medium'|'deep'|null} friction
 * @property {string|null} firstStep
 * @property {string|null} personId
 * @property {boolean} archived
 * @property {number|null} archivedAt
 * @property {number|null} completedAt
 */

/**
 * @typedef {Object} Habit
 * @property {string} id
 * @property {string} name
 * @property {number} weight             - 1 to 5
 * @property {string|null} linkedCategoryId
 * @property {string|null} linkedPileId
 */

/**
 * @typedef {Object} HabitCompletion
 * @property {string} habitId
 * @property {string} date               - YYYY-MM-DD
 * @property {'manual'|'task'} source
 * @property {string|null} [taskId]
 */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string|null} lastConnected - YYYY-MM-DD
 * @property {string|null} reconnectRule
 * @property {string} notes
 */

/**
 * @typedef {Object} Pile
 * @property {string} id
 * @property {string} name
 * @property {number} [order]
 */

/**
 * @typedef {Object} AppState
 * @property {Task[]} items
 * @property {string[]} todaySuggestionIds
 * @property {number} completedTodayCount
 * ... (etc, mapping all fields from state.js)
 */
```

Then add `@type {AppState}` to the `state` export in `js/state.js`.

Add `@param` and `@returns` JSDoc to every exported function in all domain files.

**Definition of Done:**
- VS Code / Cursor shows autocomplete and type hints on `state.items[0].` (shows Task fields)
- No runtime behavior changes
- Run `npm run test` — all tests still pass


---

### TASK 1.2 — Prune `habitCompletions` on load (prevent unbounded growth)

**File to edit:** `js/storage/local.js`

**What to do:**

After `loadState()` deserializes the JSON blob, add a pruning step:

```js
// Prune habit completions older than 90 days to prevent unbounded growth
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const cutoffDate = new Date(Date.now() - NINETY_DAYS_MS)
  .toISOString().slice(0, 10); // YYYY-MM-DD

if (Array.isArray(state.habitCompletions)) {
  state.habitCompletions = state.habitCompletions.filter(
    c => c.date >= cutoffDate
  );
}
```

**Definition of Done:**
- `habitCompletions` in localStorage never contains entries older than 90 days after a load/save cycle
- Add a unit test in `js/__tests__/habits.test.js` that seeds completions spanning 120 days and asserts only 90 days survive after prune


---

### TASK 1.3 — Rename storage prefix from `parkingLotCouples_` to `parkingLot_`

**Files to edit:** `js/constants.js`, `js/storage/local.js`, `js/storage/pair-device.js`

**What to do:**

1. Change `STORAGE_PREFIX` in `constants.js` from `'parkingLotCouples_'` to `'parkingLot_'`
2. In `js/storage/local.js`, add a one-time migration on `loadState()`:

```js
// One-time migration: move data from old 'parkingLotCouples_' prefix
const OLD_PREFIX = 'parkingLotCouples_';
const NEW_PREFIX = 'parkingLot_';
const OLD_DATA_KEY = OLD_PREFIX + 'data';
const NEW_DATA_KEY = NEW_PREFIX + 'data';

if (!localStorage.getItem(NEW_DATA_KEY) && localStorage.getItem(OLD_DATA_KEY)) {
  // Migrate all keys from old prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(OLD_PREFIX)) {
      const newKey = NEW_PREFIX + key.slice(OLD_PREFIX.length);
      localStorage.setItem(newKey, localStorage.getItem(key));
    }
  }
}
```

3. Do the same migration for `pair-device.js` (for `pairId`, `addedBy`, `hasChosenSolo`, `deviceSyncId` keys)

**Definition of Done:**
- Existing users' data migrates transparently on first load with new code
- Old keys remain (don't delete them yet — safe rollback window)
- `npm run test && npm run e2e` passes


---

### TASK 1.4 — Add a `wireComposer()` guard to prevent silent `undefined` calls

**File to edit:** `js/app/orchestrator.js`

**What to do:**

Wrap the module-level `let` references with a safety proxy in development, and add a guard at the top of `wireComposer`:

```js
// At top of orchestrator.js — development guard
const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// After all the `let` declarations, add:
function assertWired(name, fn) {
  if (IS_DEV && typeof fn !== 'function') {
    console.error(`[orchestrator] "${name}" called before wireComposer() ran. Check init order.`);
  }
  return fn;
}
```

Then wrap critical calls like:

```js
// Replace:
renderColumns();
// With a guarded version where the variable is set:
assertWired('renderColumns', renderColumns)?.();
```

Also add at the top of `showMainApp()`:

```js
if (!renderColumns || !renderTodayList) {
  console.error('[orchestrator] showMainApp() called before wireComposer(). Call order is: wireComposer() → showMainApp()');
}
```

**Definition of Done:**
- In dev, if init order is wrong, a clear console error appears instead of silent failure
- No change in production behavior
- `npm run test` passes


---

## PHASE 2 — Architecture (⭐⭐⭐⭐½ → ⭐⭐⭐⭐⭐)
*Split the orchestrator. Follow the existing MODULAR_REFACTOR_CHECKLIST.md milestones.*

---

### TASK 2.1 — Extract `markDone` and `deleteItem` into `js/domain/task-actions.js`

**New file:** `js/domain/task-actions.js`
**Files to edit:** `js/app/orchestrator.js`

**What to do:**

Create `js/domain/task-actions.js` with pure business logic only (no DOM, no render calls):

```js
// js/domain/task-actions.js
import { state } from '../state.js';
import { getTodayLocalYYYYMMDD } from './tasks.js';
import { getMondayYYYYMMDD } from './weekly-planning.js';
import { recordCompletion, removeCompletionsForTask } from './habits.js';
import { removeTaskIdFromAllDays } from './weekly-planning.js';
import { createItem } from './tasks.js';

/**
 * Computes the state mutations for marking a task done.
 * Does NOT save or render — caller is responsible.
 * @param {string} id
 * @returns {{ mutated: boolean, respawnedId: string|null, wasInSuggestions: boolean }}
 */
export function applyMarkDone(id) { ... }

/**
 * Reverses applyMarkDone — restores previous state.
 * @param {string} id
 * @param {{ archived, archivedAt, completedAt }} prev
 * @param {string} todayStr
 * @param {boolean} wasInSuggestions
 * @param {string|null} respawnedId
 */
export function revertMarkDone(id, prev, todayStr, wasInSuggestions, respawnedId) { ... }

/**
 * Removes a task by id from state.items, suggestions, weekPlan, and selectedIds.
 * @param {string} id
 * @returns {{ removed: boolean, item: Task|null, index: number }}
 */
export function applyDeleteItem(id) { ... }
```

In `orchestrator.js`, replace the inline `markDone` and `deleteItem` implementations with thin wrappers that call the domain functions and then trigger saves/renders.

**Definition of Done:**
- `js/domain/task-actions.js` has zero `document.` references (run verification grep from MODULAR_REFACTOR_CHECKLIST.md)
- All existing `__tests__/tasks.test.js` tests still pass
- Add 3 new unit tests for `applyMarkDone`: (1) archives item, (2) removes from suggestions, (3) spawns recurrence


---

### TASK 2.2 — Extract modal logic into `js/features/modals.js`

**New file:** `js/features/modals.js`
**Files to edit:** `js/app/orchestrator.js`

**What to do:**

Move `openAddModal()`, `openEditModal()`, and all modal-close/submit handlers from `orchestrator.js` into `js/features/modals.js`. The module exports a factory function:

```js
// js/features/modals.js
/**
 * @param {Object} deps
 * @param {import('../state.js').AppState} deps.state
 * @param {Function} deps.saveState
 * @param {Function} deps.renderColumns
 * @param {Function} deps.renderTodayList
 * @param {Function} deps.showToast
 * @param {Function} deps.updateCategorySelectOptions
 * @param {Function} deps.updatePileSelectOptions
 * @param {Function} deps.updatePersonSelectOptions
 */
export function createModalController(deps) {
  function openAddModal(presetCategory, presetPileId) { ... }
  function openEditModal(id) { ... }
  function closeAddModal() { ... }
  function closeEditModal() { ... }
  function submitAddTask() { ... }
  function submitEditTask() { ... }

  return { openAddModal, openEditModal, closeAddModal, closeEditModal, submitAddTask, submitEditTask };
}
```

In `orchestrator.js`, replace inline modal code with:

```js
import { createModalController } from '../features/modals.js';
// inside wireComposer():
const modalCtrl = createModalController({ state, saveState, renderColumns, ... });
const { openAddModal, openEditModal } = modalCtrl;
```

**Definition of Done:**
- `orchestrator.js` has no inline `openAddModal` or `openEditModal` function bodies
- Smoke test: add task modal opens, fills, submits → task appears in board
- `npm run e2e` passes


---

### TASK 2.3 — Extract `bindEvents` into `js/features/events.js`

**New file:** `js/features/events.js`
**Files to edit:** `js/app/orchestrator.js`

This is the biggest single extraction. Follow the MODULAR_REFACTOR_CHECKLIST.md guidance on `wireMainEvents(deps)`.

**What to do:**

Create `js/features/events.js` with:

```js
/**
 * @typedef {Object} EventDeps
 * @property {import('../state.js').AppState} state
 * @property {Function} saveState
 * @property {Function} renderColumns
 * @property {Function} renderTodayList
 * @property {Function} renderFocusList
 * @property {Function} renderConsistencySmall
 * @property {Function} updateTally
 * @property {Function} openAddModal
 * @property {Function} openEditModal
 * @property {Function} markDone
 * @property {Function} deleteItem
 * @property {Function} addToSuggestions
 * @property {Function} showToast
 * @property {Function} saveDevicePreferencesToSupabase
 */

/**
 * Wires all main-app DOM event listeners.
 * @param {EventDeps} deps
 */
export function wireMainEvents(deps) {
  // search input
  // view toggle (columns/piles)
  // drag-and-drop
  // keyboard shortcuts (N, Esc, ?)
  // sidebar open/close
  // FAB buttons
  // settings modal
  // archive modal
  // journal panel
  // relationships panel
  // analytics panel
  // consistency panel
}
```

Move ALL event listeners from `bindEvents()` in orchestrator into this function. Nested relationship helpers move into the same file (per MODULAR_REFACTOR_CHECKLIST.md: "move nested helpers into the same feature file in the same PR").

In `orchestrator.js`:

```js
import { wireMainEvents } from '../features/events.js';
// replace bindEvents() body with:
function bindEvents() {
  wireMainEvents({
    state, saveState, renderColumns, renderTodayList,
    renderFocusList, renderConsistencySmall, updateTally,
    openAddModal, openEditModal, markDone, deleteItem,
    addToSuggestions, showToast, saveDevicePreferencesToSupabase
  });
}
```

**Definition of Done:**
- `orchestrator.js` `bindEvents()` body is ≤ 5 lines (just the `wireMainEvents(deps)` call)
- Full `npm run e2e` passes (keyboard shortcuts, drag-drop, sidebar all tested)
- Verify grep: `rg "addEventListener" js/app/orchestrator.js` returns 0 or only setup-phase listeners


---

### TASK 2.4 — Extract settings panel into `js/features/settings.js`

**New file:** `js/features/settings.js`
**Files to edit:** `js/app/orchestrator.js`, `js/features/events.js`

**What to do:**

Move all settings modal render and event handling into:

```js
export function createSettingsUI({ state, saveState, applyThemeColors, showToast, saveDevicePreferencesToSupabase, renderColumns, renderTodayList }) {
  function renderSettings() { ... }
  function bindSettingsEvents() { ... }
  return { renderSettings, bindSettingsEvents };
}
```

This covers: category preset, column names/colors, pile management, button/text color, display name, tally reset hour, suggest-next toggle, device sync code, push notifications, export/import.

**Definition of Done:**
- `orchestrator.js` contains no inline settings DOM logic
- Settings modal: all fields save correctly after change
- `npm run e2e` passes


---

### TASK 2.5 — Target `orchestrator.js` under 500 lines

**File to edit:** `js/app/orchestrator.js`

After Tasks 2.1–2.4, audit remaining line count. Extract any remaining inline logic:

- Journal panel render/bind → `js/features/journal.js` (if not already extracted)
- Relationships panel render/bind → `js/features/relationships.js` (if not already extracted)
- Consistency panel render/bind → `js/features/consistency.js` (if not already extracted)

Target: `orchestrator.js` contains only:
1. Imports
2. `wireComposer()` (dependency wiring)
3. `init()` — startup flow
4. `showMainApp()` — screen transition + initial render
5. `bindEvents()` — delegates to `wireMainEvents()`
6. `saveDevicePreferencesToSupabase()` — debounced cloud sync

**Definition of Done:**
- `wc -l js/app/orchestrator.js` is under 500
- All smoke tests pass (solo path, add task, columns/piles views, settings, device sync)
- All e2e tests pass


---

## PHASE 3 — Code Cleanliness (⭐⭐⭐⭐ → ⭐⭐⭐⭐⭐)

---

### TASK 3.1 — Clean up personal/private references for public readiness

**Files to edit:** `js/constants.js`, `docs/*.md`, `README.md`

**What to do:**

1. In `js/constants.js`, rename the `creative` category preset. The current labels (`stop2030barclay`, `misfit`, `cycles`) are personal project names. Either:
   - Rename to generic creative labels (`experimental`, `main-project`, `cycles`, `life`), OR
   - Keep as-is but add a comment: `// Example custom preset — users rename these via Settings`

2. In `docs/` and `README.md`, search for any private URLs, personal project names, or internal references that shouldn't be in a public repo:
   ```bash
   grep -r "barclay\|personal vault\|couples\|Talia\|Garren" docs/ README.md
   ```
   Replace or redact as appropriate for public-facing copy.

3. In `DEPLOY.md` and `APP_ARCHITECTURE.md`, ensure any "monorepo" references that point to a private vault repo are noted as optional/example.

**Definition of Done:**
- `grep -r "barclay" js/` returns 0 results
- `grep -r "Talia\|Garren" js/` returns 0 results (HTML display names from pair flow are OK as examples if clearly labeled)
- README is clean enough to share publicly


---

### TASK 3.2 — Add ESLint with the project's own import rules enforced

**Files to create:** `.eslintrc.json`, add `"lint": "eslint js/"` to `package.json` scripts

**What to do:**

Install ESLint (dev dep only):
```bash
npm install --save-dev eslint
```

Create `.eslintrc.json`:
```json
{
  "env": { "browser": true, "es2022": true },
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": ["error", "always"],
    "no-var": "error",
    "prefer-const": "warn"
  }
}
```

Add to CI in `.github/workflows/deploy-pages.yml`:
```yaml
- name: Lint
  working-directory: ${{ env.APP_DIR }}
  run: npm run lint
```

Fix any lint errors that surface (focus on `no-undef` and `eqeqeq` first — those are bugs, not style).

**Definition of Done:**
- `npm run lint` exits 0
- CI lint step added and green
- No `==` comparisons remain in domain files (use `===`)


---

### TASK 3.3 — Replace all `var` with `const`/`let` in non-config files

**Files to edit:** any `.js` file outside `config.js` that uses `var`

**What to do:**

Run:
```bash
grep -rn "\bvar\b" js/ --include="*.js"
```

For each hit:
- If the variable is never reassigned → `const`
- If it is reassigned → `let`
- Exception: `supabase.js` uses `var` intentionally for `config.js` global scope — leave that alone and add a comment

**Definition of Done:**
- `grep -rn "\bvar\b" js/ --include="*.js"` (excluding `supabase.js`) returns 0
- `npm run test` passes


---

### TASK 3.4 — Normalize error handling in Supabase calls

**File to edit:** `supabase.js`

**What to do:**

Every Supabase call currently does its own ad-hoc null check. Add a shared error handler:

```js
function supaErr(context, error) {
  if (error) console.warn(`[supabase] ${context}:`, error.message || error);
  return error;
}
```

Then replace scattered error logging with:
```js
const { data, error } = await client.from('talk_about').select(...);
if (supaErr('subscribeTalkAbout fetch', error)) return;
```

Also audit: any Supabase call that can throw (network error) but isn't wrapped in try/catch — wrap those.

**Definition of Done:**
- Every Supabase call either returns early on error via `supaErr()` or has a try/catch
- No unhandled promise rejections in Supabase calls during offline → online transition


---

## PHASE 4 — Testing (⭐⭐⭐⭐ → ⭐⭐⭐⭐⭐)

---

### TASK 4.1 — Add unit tests for `task-actions.js` (from Task 2.1)

**File:** `js/__tests__/task-actions.test.js`

**What to do:**

Write unit tests for every function exported from `task-actions.js`:

```js
describe('applyMarkDone', () => {
  it('archives the item', ...)
  it('removes item from todaySuggestionIds', ...)
  it('respawns a new item if recurrence is set', ...)
  it('records habit completion when item category matches linked habit', ...)
  it('is idempotent if item already archived', ...)
})

describe('revertMarkDone', () => {
  it('restores archived=false', ...)
  it('re-adds to todaySuggestionIds if wasInSuggestions', ...)
  it('removes the respawned item', ...)
  it('removes task completions for that date', ...)
})

describe('applyDeleteItem', () => {
  it('removes item from state.items', ...)
  it('removes from todaySuggestionIds', ...)
  it('removes from weekPlan days', ...)
  it('clears from selectedIds', ...)
  it('returns { removed: false } if id not found', ...)
})
```

**Definition of Done:**
- All tests pass with `npm run test`
- Coverage of `applyMarkDone` is 100% branch coverage


---

### TASK 4.2 — Add unit tests for `weekly-planning.js`

**File:** `js/__tests__/weekly-planning.test.js` (extend existing)

**What to do:**

The existing file has basic tests. Add:

```js
describe('pruneWeekPlan', () => {
  it('removes task IDs from days when task no longer exists in items', ...)
  it('keeps task IDs for existing tasks', ...)
  it('handles empty days gracefully', ...)
})

describe('removeTaskIdFromAllDays', () => {
  it('removes id from every day it appears in', ...)
  it('leaves other ids in that day intact', ...)
})

describe('insertTaskInDayOrder', () => {
  it('inserts at top when pos=top', ...)
  it('inserts at bottom when pos=bottom', ...)
  it('does not duplicate if already present', ...)
})
```

**Definition of Done:**
- `npm run test` passes
- `weekly-planning.js` domain functions have >90% statement coverage


---

### TASK 4.3 — Add Playwright e2e tests for journal and consistency panel

**File:** `e2e/journal-consistency.spec.js`

**What to do:**

```js
// Journal panel
test('opens journal panel and saves a daily entry', async ({ page }) => {
  // Open sidebar → Consistency
  // Click Journal
  // Type in daily textarea
  // Close and reopen — entry persists
})

test('switches between daily and reflections tabs', async ({ page }) => { ... })

// Consistency panel
test('adds a habit and sees it in consistency small view', async ({ page }) => {
  // Open Consistency panel
  // Add a habit named "Test Habit" with weight 3
  // Close panel
  // Assert #consistency-small contains "Test Habit"
})

test('marking a task done auto-checks linked habit', async ({ page }) => {
  // Add habit linked to 'Work' column
  // Add a task in Work column
  // Mark it done
  // Open Consistency panel
  // Assert today's weighted % > 0
})
```

**Definition of Done:**
- `npm run e2e` passes with these new tests
- Tests run in CI (already configured in deploy-pages.yml)


---

### TASK 4.4 — Add Playwright e2e test for offline → online flow

**File:** `e2e/offline.spec.js`

**What to do:**

```js
test('shows offline banner when offline and hides when back online', async ({ page }) => {
  await page.goto('/');
  // Complete solo setup
  await page.context().setOffline(true);
  await expect(page.locator('#offline-banner')).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.locator('#offline-banner')).toBeHidden();
})

test('task added while offline persists in localStorage', async ({ page }) => {
  await page.context().setOffline(true);
  // Add a task
  // Reload page (still offline)
  // Assert task still appears
})
```

**Definition of Done:**
- `npm run e2e` passes
- Offline behavior is now regression-protected


---

### TASK 4.5 — Add unit test for `habitCompletions` pruning (from Task 1.2)

**File:** `js/__tests__/habits.test.js` (extend)

**What to do:**

```js
describe('habitCompletions pruning', () => {
  it('removes completions older than 90 days on load', () => {
    // Seed state.habitCompletions with entries at -100 days, -60 days, -10 days
    // Call pruneHabitCompletions()
    // Assert only -60 day and -10 day entries remain
  })

  it('keeps all completions when all are within 90 days', () => { ... })

  it('handles empty habitCompletions array', () => { ... })
})
```

**Definition of Done:**
- `npm run test` passes
- `pruneHabitCompletions` exported from `storage/local.js` or a domain helper and testable in isolation


---

## PHASE 5 — Launch Readiness (Bonus / M6)
*From MODULAR_REFACTOR_CHECKLIST.md M6. Do these before any public promotion.*

---

### TASK 5.1 — Complete the RLS audit

**File:** `docs/RLS_AUDIT.md` (fill it in), Supabase dashboard

**What to do:**

For each table in `supabase-setup.sql`:
- `talk_about` — verify anon can only read rows where `pair_id` matches a known pair (not all rows)
- `user_preferences` — verify anon can only read/write their own pair+addedBy row
- `device_preferences` — verify anon can only read/write their own `device_sync_id`
- `email_tasks` — verify anon cannot read another pair's email tasks
- `push_subscriptions` — verify anon can only read/write their own `device_sync_id`
- `reminders` — same as push_subscriptions
- `agent_runs` — should be read-only for anon; only backend writes
- `triage_run_requests` — anon can insert; cannot read others' requests

For each table, document in `RLS_AUDIT.md`:
```
| Table | Policy | Verified | Notes |
```

Fix any policies that are too permissive (e.g. `USING (true)` without a pair_id filter is a red flag).

**Definition of Done:**
- `RLS_AUDIT.md` has a row for every table
- No table has an `anon` SELECT policy of `USING (true)` without a filtering condition
- Policies tested manually in Supabase dashboard SQL editor with a fake `pair_id`


---

### TASK 5.2 — Add service worker cache busting to CI

**Files to edit:** `sw.js`, `.github/workflows/deploy-pages.yml`

**What to do:**

Currently `CACHE_NAME = 'parking-lot-v15'` is bumped manually. Automate it:

In `deploy-pages.yml`, add a build step:
```yaml
- name: Bump service worker cache version
  working-directory: ${{ env.APP_DIR }}
  run: |
    SHORT_SHA=$(echo "${{ github.sha }}" | cut -c1-7)
    sed -i "s/parking-lot-v[0-9]*/parking-lot-$SHORT_SHA/" sw.js
```

This means every deploy automatically invalidates stale PWA caches.

**Definition of Done:**
- After a deploy, `sw.js` in the deployed site contains `parking-lot-<sha>` not a static version number
- Verify: `curl https://your-pages-url/sw.js | grep CACHE_NAME`


---

### TASK 5.3 — Add Content Security Policy header

**File:** `index.html` (meta CSP) or deploy config

**What to do:**

Add a CSP meta tag to `index.html` `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://unpkg.com;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
">
```

Adjust `script-src` to match the exact CDN domains used for Supabase JS and chrono-node in `index.html`.

**Definition of Done:**
- Browser DevTools Network tab shows no CSP violations on app load
- Supabase realtime (WSS) still connects
- CDN scripts still load


---

## Verification Commands (run after each phase)

```bash
# Import rules check (from MODULAR_REFACTOR_CHECKLIST.md)
cd parking-lot-app/js
rg "from ['\"]\.\/state\.js['\"]|from ['\"]\.\.\/state\.js['\"]" config utils 2>/dev/null || echo "PASS: config/utils don't import state"
rg "from ['\"].*/（storage|render|features)/" domain 2>/dev/null || echo "PASS: domain layer clean"
rg "from ['\"].*/（domain|render|features)/" storage 2>/dev/null || echo "PASS: storage layer clean"
rg "\bdocument\." domain 2>/dev/null || echo "PASS: no DOM in domain"

# Size check
wc -l js/app/orchestrator.js

# Full test suite
npm run test && npm run e2e

# Lint
npm run lint

# Unused var/any escaping vars
grep -rn "\bvar\b" js/ --include="*.js" | grep -v "supabase.js"
```

---

## Implementation Order for Cursor

**Recommended sequence (each is a separate Cursor session / PR):**

1. `TASK 1.1` — Types (no behavior change, safe first PR)
2. `TASK 1.2` + `TASK 4.5` — Prune + test together
3. `TASK 1.3` — Storage prefix rename (self-contained migration)
4. `TASK 3.3` + `TASK 3.2` — var cleanup + ESLint (mechanical, verifiable)
5. `TASK 2.1` + `TASK 4.1` — Extract task-actions + write tests together
6. `TASK 2.2` — Extract modal controller
7. `TASK 2.3` — Extract bindEvents (largest PR, needs full e2e run)
8. `TASK 2.4` — Extract settings UI
9. `TASK 2.5` — Orchestrator size audit + remaining extractions
10. `TASK 1.4` — Wire guard (after orchestrator is stable)
11. `TASK 3.1` — Public cleanup
12. `TASK 3.4` — Supabase error normalization
13. `TASK 4.2` + `TASK 4.3` + `TASK 4.4` — Additional tests
14. `TASK 5.1` — RLS audit (requires Supabase dashboard access)
15. `TASK 5.2` — SW cache busting
16. `TASK 5.3` — CSP header

---

*Plan generated from full codebase review. All file paths and line references are specific to the current repomix snapshot.*
