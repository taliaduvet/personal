# Parking Lot App — How It Operates

This document describes how the app works from the entry point (`index.html`) through every file in the directory. Use it to understand the flow, data, and behavior of the system.

**Full manual QA:** See [QA_FULL_CHECKLIST.md](./QA_FULL_CHECKLIST.md) for every user-facing flow (and which checks are automated in Playwright). **Automating “clicks” (Playwright + how the agent runs them):** [QA_AUTOMATION_SETUP.md](./QA_AUTOMATION_SETUP.md).

**Modular refactor:** When splitting [`js/app-main.js`](../js/app-main.js) into more modules, use [MODULAR_REFACTOR_CHECKLIST.md](./MODULAR_REFACTOR_CHECKLIST.md) for **layer rules**, **Definition of Done** per milestone, smoke checks, and **verification greps**.

### Module map (extend each PR)

| File | Role |
| --- | --- |
| `js/constants.js` | Shared constants (presets, priorities, storage prefix, default colors). |
| `js/state.js` | Exported `state` object (single in-memory store). |
| `js/app-main.js` | Current composition root (persistence, domain, render, events — to be split per checklist). |
| `js/config/supabase-env.js` | *Planned* — Supabase URL/key presence (`hasSupabaseConfig`). |
| `js/utils/dom.js` | *Planned* — `escapeHtml`, pure helpers. |
| `js/storage/*.js` | *Planned* — `loadState` / `saveState`, pair/device keys, migrations. |
| `js/domain/*.js` | *Planned* — business logic, no DOM. |
| `js/render/*.js` | *Planned* — DOM templates and re-renders. |
| `js/features/*.js` | *Planned* — journal, consistency, relationships, email triage. |
| `js/sync/realtime.js` | *Planned* — Supabase realtime subscribe/unsubscribe owner. |
| `js/ui/theme.js` | *Planned* — CSS variables / theme application. |

---

## 1. Entry point: `index.html`

The app is a single-page application. The browser loads `index.html`, which defines the shell and wires in all assets and scripts.

### 1.1 Head

- **Meta**: UTF-8, viewport, theme-color (coral `#e07a5f`).
- **Title**: "Parking Lot".
- **Favicon**: Inline SVG emoji 🅿.
- **Manifest**: `manifest.json` for PWA (installable, standalone).
- **Styles**: `styles.css` (single global stylesheet).
- **Scripts** (bottom of body, in order):
  1. Supabase JS (CDN)
  2. Chrono-node (CDN, natural-language date parsing)
  3. `config.js` — Supabase URL and anon key (gitignored). Prefer **`var` bindings** (see `config.js.example`) so `SUPABASE_URL` exists on `globalThis` for the ES module; classic `const` at global scope is not always readable from `js/app-main.js`.
  4. `supabase.js` — Supabase client and cloud APIs (classic script; attaches `window.talkAbout`)
  5. `js/app-main.js` — `type="module"` entry: loads app logic, which imports `js/constants.js` and `js/state.js`

### 1.2 DOM structure (screens)

The body contains one root `#app` and several overlays. **Only one main “screen” is visible at a time**; the rest are `display:none`. Visibility is toggled by the app module (`js/app-main.js`) based on state.

| Section | ID | Purpose |
|--------|----|--------|
| Offline banner | `#offline-banner` | Shown when `navigator.onLine` is false; explains local save + sync when back online. |
| Entry screen | `#entry-screen` | First-time choice: **Use on my own**, **Use with my partner**, or **Link a device** (device sync code). |
| Pair setup | `#pair-setup` | Shown when “Use with my partner” is chosen: **Create pair** (get code) or **Join** with partner’s code; “Who are you?” (Talia / Garren). |
| Main app | `#main-app` | The main UI once solo or pair is set: today’s suggestions, columns/piles, sidebar, etc. |

- **Entry screen** also contains an optional **Link a device** form (`#entry-link-form`): input for device sync code, Link / Cancel.
- **Pair setup** contains the “pair created” block (`#pair-created`) with shareable code and Continue.

### 1.3 Main app layout (`#main-app`)

- **Header (`#today-bar`)**
  - “Today’s Suggestions” title, **Clear suggestions**, completed-today tally.
  - **Menu** (hamburger), **Email triage** button and dropdown (run triage, list of email-sourced tasks).
  - **Today list** (`#today-list`): ordered list of suggested tasks for today (done ✓, remove, move up/down).
  - **Suggest-next strip** (`#suggest-next-strip`): after completing a task, suggests next (same pile/list).
  - **Consistency small** (`#consistency-small`): optional habits summary and “View full dashboard”.

- **Main content (`#main-content`)**
  - **Overview** (`#overview`): back button (when in drill-down), **Columns / Piles** view toggle, search, `#columns` (column or pile cards), and **Talk about** section (only when `pairId` is set).
  - **Focus mode** (`#focus-mode`): single-task focus view; shown when user enters focus mode.

- **Floating UI**
  - **Add to Today** float (`#add-to-suggestions-float`): appears when tasks are selected; “Add to Today” and Clear.
  - **FABs** (`#floating-buttons`): Focus mode, Seed my render, Add task (+).

### 1.4 Modals (all `role="dialog"`, `aria-modal="true"`)

| Modal | ID | Purpose |
|-------|----|--------|
| Add task | `#add-modal` | Single task, Quick add (multiline), Voice; category, deadline, doing date, recurrence, first step, pile, person, friction, priority. |
| Edit task | `#edit-modal` | Edit text, category, first step, pile, person, friction, deadline, doing date, recurrence, priority, reminder (push). |
| Add from Talk about | `#add-from-talk-modal` | Turn a “Talk about” item into a parking-lot task with category, first step, pile, friction, dates, priority. |
| Archive | `#archive-modal` | List of completed (archived) items. |
| Settings | `#settings-modal` | Push notifications, device sync code, push/link device, pair code (couples), display name, suggest-next, tally reset hour, category preset, column names/colors, piles, theme colors. |
| Link partner | `#link-partner-modal` | Create pair or join with code; who are you (Talia/Garren). |
| Seed my render | `#seed-render-modal` | Pick a task or type a question to “seed” before a break; then “Rendering” and “Capture what came to mind” reflection. |

### 1.5 Panels (slide-over / overlay)

- **Consistency** (`#consistency-panel`): metrics, zone, trend, month, habits list, add habit (name, weight, link to column/pile).
- **Journal** (`#journal-panel`): tabs Daily / Reflections / Calendar; daily textarea with mirror for height; add reflection; calendar picker for past days.
- **Relationships** (`#relationships-panel`): list of people by group; add person (name, group, last connected, reconnect rule, notes); detail view.
- **Analytics** (`#analytics-panel`): “This week” summary text and Close.
- **Sidebar** (`#sidebar`): pair badge, Settings, Consistency, Journal, Relationships, Archive, Analytics, Export, Import; **Link partner** when solo.
- **Shortcuts overlay** (`#shortcuts-overlay`): N = new task, Esc = close modal, ? = show help.

### 1.6 Other UI

- **Toast** (`#toast`): temporary feedback (e.g. “Saved”, “Back online”).
- **Sidebar overlay** (`#sidebar-overlay`): dims content when sidebar is open.

---

## 2. Styles: `styles.css`

One global stylesheet. No CSS-in-JS; all layout and visuals are in this file.

- **Design system**
  - Dark theme: `--bg`, `--bg-soft`, `--bg-card`, `--text`, `--text-muted`, `--border`, `--radius`, `--shadow`.
  - Accents: `--accent-coral`, `--accent-sage`, `--accent-amber`, `--accent-warm`.
  - Theme colors (button, text) can be overridden via Settings; the app module sets CSS variables (e.g. `--accent-button`, `--accent-text`) on the root.

- **Sections** (conceptually): base/reset, entry screen, pair setup, main app (today bar, columns, piles, task cards), modals, panels (consistency, journal, relationships, analytics), sidebar, FABs, toast, focus mode, responsive tweaks.

- **Behavior**: Buttons, inputs, cards, and lists are styled for touch and keyboard. Columns support drag-and-drop (task cards between columns). Layout is responsive so the app works on phone and desktop.

---

## 3. Application logic: `js/` (ES modules)

The main entry is **`js/app-main.js`** (loaded with `type="module"` from `index.html`). There is **no build step**: the browser resolves static imports directly.

| File | Role |
|------|------|
| `js/constants.js` | Category presets, migration maps, priorities, storage key prefix, default column colors (exported constants). |
| `js/state.js` | Single exported **`state`** object — the live in-memory store (tasks, prefs, UI flags, etc.). |
| `js/app-main.js` | **Persistence** (`loadState` / `saveState` / pair + device sync), **parsing**, **renderers**, **Supabase hooks**, **event binding**, **`init()`**. |

`supabase.js` stays a non-module script so it can stay compatible with `config.js` globals (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) and attach **`window.talkAbout`**.

Execution starts at the bottom of `app-main.js`: when the DOM is ready, `init()` runs (same as before the split).

### 3.0 Layout note: board columns

`styles.css` uses **`repeat(4, minmax(0, 1fr))`** for category columns on **large** viewports (**>1024px**), **`repeat(2, …)`** on **tablet** (**601–1024px**), and a **single column** at **600px and below**. **`.columns.piles-view`** uses a **horizontal flex row** with **`flex: 1 0 12rem`** (approx.) so piles **share extra space equally** but **won’t shrink** below a readable width—**many pile categories** then **scroll horizontally** (`overflow-x: auto`, touch momentum). On small phones, piles **stack vertically**. **`.overview`** uses **safe-area** padding on narrow screens for notched devices.

### 3.1 State (`state` object)

All in-memory app state lives in one object, including:

- **Tasks and today**
  - `items`: array of task objects (id, text, category, deadline, doingDate, priority, recurrence, reminderAt, pileId, friction, firstStep, personId, archived, completedAt, etc.).
  - `todaySuggestionIds`: ordered list of task IDs for “Today’s Suggestions”.
  - `completedTodayCount`, `lastCompletedDate` (for “Completed today” tally).

- **Pair and device**
  - `pairId`, `addedBy` (Talia/Garren), `deviceSyncId` (for device sync).

- **Talk about**
  - `talkAboutItems`: list from Supabase; rendered in Talk about section.

- **UI and preferences**
  - `customLabels`, `columnColors`, `columnOrder`, `categoryPreset`, `buttonColor`, `textColor`, `displayName`, `tallyResetHour`, `piles`, `viewMode` (columns/piles), `showSuggestNext`, `searchQuery`, `selectedIds`, `editingId`, etc.

- **Feature-specific**
  - `emailTriageItems`, `lastAgentRun`, `habits`, `habitCompletions`, `journalDaily`, `people`, `seedReflections`, etc.

### 3.2 Persistence

- **LocalStorage** (prefix `parkingLotCouples_`):
  - `pairId`, `addedBy` (pair state).
  - `deviceSyncId` (device sync).
  - `data`: JSON blob of items, todaySuggestionIds, preferences, column names/colors, piles, habits, journal, people, etc.
  - `tally`: { count, date } for “Completed today” (respects tally reset hour).
  - `hasChosenSolo`: so returning users skip entry and go straight to main app if they have pairId, deviceSyncId, or solo choice.

- **Cloud (Supabase)**  
  Handled in `supabase.js`; see section 4. Used for: Talk about, user/device preferences, email triage, push subscriptions, reminders.

### 3.3 Initialization flow (`init()`)

1. **Listen for online/offline**  
   Toggle offline banner; on online, optionally sync device preferences and show toast.

2. **Register service worker**  
   `sw.js`; network-first for main app assets; fallback to cache when offline.

3. **Load pair and device state**  
   `loadPairState()`, `loadDeviceSyncState()` from localStorage.

4. **Decide which screen to show**
   - If `state.pairId` OR `hasChosenSolo()` OR `state.deviceSyncId`: hide entry and pair setup, call `showMainApp()`, then `bindEvents()`.
   - Else: show **entry screen** only, call `bindEntryScreen()`.

### 3.4 Entry and pair flows

- **Entry screen** (`bindEntryScreen`):
  - **Use on my own**: set solo flag, ensure `deviceSyncId`, optionally save initial device preferences to Supabase; hide entry, `showMainApp()`, `bindEvents()`.
  - **Use with my partner**: hide entry, show **pair setup**, `bindPairSetup()`.
  - **Link a device**: show link form; on submit, set `deviceSyncId` from code, pull device preferences from Supabase, apply to state, then `showMainApp()`, `bindEvents()`.

- **Pair setup** (`bindPairSetup`):
  - **Create pair**: generate `pairId`, set `addedBy = 'Talia'`, generate `deviceSyncId`, save to localStorage and optionally Supabase; show pair code, then Continue → `showMainApp()`, `bindEvents()`.
  - **Join**: user enters code and “Who are you?”; set `pairId`, `addedBy` (Talia or Garren), generate `deviceSyncId`, save; hide pair setup, `showMainApp()`, `bindEvents()`.

### 3.5 Main app entry (`showMainApp()`)

1. Hide entry and pair setup; show `#main-app` and FABs.
2. Set pair badge (pair code + name, or “Solo”) and show/hide **Talk about** and **Link partner** in sidebar based on `pairId`.
3. `loadState()` from localStorage (items, preferences, etc.).
4. Run device-sync migration if needed.
5. If `deviceSyncId` and Supabase exist, fetch device preferences and `applyDevicePreferencesToState()`.
6. Apply theme (column colors, button/text from settings).
7. Update category options, view toggle, then **render**: columns, today list, Talk about, email triage, tally, “Add to Today” button.
8. If `pairId` exists, **subscribe to Talk about** via Supabase Realtime; on events, update `talkAboutItems` and `renderTalkAbout()`.
9. Subscribe to user/device preferences if applicable (for live theme/prefs sync).

After that, **bindEvents()** attaches all main-app listeners (search, view toggle, drag-and-drop, clicks on tasks, modals, sidebar, keyboard shortcuts, etc.).

### 3.6 Rendering

- **renderColumns()**  
  Builds the column or pile view from `state.items` (filtered by search, optionally by drill-down). Each column/pile is a DOM block; each task is a card (from `renderTaskCard()`). Cards are draggable; drop updates `item.category` or `item.pileId` and saves.

- **renderTodayList()**  
  Fills `#today-list` from `state.todaySuggestionIds`; wires Done, Remove, Move up/down.

- **renderTalkAbout()**  
  Fills Talk about list from `state.talkAboutItems`; Add to lot (opens add-from-talk modal), Resolve (Supabase).

- **renderFocusList()**  
  Focus mode: shows only today’s suggestions in a minimal list with Done.

- **renderConsistencySmall()**  
  If there are habits, shows weighted % and 7-day rolling; checkboxes to mark habits done today.

- **renderTaskCard(item)**  
  Produces the HTML for one task: text, first step, deadline/doing date, priority, pile, person, friction; actions (edit, done, delete, add to today, etc.). Used in columns and piles.

Other render functions: settings (piles, column names, colors), archive, journal, relationships, analytics, seed-render picker, email triage list, consistency panel. All read from `state` and write to the DOM.

### 3.7 Core operations

- **Add task**  
  Single: parse text (chrono for dates, keyword detection for category/priority), create item, push to `state.items`, save, render. Quick add: split by newlines, parse each line, create multiple items. Voice: speech recognition, then same as quick add.

- **Edit task**  
  Load item into edit modal; on Save, update item fields, save, render.

- **Mark done**  
  Set `completedAt`, optionally `archived`, update tally, run recurrence if any, save, render today/focus/columns; optionally show “suggest next” strip.

- **Delete / Archive**  
  Remove from items or mark archived; save; render.

- **Today’s suggestions**  
  Add/remove/reorder via `todaySuggestionIds`; “Add to Today” float when selection is non-empty.

- **Habits**  
  Stored in state; completions per date; consistency panel and small block show weighted % and 7-day average; zone label from percentage.

- **Journal**  
  `journalDaily` keyed by date (YYYY-MM-DD); daily view and reflections; calendar view to open a past day.

- **Relationships**  
  `people` array (name, group, last connected, reconnect rule, notes); relationship panel lists by group and detail view.

- **Seed my render**  
  User picks a task or types a question; “Set seed” → show “Rendering” screen; “I’m back” → reflection textarea; save reflection to `seedReflections`.

- **Export/Import**  
  Export: JSON of state (e.g. items, preferences). Import: file picker, parse JSON, merge or replace state, save, render.

### 3.8 Save and sync

- **saveState()**  
  Writes `state` (excluding volatile UI) to localStorage under `parkingLotCouples_data`, and tally to `parkingLotCouples_tally`. If `deviceSyncId` is set and Supabase is available, can also call `saveDevicePreferencesToSupabase()` (debounced) to push preferences to `device_preferences` so other devices with the same sync code see the same settings.

---

## 4. Supabase client and cloud: `supabase.js`

`supabase.js` is an IIFE that creates the Supabase client from `config.js` and exposes a single global: **`window.talkAbout`**. All cloud behavior goes through this object.

### 4.1 Client creation

- **getClient()**  
  Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from global (set by `config.js`). If missing or placeholder, returns `null` and logs a warning. Otherwise creates and caches `window.supabase.createClient(url, key)`.

### 4.2 Pair and Talk about

- **generatePairId()**  
  Random 8-character code (e.g. for “Create pair”).

- **addTalkAbout(pairId, text, addedBy)**  
  Insert into `talk_about` (pair_id, text, added_by, resolved false).

- **resolveTalkAbout(id)**  
  Set `resolved = true` for that row.

- **subscribeTalkAbout(pairId, callback)**  
  Fetch unresolved `talk_about` for `pair_id`; then subscribe to Postgres changes on `talk_about` for that `pair_id`. On any change, refetch and call `callback(items)`. Returns an unsubscribe function.

### 4.3 User and device preferences

- **getUserPreferences(pairId, addedBy)**  
  Read `user_preferences` (e.g. `column_colors`) for pair + added_by.

- **saveUserPreferences(pairId, addedBy, columnColors)**  
  Upsert row keyed by pair_id + added_by.

- **subscribeUserPreferences(pairId, addedBy, callback)**  
  Realtime subscription on `user_preferences` for that pair; on change, refetch and callback.

- **getDevicePreferences(deviceSyncId)**  
  Read `device_preferences.preferences` for that device_sync_id.

- **saveDevicePreferences(deviceSyncId, preferences)**  
  Upsert `device_preferences` (preferences JSON, updated_at).

- **subscribeDevicePreferences(deviceSyncId, callback)**  
  Realtime on `device_preferences` for that device_sync_id; on change, refetch and callback.

### 4.4 Email triage

- **getEmailTasks(pairId, addedBy)**  
  Fetch `email_tasks` for pair, not approved, optionally filtered by added_by.

- **approveEmailTask(id)**  
  Set `approved = true`.

- **deleteEmailTask(id)**  
  Delete row.

- **getLastAgentRun(pairId, addedBy)**  
  Latest row from `agent_runs` for pair (and optionally added_by).

- **requestTriageRun(pairId, addedBy)**  
  Insert into `triage_run_requests` (backend/agent polls this and processes email).

- **subscribeEmailTasks(pairId, addedBy, callback)**  
  Realtime on `email_tasks` for pair; refetch and callback.

### 4.5 Push and reminders

- **savePushSubscription(deviceSyncId, subscription)**  
  Upsert into `push_subscriptions` (endpoint, p256dh, auth).

- **deletePushSubscription(deviceSyncId, endpoint)**  
  Delete that subscription.

- **addReminder(deviceSyncId, itemId, itemText, remindAt)**  
  Insert into `reminders` (backend or cron sends push at remind_at).

- **removeReminder(deviceSyncId, itemId)**  
  Delete reminders for that device and item.

---

## 5. Configuration: `config.js` and `config.js.example`

- **config.js**  
  Not in git. Defines:
  - `SUPABASE_URL` (e.g. `https://xxx.supabase.co`)
  - `SUPABASE_ANON_KEY`  
  Required for any Supabase feature (Talk about, preferences, email triage, push).

- **config.js.example**  
  Template with placeholders; copy to `config.js` and fill in real values from Supabase Dashboard → Project Settings → API.

---

## 6. PWA: `manifest.json` and `sw.js`

### 6.1 manifest.json

- **name / short_name**: “Parking Lot”
- **start_url**: `./`
- **display**: standalone
- **theme_color / background_color**: dark background, coral accent
- **icons**: single SVG icon (P on coral rounded square)

Used when the user “installs” the app (e.g. Add to Home Screen). Opens as a standalone window without browser chrome.

### 6.2 sw.js (service worker)

- **Cache name**: `parking-lot-v15` (bump to invalidate old caches).
- **Install**: Precache `./`, `index.html`, `js/app-main.js`, `js/constants.js`, `js/state.js`, `styles.css`, `manifest.json`, `supabase.js`.
- **Activate**: Delete caches whose name is not the current one; `clients.claim()`.
- **Fetch**:
  - Requests to other origins (e.g. Supabase) are not cached; pass through.
  - `config.js` and `sw.js`: always network (no cache).
  - For “main” app paths (`index.html`, `js/app-main.js`, `styles.css`, etc.): **network-first** — try fetch, then cache the response; on fetch failure, serve from cache (offline fallback).
  - All other same-origin requests: **cache-first** (e.g. manifest), then network.

Result: the app shell and core assets work offline after first load; API calls still require network.

---

## 7. Database: SQL files

The app expects Supabase (Postgres). Tables and Realtime are created by running the SQL in the Supabase Dashboard.

### 7.1 supabase-setup.sql (base schema)

- **talk_about**  
  id, pair_id, text, added_by, created_at, resolved. RLS enabled; anon allowed; in `supabase_realtime` publication.

- **user_preferences**  
  pair_id, added_by, column_colors (jsonb); unique (pair_id, added_by). RLS; Realtime.

- **device_preferences**  
  device_sync_id (PK), preferences (jsonb), updated_at. RLS; Realtime.

- **email_tasks**  
  id, pair_id, added_by, thread_id, email_id, subject, text, category, deadline, priority, draft_reply, added_at, approved. RLS; Realtime.

- **processed_emails**  
  email_id (PK), processed_at. RLS.

- **agent_runs**  
  id, pair_id, added_by, run_at, status, emails_processed, tasks_created, error_message. RLS.

### 7.2 Other SQL files (migrations / extensions)

- **supabase-rls-upgrade.sql**  
  RLS policy adjustments if needed.

- **supabase-realtime-preferences.sql**  
  Ensures user/device preferences tables are in Realtime.

- **supabase-device-sync.sql**  
  Device sync tables or columns.

- **supabase-email-migration.sql**  
  Email-related schema changes.

- **supabase-push-migration.sql**  
  push_subscriptions (and possibly reminders) table(s).

- **supabase-repair-triage.sql**  
  Triage/email repair or fixes.

- **supabase-triage-added-by.sql**  
  Adds or uses `added_by` for email triage scoping.

- **supabase-triage-run-requests.sql**  
  triage_run_requests table for “Run triage” button (agent picks up requests).

Run these in order as needed for your project; the app code assumes the tables and columns described in `supabase-setup.sql` and the migration files you’ve applied.

---

## 8. Other files in the directory

| File | Role |
|------|------|
| **.gitignore** | Typically ignores `config.js` (secrets) and sometimes build/cache dirs. |
| **README.md** | Setup instructions (Supabase, config, create/join pair, deploy). |
| **DEPLOY.md** | Deployment (e.g. GitHub Pages, secrets for Supabase URL/key). |
| **ROADMAP.md** | Planned features and ideas. |
| **docs/** | Proposals (e.g. PROPOSAL_JOURNALING.md, PROPOSAL_CYCLE_SYNC.md, PROPOSAL_RELATIONSHIP_CRM.md, PROPOSAL_COLUMN_SCALABILITY.md). |

---

## 9. End-to-end flow summary

1. **Load**  
   Browser opens `index.html` → loads CSS and scripts (config → supabase → app).  
   `js/app-main.js` waits for DOMContentLoaded (or runs immediately if already loaded), then calls `init()`.

2. **Entry**  
   If no pairId, no deviceSyncId, and not “solo”: show entry screen. User picks solo, couple, or link device. Couple path shows pair setup (create or join).

3. **Main app**  
   Once identity is set (solo or pair + device): `showMainApp()` loads state from localStorage, optionally pulls device preferences from Supabase, applies theme, subscribes to Talk about (and preferences) if pair, then renders columns, today list, Talk about, email triage, tally. `bindEvents()` wires all clicks, drag-and-drop, and keyboard.

4. **Ongoing**  
   User adds/edits/completes tasks (state + localStorage); optionally device preferences sync to Supabase. If pair, Talk about and user preferences sync via Realtime. Email triage and push/reminders use Supabase tables and backend/cron where configured.

5. **Offline**  
   Service worker serves cached shell; app still reads/writes localStorage. When back online, banner updates and device preferences can be pushed again; Realtime reconnects.

This is how the Parking Lot app operates from `index.html` through every file in the directory.
