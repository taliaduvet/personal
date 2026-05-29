# Parking Lot v2 — Implementation Plan for Cursor

> This file is the source of truth for upcoming features.
> Work in `/Volumes/BitchBaby1999/Coding/Personal/parking-lot-v2/`.
> When a phase is complete, mirror ALL changed files to `/Volumes/BitchBaby1999/Coding/Personal/parking-lot-app/` (same relative paths), EXCEPT `config.js`.
> A live preview server runs on port 5175 (`npx serve . -p 5175`).

---

## Project architecture (read before touching anything)

**Stack:** Vanilla JS, ES modules, no build step. No framework, no bundler.

**Key files:**
```
js/app/orchestrator.js   — single app orchestrator, wires everything together
js/state.js              — mutable app state object (source of truth in memory)
js/core/persist.js       — saves state to localStorage (call persist() after mutations)
js/domain/tasks.js       — task creation, parsing helpers (extractDeadline, etc.)
js/domain/task-actions.js — markDone, deleteItem (mutate state, don't save)
js/features/events.js    — all DOM event listeners wired here
js/features/modals.js    — add/edit modal logic (createModalController factory)
js/render/board.js       — renders the columns/piles board
js/render/task-card.js   — renders a single task card HTML string
styles.css               — one CSS file, append new rules at bottom
index.html               — all modals/panels declared here as hidden divs
```

**Dependency injection pattern:** Every feature module exports a `createXxx(deps)` factory. The orchestrator calls it and passes `{ state, saveState, showToast, getRenderColumns, ... }`. Follow this pattern for every new feature.

**Adding a new feature checklist:**
1. New domain logic → `js/domain/xxx.js`
2. New feature module → `js/features/xxx.js` (export `createXxx(deps)`)
3. Instantiate in orchestrator → find where similar features are created, add yours nearby
4. New HTML → add to `index.html` (modals at bottom of `<body>`, panels as siblings to existing panels)
5. New styles → append to bottom of `styles.css`
6. New state fields → add to `js/state.js` initial object AND `js/types.js` JSDoc

**State persistence:** After ANY mutation to `state`, call `saveState()` (which calls `persist()` + optionally syncs to Supabase). Never mutate state without saving.

**Rendering:** After state changes that affect the board, call `renderColumns()`. After changes that affect today list, call `renderTodayList()`. Both are obtained via `getRenderColumns()()` / `getRenderTodayList()()` pattern in the orchestrator.

---

## Phase 1 — Sessions & Timer

### What it does
Every task card gets a ▶ button. Clicking it opens a full-screen modal showing a running timer, a notes area for this session, and read-only history of past sessions. When stopped, the session notes are saved to the task.

### New data fields on every task item
Add these to `js/state.js` initial task shape comment AND `js/types.js`:
```js
// On each task item (task-actions.js createItem doesn't need changing — these start as undefined/null)
sessions: [],             // Array of completed session objects (see below)
activeSessionStart: null, // ISO string timestamp when a session is running, null otherwise
totalTimeSeconds: 0,      // Running total of all completed session durations
```

Session object shape:
```js
{
  id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
  start: '2026-05-29T14:00:00.000Z',  // ISO string
  end:   '2026-05-29T15:30:00.000Z',  // ISO string
  durationSeconds: 5400,
  notes: 'What I worked on...',
  aiPickup: null   // reserved for Phase 6 AI feature
}
```

### New HTML — session modal (add to index.html before closing </body>)
```html
<div id="session-modal" class="modal session-modal-fullscreen" style="display:none" role="dialog" aria-modal="true" aria-labelledby="session-modal-title">
  <div class="modal-content session-modal-content">
    <div class="session-modal-header">
      <div class="session-modal-task-name" id="session-task-name"></div>
      <div class="session-timer" id="session-timer">0:00:00</div>
    </div>
    <div class="session-modal-body">
      <div class="session-now-section">
        <div class="session-section-label">NOW</div>
        <textarea id="session-notes-input" class="session-notes-textarea" placeholder="Jot as you go — saved when you stop..."></textarea>
      </div>
      <div id="session-history-section" class="session-history-section" style="display:none">
        <div class="session-history-divider">Past sessions</div>
        <div id="session-history-list" class="session-history-list"></div>
      </div>
    </div>
    <div class="session-modal-footer">
      <button id="session-stop-btn" type="button" class="btn-primary session-stop-btn">⏹ Stop &amp; save</button>
      <button id="session-cancel-btn" type="button" class="btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

### New file: js/features/sessions.js
```js
/**
 * Session timer feature.
 * Manages start/stop, timer display, session history in modal.
 */
import { escapeHtml } from '../utils/dom.js';

export function createSessionController(deps) {
  const { state, saveState, showToast, getRenderColumns, getRenderTodayList } = deps;
  let timerInterval = null;
  let activeTaskId = null;

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function formatSessionDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getElapsedSeconds(startIso) {
    return Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  }

  function autoPauseOtherSession(incomingTaskId) {
    // If another task has an active session running, auto-pause it first
    const other = state.items.find(i => i.id !== incomingTaskId && i.activeSessionStart);
    if (!other) return;
    const start = other.activeSessionStart;
    const end = new Date().toISOString();
    const durationSeconds = getElapsedSeconds(start);
    if (!other.sessions) other.sessions = [];
    other.sessions.push({
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      start,
      end,
      durationSeconds,
      notes: 'auto-paused',
      paused: true,
      aiPickup: null
    });
    other.activeSessionStart = null;
    other.totalTimeSeconds = (other.totalTimeSeconds || 0) + durationSeconds;
  }

  function openSessionModal(taskId) {
    const item = state.items.find(i => i.id === taskId);
    if (!item) return;

    // Auto-pause any other running session before starting this one
    autoPauseOtherSession(taskId);

    activeTaskId = taskId;

    // If no active session on this task, start one
    if (!item.activeSessionStart) {
      item.activeSessionStart = new Date().toISOString();
      saveState();
    }

    // Populate modal
    document.getElementById('session-task-name').textContent = item.text;
    document.getElementById('session-notes-input').value = '';

    // Render history
    renderSessionHistory(item);

    // Start ticker
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const item = state.items.find(i => i.id === activeTaskId);
      if (!item || !item.activeSessionStart) { clearInterval(timerInterval); return; }
      const el = document.getElementById('session-timer');
      if (el) el.textContent = formatDuration(getElapsedSeconds(item.activeSessionStart));
    }, 1000);

    // Show immediately
    const item2 = state.items.find(i => i.id === activeTaskId);
    const timerEl = document.getElementById('session-timer');
    if (timerEl && item2?.activeSessionStart) {
      timerEl.textContent = formatDuration(getElapsedSeconds(item2.activeSessionStart));
    }

    document.getElementById('session-modal').style.display = 'flex';
    document.getElementById('session-notes-input').focus();
  }

  function renderSessionHistory(item) {
    const sessions = (item.sessions || []).slice().reverse(); // newest first
    const section = document.getElementById('session-history-section');
    const list = document.getElementById('session-history-list');
    if (!section || !list) return;

    if (!sessions.length) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    list.innerHTML = sessions.map(s => `
      <div class="session-history-item">
        <div class="session-history-meta">
          <span class="session-history-date">${formatSessionDate(s.start)}</span>
          <span class="session-history-duration">${formatDuration(s.durationSeconds)}</span>
        </div>
        ${s.notes ? `<div class="session-history-notes">${escapeHtml(s.notes)}</div>` : ''}
        ${s.aiPickup ? `<div class="session-ai-pickup">✦ ${escapeHtml(s.aiPickup)}</div>` : ''}
      </div>
    `).join('');
  }

  function stopSession() {
    clearInterval(timerInterval);
    const item = state.items.find(i => i.id === activeTaskId);
    if (!item || !item.activeSessionStart) {
      closeSessionModal();
      return;
    }
    const start = item.activeSessionStart;
    const end = new Date().toISOString();
    const durationSeconds = getElapsedSeconds(start);
    const notes = (document.getElementById('session-notes-input')?.value || '').trim();

    const session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      start,
      end,
      durationSeconds,
      notes: notes || null,
      aiPickup: null
    };

    if (!item.sessions) item.sessions = [];
    item.sessions.push(session);
    item.activeSessionStart = null;
    item.totalTimeSeconds = (item.totalTimeSeconds || 0) + durationSeconds;

    saveState();
    closeSessionModal();
    getRenderColumns()?.();
    getRenderTodayList()?.();
    showToast('Session saved — ' + formatDuration(durationSeconds));
  }

  function cancelSession() {
    // Stop timer but don't save the session — keep activeSessionStart so it can be resumed
    clearInterval(timerInterval);
    closeSessionModal();
  }

  function closeSessionModal() {
    clearInterval(timerInterval);
    activeTaskId = null;
    const modal = document.getElementById('session-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindEvents() {
    const stopBtn = document.getElementById('session-stop-btn');
    const cancelBtn = document.getElementById('session-cancel-btn');
    if (stopBtn) stopBtn.addEventListener('click', stopSession);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelSession);

    // Close on backdrop click
    const modal = document.getElementById('session-modal');
    if (modal) modal.addEventListener('click', e => {
      if (e.target === modal) cancelSession();
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('session-modal')?.style.display === 'flex') {
        cancelSession();
      }
    });
  }

  return { openSessionModal, stopSession, cancelSession, closeSessionModal, bindEvents };
}
```

### Changes to js/render/task-card.js
Add the ▶ / ⏹ button to the task card. Find the `task-actions` div in the rendered HTML and add the session button:

```js
// Inside the renderTaskCard function, add to the task-actions div:
const isActive = !!(item.activeSessionStart);
const totalTime = item.totalTimeSeconds > 0
  ? formatSessionTime(item.totalTimeSeconds)
  : null;

// In the actions area, add:
`<button class="btn-session ${isActive ? 'btn-session-active' : ''}" data-id="${item.id}" title="${isActive ? 'Session in progress — click to open' : 'Start a session'}">
  ${isActive ? '⏱' : '▶'}
</button>`

// In the meta row, add if total time exists:
${totalTime ? `<span class="task-time-total" title="Total time tracked">⏱ ${totalTime}</span>` : ''}
```

Add this helper at top of task-card.js:
```js
function formatSessionTime(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
```

### Changes to js/render/board.js
Add event listener for `.btn-session` buttons after the existing card event listeners:
```js
container.querySelectorAll('.btn-session').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    d.openSessionModal(btn.dataset.id);
  });
});
```

### Expose openSessionModal via orchestrator
In `js/app/orchestrator.js`, import and instantiate `createSessionController`, passing it the same deps pattern as other controllers. Expose `openSessionModal` on the deps object passed to `createBoardController`.

### Update the Escape handler in js/features/events.js
The Escape handler has a hardcoded `modals` array and `panels` array. Add the new overlays to it.

Find this line:
```js
const modals = ['add-modal', 'edit-modal', 'add-from-talk-modal', 'archive-modal', 'settings-modal', 'link-partner-modal', 'seed-render-modal'];
```
Add `'session-modal'` and `'inbox-session-modal'` to the array.

For session-modal, add a specific close handler in the loop (like the existing ones):
```js
else if (id === 'session-modal') d.sessionController.cancelSession();
else if (id === 'inbox-session-modal') d.inboxSession.close();
```

For the notes panel, add after the panels loop (it uses `display: block`):
```js
const notesPanel = document.getElementById('notes-panel');
if (notesPanel && notesPanel.style.display === 'block') {
  d.notesPanel.closeNotesPanel();
  return;
}
```

### New CSS (append to styles.css)
```css
/* ── Session modal ─────────────────────────────────── */
.session-modal-fullscreen .modal-content {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.session-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--border);
  gap: 1rem;
}
.session-modal-task-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-timer {
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  white-space: nowrap;
}
.session-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.session-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}
.session-notes-textarea {
  width: 100%;
  min-height: 120px;
  resize: vertical;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.9rem;
  padding: 0.6rem 0.75rem;
  font-family: inherit;
  box-sizing: border-box;
}
.session-notes-textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.session-history-divider {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  margin-bottom: 0.5rem;
}
.session-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.session-history-item {
  padding: 0.6rem 0.75rem;
  background: var(--bg-soft);
  border-radius: var(--radius);
  border-left: 2px solid var(--border);
}
.session-history-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}
.session-history-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}
.session-history-duration {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.session-history-notes {
  font-size: 0.88rem;
  color: var(--text);
  line-height: 1.5;
  white-space: pre-wrap;
}
.session-ai-pickup {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  color: var(--accent);
  font-style: italic;
}
.session-modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem 1rem;
  border-top: 1px solid var(--border);
}
.session-stop-btn {
  flex: 1;
}

/* Task card session button */
.btn-session {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-radius: 3px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.btn-session:hover {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
.btn-session-active {
  color: var(--accent);
  animation: pulse-session 2s ease-in-out infinite;
}
@keyframes pulse-session {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.task-time-total {
  font-size: 0.72rem;
  color: var(--text-muted);
  opacity: 0.75;
}
```

### Verification
After implementing, confirm:
- [ ] Clicking ▶ on a task card opens the session modal with the task name
- [ ] Timer counts up from 0 (or from when the session started if re-opening)
- [ ] Typing in the notes area works
- [ ] "Stop & save" closes modal, saves session, shows toast with duration
- [ ] Re-opening the task's session modal shows past sessions
- [ ] Total time accumulates and shows on the card after first session

---

## Phase 2 — Notes System

### What it does
A lightweight notes panel (slide-in from right) for quick thoughts. Notes are date-stamped and can optionally be linked to a task. They feed the archive calendar. `N` key opens it.

### New state fields (add to js/state.js and js/types.js)
```js
notes: []   // Array of AppNote objects
```

AppNote shape:
```js
{
  id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
  date: '2026-05-29',           // YYYY-MM-DD local date (use getTodayLocalYYYYMMDD())
  text: 'Quick thought...',     // plain text (no HTML)
  taskId: null,                 // optional — link to a task
  source: 'standalone',         // 'standalone' | 'quick-capture' | 'session' | 'ai_research'
  triaged: false,               // true = user reviewed in inbox, hide from inbox list
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

### New HTML — notes panel (add to index.html near other slide-in panels)
```html
<div id="notes-panel" class="notes-panel" style="display:none">
  <div class="notes-panel-header">
    <h3>Notes</h3>
    <button id="close-notes-panel" class="btn-close" aria-label="Close">×</button>
  </div>
  <div class="notes-panel-body">
    <div class="notes-capture-row">
      <textarea id="notes-quick-input" class="notes-quick-textarea" placeholder="Quick note... (Enter to save, Shift+Enter for new line)" rows="2"></textarea>
    </div>
    <div id="notes-today-section" class="notes-date-section">
      <div class="notes-date-label">Today</div>
      <div id="notes-today-list" class="notes-list"></div>
    </div>
    <div id="notes-older-section" class="notes-older-section">
      <div id="notes-older-list" class="notes-list"></div>
    </div>
  </div>
</div>
<div id="notes-panel-overlay" class="notes-panel-overlay" style="display:none"></div>
```

### New file: js/domain/notes.js
> **Pattern note:** Domain functions only mutate `state`. They do NOT call `persist()` or `saveState()`.
> The feature module (notes-panel.js) calls `deps.saveState()` after each mutation — same pattern as task-actions.js.

```js
import { state } from '../state.js';
import { getTodayLocalYYYYMMDD } from './tasks.js';

export function getNotes() {
  return (state.notes || []).slice();
}

export function getNotesForDate(dateStr) {
  return getNotes().filter(n => n.date === dateStr);
}

export function createNote(text, taskId = null, source = 'standalone') {
  if (!state.notes) state.notes = [];
  const note = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    date: getTodayLocalYYYYMMDD(),
    text: (text || '').trim(),
    taskId: taskId || null,
    source,
    triaged: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.notes.push(note);
  return note;  // caller must saveState()
}

export function updateNote(id, text) {
  const note = (state.notes || []).find(n => n.id === id);
  if (!note) return false;
  note.text = (text || '').trim();
  note.updatedAt = Date.now();
  return true;  // caller must saveState()
}

export function deleteNote(id) {
  if (!state.notes) return;
  state.notes = state.notes.filter(n => n.id !== id);
  // caller must saveState()
}

export function triageNote(id) {
  const note = (state.notes || []).find(n => n.id === id);
  if (!note) return;
  note.triaged = true;
  // caller must saveState()
}

export function searchNotes(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return getNotes();
  return getNotes().filter(n => (n.text || '').toLowerCase().includes(q));
}
```

### New file: js/features/notes-panel.js
Create a `createNotesPanel(deps)` factory following the same pattern as other feature modules. It should:
- Render today's notes and older notes grouped by date
- Handle the quick-input textarea (Enter = save, Shift+Enter = newline)
- Allow deleting a note (× button on each note)
- Expose `openNotesPanel()` and `closeNotesPanel()`
- Import from `js/domain/notes.js`

Each rendered note:
```html
<div class="note-item" data-note-id="...">
  <div class="note-text">...</div>
  <div class="note-meta">
    <span class="note-time">2:14pm</span>
    <span class="note-task-link" data-task-id="...">→ Task name</span>  <!-- if linked -->
    <button class="note-delete-btn" data-note-id="...">×</button>
  </div>
</div>
```

### Keyboard shortcuts: N, T, I (wire all three in Phase 2)
In `js/features/events.js`, find the existing keyboard shortcut handler. Wire the final state for all three keys now — do NOT create a temporary "T → add task" mapping:
- `N` → open notes panel
- `T` → focus the brain dump bar (show it first if hidden)
- `I` → open inbox session modal (stub is fine if inbox session isn't built yet — add in Phase 3)

Update the shortcuts overlay in `index.html` to:
```html
<dt>N</dt><dd>New note</dd>
<dt>T</dt><dd>Brain dump (quick capture)</dd>
<dt>I</dt><dd>Open inbox session</dd>
```

### CSS for notes panel (append to styles.css)
The app has no existing side-drawer pattern — don't try to match `.relationships-panel` (full-screen) or `.analytics-panel` (small tooltip). Use this new side-drawer CSS:

```css
/* ── Notes panel (side drawer) ──────────────────────── */
.notes-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 100vw;
  height: 100vh;
  background: var(--bg);
  border-left: 1px solid var(--border);
  z-index: 800;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 24px rgba(0,0,0,0.18);
}
.notes-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 799;
}
.notes-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.notes-panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}
.notes-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.notes-capture-row { display: flex; flex-direction: column; gap: 0.5rem; }
.notes-quick-textarea {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.9rem;
  padding: 0.6rem 0.75rem;
  font-family: inherit;
  box-sizing: border-box;
}
.notes-quick-textarea:focus { outline: none; border-color: var(--accent); }
.notes-date-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}
.notes-list { display: flex; flex-direction: column; gap: 0.5rem; }
.note-item {
  background: var(--bg-soft);
  border-radius: var(--radius);
  padding: 0.6rem 0.75rem;
  border-left: 2px solid var(--border);
}
.note-text { font-size: 0.88rem; color: var(--text); line-height: 1.5; white-space: pre-wrap; }
.note-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.3rem;
}
.note-time { font-size: 0.75rem; color: var(--text-muted); }
.note-task-link { font-size: 0.75rem; color: var(--accent); cursor: pointer; }
.note-delete-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0 0.25rem;
  line-height: 1;
}
.note-delete-btn:hover { color: var(--text); }
```

### Verification
- [ ] `N` key opens notes panel
- [ ] Typing in quick-input and pressing Enter saves a note and clears the input
- [ ] Notes appear grouped under "Today" and older dates below
- [ ] Notes persist after page refresh
- [ ] × on a note deletes it

---

## Phase 3 — Brain dump bar upgrade & Inbox Session

### Brain dump bar upgrade (js/features/events.js or wherever brain-dump is wired)
Find the brain dump submit handler. Add prefix detection:
- Text starting with `#` → strip the `#`, create a **note** (call `createNote()`) instead of a task
- Text starting with `!` → create task with priority `'critical'`  
- Default → existing behavior (task to Inbox pile)

Update the placeholder text in index.html:
```html
placeholder="Capture anything — Enter for task, # for note, ! for urgent..."
```

### Keyboard shortcut: T key
`T` should focus the brain dump bar (not open the add modal). Fast task capture. In the keydown handler:
```js
if (e.key === 'T' && !isTyping(e)) {
  e.preventDefault();
  const bar = document.getElementById('brain-dump-input');
  if (bar) { bar.focus(); bar.select(); }
}
```

### Inbox Session (new feature)

**What it does:** Opens a focused triage view showing all tasks in the Inbox pile + any notes not yet linked to a task. You process each item: route it, convert it, or drop it.

**New HTML (add to index.html):**
```html
<div id="inbox-session-modal" class="modal inbox-session-modal" style="display:none" role="dialog" aria-modal="true">
  <div class="modal-content inbox-session-content">
    <div class="modal-header">
      <h3>Inbox <span id="inbox-session-count" class="inbox-count-badge"></span></h3>
      <button id="close-inbox-session" class="btn-close">×</button>
    </div>
    <div class="modal-body" id="inbox-session-list"></div>
  </div>
</div>
```

**Each item in the inbox session:**
```html
<div class="inbox-item" data-id="..." data-type="task|note">
  <div class="inbox-item-text">...</div>
  <div class="inbox-item-actions">
    <!-- For tasks: -->
    <button class="inbox-route-btn" data-id="...">→ Route</button>
    <button class="inbox-done-btn" data-id="...">✓ Done</button>
    <button class="inbox-drop-btn" data-id="...">× Drop</button>
    <!-- Route expands inline to show: Category select + Pile select + [Confirm] -->

    <!-- For notes: -->
    <button class="inbox-to-task-btn" data-id="...">→ Make task</button>
    <button class="inbox-keep-btn" data-id="...">✓ Keep</button>
    <button class="inbox-drop-btn" data-id="...">× Drop</button>
  </div>
</div>
```

**Keyboard shortcut:** `I` opens the inbox session modal.

**New file:** `js/features/inbox-session.js` — `createInboxSession(deps)` factory.

### Verification
- [ ] `#thought` in brain dump creates a note, not a task
- [ ] `!urgent thing` creates a critical-priority task
- [ ] `T` key focuses the brain dump bar
- [ ] `I` key opens inbox session
- [ ] Inbox session shows tasks from Inbox pile
- [ ] "Route" button shows inline category/pile selectors and moves the task
- [ ] "Done" marks task complete
- [ ] "Drop" deletes the item

---

## Phase 4 — Archive Calendar upgrade

### What it does
Replace the current simple archive list with a calendar grid. Each day shows dots for completions and/or sessions. Clicking a day shows two sections: Completed tasks + Sessions worked on.

### Changes to index.html (replace archive modal body)
```html
<div id="archive-modal" class="modal" style="display:none" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
  <div class="modal-content modal-wide">
    <div class="modal-header">
      <h3 id="archive-modal-title">Archive</h3>
      <button id="close-archive" class="btn-close">×</button>
    </div>
    <div class="modal-body archive-calendar-body">
      <input id="archive-search-input" type="search" class="search-input" placeholder="Search completed tasks and notes..." autocomplete="off">
      <div id="archive-search-results" class="archive-search-results"></div>
      <div class="archive-cal-nav">
        <button type="button" id="archive-prev-month" class="btn-secondary btn-sm">←</button>
        <span id="archive-month-label"></span>
        <button type="button" id="archive-next-month" class="btn-secondary btn-sm">→</button>
      </div>
      <div id="archive-calendar-grid" class="archive-calendar-grid"></div>
      <div id="archive-day-detail" class="archive-day-detail">
        <p class="settings-hint">Select a day to see what happened</p>
      </div>
    </div>
  </div>
</div>
```

### Replace inline openArchiveModal in js/app/orchestrator.js
The current orchestrator has an inline `openArchiveModal` function (around line 1803) that directly renders a flat list into `#archive-list`. **Delete this entire function.** Replace it by instantiating the new `createArchiveCalendar(deps)` factory and wiring the archive button to call `archiveCalendar.open()` instead.

Also update the HTML: the current archive modal body has `<div id="archive-list" class="archive-list"></div>`. Replace the entire modal body content with the new calendar HTML shown below in the index.html section.

### New file: js/features/archive-calendar.js
Create `createArchiveCalendar(deps)` factory. It should:

**Calendar grid:** A 7-column CSS grid, Sun–Sat headers, one button per day. Days with data get a dot. Data = completions OR sessions that day.

```js
// IMPORTANT: Always use toLocaleDateString('en-CA') for local-timezone YYYY-MM-DD.
// Never use toISOString().slice(0,10) or sess.start.slice(0,10) — those are UTC and
// will show the wrong day for users in negative-offset timezones.

function getSessionsByDay() {
  // Scan ALL tasks (including active), find sessions with start dates
  const map = {};
  (state.items || []).forEach(item => {
    (item.sessions || []).forEach(sess => {
      const day = new Date(sess.start).toLocaleDateString('en-CA'); // local YYYY-MM-DD
      if (!map[day]) map[day] = [];
      map[day].push({ item, sess });
    });
  });
  return map;
}

function getCompletionsByDay() {
  const map = {};
  (state.items || []).filter(i => i.archived && i.completedAt).forEach(i => {
    const day = new Date(i.completedAt).toLocaleDateString('en-CA'); // local YYYY-MM-DD
    if (!map[day]) map[day] = [];
    map[day].push(i);
  });
  return map;
}

function getNotesByDay() {
  const map = {};
  (state.notes || []).forEach(n => {
    const day = n.date; // already YYYY-MM-DD local (set at creation)
    if (!map[day]) map[day] = [];
    map[day].push(n);
  });
  return map;
}
```

**Day detail rendering:** When a day is clicked, show all three sections (omit any section with no items for that day):
```
May 29, 2026
─────────────────────────────────────
COMPLETED (2)
  ✓ Fix the leaky faucet  ·  Life
  ✓ Email accountant  ·  Work

SESSIONS (2)
  Write the bridge  ·  Cycles  ·  1h 30m
  └ "Wrote verse 2. Bridge still feels off."
  Grant report draft  ·  Work  ·  2h 05m
  └ "Outlined sections 2-4..."

NOTES (1)
  "Reminder: check the bridge chord progression tomorrow"
─────────────────────────────────────
```

Use `getCompletionsByDay()`, `getSessionsByDay()`, and `getNotesByDay()` to build the detail view.
A day gets a dot if it has ANY of: completions, sessions, or notes.

**Search:** Searches text of archived tasks, session notes, AND standalone notes. Results show as a flat list below the search input.

### CSS (append to styles.css)
Use the existing `.archive-*` class patterns. Add:
```css
.archive-calendar-body { max-height: 80vh; overflow-y: auto; }
.archive-cal-nav { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0; }
.archive-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 1rem; }
.archive-cal-dow { text-align: center; font-size: 0.7rem; color: var(--text-muted); padding: 0.25rem; }
.archive-cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius); border: 1px solid transparent; background: var(--bg-soft); cursor: pointer; font-size: 0.82rem; color: var(--text-muted); gap: 2px; transition: background 0.1s; }
.archive-cal-cell:hover { background: color-mix(in srgb, var(--accent) 12%, var(--bg-soft)); }
.archive-cal-cell.has-data { color: var(--text); font-weight: 600; }
.archive-cal-cell.has-data:after { content: ''; display: block; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
.archive-cal-empty { background: transparent; border-color: transparent; cursor: default; }
.archive-day-detail { border-top: 1px solid var(--border); padding-top: 0.75rem; }
.archive-day-section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin: 0.75rem 0 0.35rem; }
.archive-completed-item { font-size: 0.88rem; color: var(--text); padding: 0.25rem 0; }
.archive-session-item { font-size: 0.88rem; color: var(--text); padding: 0.35rem 0; }
.archive-session-item-notes { font-size: 0.82rem; color: var(--text-muted); padding-left: 1rem; margin-top: 0.15rem; white-space: pre-wrap; }
```

### Verification
- [ ] Archive opens with a calendar grid
- [ ] Days with completed tasks show a dot
- [ ] Days with session work show a dot
- [ ] Days with standalone notes only show a dot
- [ ] Clicking a day shows COMPLETED, SESSIONS, and NOTES sections (each only if data exists)
- [ ] Session notes are visible under each session entry
- [ ] A notes-only day shows only a NOTES section (no empty state)
- [ ] Search finds archived task text, session note text, and standalone note text

---

## Phase 5 — AI Research (⚡ button)

> **Note:** This phase requires the Claude Code scheduled agent to be set up separately. The app side just flags tasks and displays results. The actual research is done by a Claude Code cron job.

### New data fields on tasks
```js
aiAction: null,         // 'research' | 'buy' | null — app sets this to queue work
aiActionPrompt: null,   // the user's specific request string
aiResult: null,         // { type, summary, links: [{title, url, note}], createdAt } — Claude writes this
aiResultRead: false     // whether user has dismissed/seen the result
```

### Task card: ⚡ button
Add to `.task-actions` alongside the session button:
```html
<button class="btn-ai-research" data-id="..." title="Ask Claude to research this">⚡</button>
```

Clicking ⚡ opens a small inline expansion below the card (or a mini modal):
```
What do you need?
[______________________________________________]   [Send]
e.g. "find me 3 options under $100" or "book a dentist near Toronto"
```

On Send: sets `item.aiAction = 'research'`, `item.aiActionPrompt = text`, calls `saveState()`, closes the input, shows a subtle "⏳ Queued for Claude" badge on the card.

### Result display
When `item.aiResult` is populated (Claude wrote it back), the card shows a "⚡ Result ready" chip. Clicking it (or opening the edit modal) shows the result:
```
⚡ Claude found:
[Summary text]

[Link 1 title]  →  url
[Link 2 title]  →  url
[Link 3 title]  →  url

[Dismiss]
```

### Supabase — NO schema change needed
~~Run this migration...~~ **SKIP. Do not run any SQL.**
The app stores ALL data as a single JSON blob in `device_preferences.preferences` (not individual columns). `aiAction`, `aiActionPrompt`, and `aiResult` are just fields on the task object inside that blob. No ALTER TABLE, no migration, nothing.

### Claude cron job (separate setup — not in this file)
This is set up in Claude Code as a scheduled task. It:
1. Reads the full preferences JSON from Supabase for your `deviceSyncId`
2. Finds tasks where `item.aiAction !== null`
3. For each: does web research (WebSearch + WebFetch), formats a result
4. Writes result to `item.aiResult`, clears `item.aiAction`
5. Saves the updated JSON back to Supabase

### Verification
- [ ] ⚡ button appears on every card
- [ ] Clicking it shows the prompt input
- [ ] Submitting sets `aiAction` on the task (check localStorage)
- [ ] A queued indicator shows on the card
- [ ] When `aiResult` is manually set in localStorage, the card shows "Result ready"
- [ ] Clicking "Result ready" shows the result with links

---

## General notes for Cursor

### Do not touch
- `config.js` — different credentials per environment
- `sw.js` — service worker, leave as-is
- Any files in `mom-parking-lot-app/` or `accounting-app/`

### After each phase
1. Test in browser at `http://localhost:5175`
2. Check browser console for errors
3. Add/edit tasks to verify data persists after refresh
4. Mirror changed files to `parking-lot-app/` using the same relative paths — **NEVER copy `config.js`**
5. `cd /Volumes/BitchBaby1999/Coding/Personal/Hub-App`
6. `git add parking-lot-app/`
7. `git commit -m "Deploy parking-lot-v2: <phase name summary>"`
8. **STOP. Do not push yet.** Tell the user the phase is ready for review at `http://localhost:5175`.
   The user will have Claude review it via the preview before pushing.
9. Only run `git push` after the user explicitly says "approved" or "push it".

### Code style
- No TypeScript, no JSX, no bundler
- ES modules (`import`/`export`)
- Template literals for HTML strings
- `escapeHtml()` from `js/utils/dom.js` for any user content in HTML
- CSS variables: `var(--text)`, `var(--text-muted)`, `var(--bg)`, `var(--bg-soft)`, `var(--border)`, `var(--accent)`, `var(--radius)`
- Match the visual style of existing modals (dark, minimal, rounded)

---

## Cursor Q&A — resolved decisions

### Phase 1 — Sessions & Timer

**One active session globally?**
Auto-pause A when ▶ is pressed on task B. Write A as a completed partial session with `paused: true` AND `notes: 'auto-paused'` on the session object. Elapsed time at the moment of auto-pause counts toward `durationSeconds`. Do not allow two simultaneous timers.

**Cancel vs Stop**
- **Cancel / X on the modal** = close the modal but keep the timer running in the background. The ▶ button on the card should change to a pulsing ■ indicator while a session is active so the user can reopen it.
- **Stop & Save** = end the session, compute duration, persist to `task.sessions[]`, clear `task.activeSessionStart`.
There is no "discard session" option in Phase 1.

**Session notes vs Notes system**
Phase 1 session notes stay on `task.sessions[]` only. Do NOT auto-create a global `state.notes` entry when a session is stopped. The archive calendar (Phase 4) will pull session notes directly from tasks.

**escapeHtml**
Always import from `js/utils/dom.js`. Never inline a copy.

---

### Phase 2–3 — Notes, shortcuts, brain dump

**T key evolution**
Final mapping (Phase 3 is the canonical state):
- `N` = open Notes panel
- `T` = focus the brain dump bar
- `I` = open Inbox session modal
- No keyboard shortcut for the add-task modal (it stays accessible via the + button only).
Phase 2 should NOT wire T → add modal. Skip that interim mapping entirely and go straight to T → brain dump bar focus.

**Brain-dump `#` notes**
Create with: today's local date (`getTodayLocalYYYYMMDD()`), `taskId: null`, `source: 'quick-capture'`. No extra metadata beyond the standard AppNote shape.

**Inbox "unlinked notes"**
Strictly `taskId === null`. Notes with a taskId pointing to a deleted task are an edge case — ignore for now.

**Inbox "Keep" on a note**
Add a `triaged: true` boolean to the AppNote. "Keep" sets `triaged: true` and saves state. The inbox list filters to `triaged !== true`. The note remains in `state.notes` and is visible everywhere else (Notes panel, archive calendar). "Link to task" should also set `triaged: true`.

---

### Phase 4 — Archive calendar

**Completion day (dot color)**
Use `completedAt` with local date. Parse via `new Date(item.completedAt).toLocaleDateString('en-CA')` (returns `YYYY-MM-DD` in local timezone). Do not use `toISOString().slice(0, 10)` — that's UTC and will be off by a day for users in negative-offset timezones.

**Session day**
Same rule: use `new Date(sess.start).toLocaleDateString('en-CA')` for local calendar alignment.

**Archive search scope**
Include all of: completed tasks, standalone notes (`state.notes`), session notes embedded on tasks, and active (non-archived) tasks that have at least one session. If a day had any of these, it gets a dot.

**Notes-only days**
Yes — a day with only standalone notes (no completions, no sessions) should still get a dot on the calendar. All activity counts. When clicking a notes-only day, the detail panel shows a NOTES section listing those notes — no "nothing here" state.

---

### Phase 5 — AI research

**UI shape**
Inline expansion under the card (not a modal). The card grows to show a status row → result block once `aiResult` is populated. Less disruptive, keeps context.

**`aiAction: 'buy'`**
Ignore for now. Only implement `'research'`.

**Cron / Supabase**
Correct — no database migration, no schema change. Everything rides inside the existing JSON blob at `device_preferences.preferences`. Cursor builds only the in-app queue (writing `aiAction`) and the result display (reading `aiResult`). The Claude cron job that actually calls the API is a separate concern and will be set up independently.

**SQL `ALTER TABLE` block in Phase 5**
Treat as obsolete. Skip it entirely. JSON blob only.

---

### Testing & leftovers

**Automated tests**
Browser checklist only. No Playwright or Vitest updates required.

**`aiPickup` on session objects**
Leave as `null`. It's reserved for a future phase that isn't defined yet.

---

### Round 2 — additional resolved decisions

**Auto-pause session shape (final)**
`paused: true` + `notes: 'auto-paused'` on the session object. `durationSeconds` = elapsed ms / 1000 at the moment of auto-pause. This is a full closed session (has `end` timestamp), just flagged so the UI can render it differently if desired.

**Archive day detail — notes-only days**
Show a NOTES section in the day detail panel. If a day has only notes (no completions, no sessions), the panel renders NOTES only. Never show an empty state for a day that has a dot.

**T key + hidden brain dump bar**
T always works. If the brain dump bar is hidden/collapsed, T reveals it first, then focuses the input. Never silently no-ops.

**Confirmed defaults (no changes needed)**
- `AppNote` type extended with `triaged: boolean` and `source: 'quick-capture' | 'session' | 'standalone'`
- Auto-paused session `durationSeconds` counts toward task `totalTimeSeconds`
- Notes panel, session modal, and inbox modal all added to the global Esc close handler
