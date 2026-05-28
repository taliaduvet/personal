/**
 * Unified Today: focus pile + other, single list, or blank-today layout.
 * Same markup is painted into #today-list and #focus-list so Focus mode matches Today.
 */
import { escapeHtml } from '../utils/dom.js';
import { getColumnColor, getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { getPileName, getPeople, isOverdueToReconnect } from '../domain/piles-people.js';
import {
  getTodayLayoutMode,
  normalizeWeekPlan,
  pruneWeekPlan,
  getFocusPileTasks,
  getOtherBlockTasks,
  getSingleListNoPlanItems,
  getMondayYYYYMMDD,
  swapFocusPileAdjacent,
  WEEK_DAY_PLAN_NOTE_MAX_LEN
} from '../domain/weekly-planning.js';
import { clearHiddenFromTodayForTaskState } from '../domain/task-actions.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(id: string) => void} d.markDone
 * @param {() => void} d.renderColumns
 * @param {(opts?: { scrollToDate?: string }) => void} d.openPlanningEntry
 * @param {() => void} [d.onWeekPlanChanged] sync prefs after week plan edits from Today
 */
export function createUnifiedTodayRenderer(d) {
  /** @type {ReturnType<typeof setTimeout>|null} */
  let todayNoteSaveTimer = null;
  let todayNoteInputWired = false;

  function hiddenSetFor(todayStr) {
    const h = d.state.hiddenFromTodayByDate;
    const arr = h && Array.isArray(h[todayStr]) ? h[todayStr] : [];
    return new Set(arr);
  }

  function refreshTodayAndFocus() {
    renderTodayList();
    renderFocusUnified();
  }

  function getTodayPlanNoteText() {
    const todayStr = getTodayLocalYYYYMMDD();
    const wp = normalizeWeekPlan(d.state.weekPlan);
    const day = wp.days[todayStr];
    return day && typeof day.note === 'string' ? day.note : '';
  }

  function persistTodayNoteFromField(raw) {
    const mon = getMondayYYYYMMDD();
    const todayStr = getTodayLocalYYYYMMDD();
    let note = (raw || '').replace(/\r\n/g, '\n');
    if (note.length > WEEK_DAY_PLAN_NOTE_MAX_LEN) note = note.slice(0, WEEK_DAY_PLAN_NOTE_MAX_LEN);

    d.state.weekPlan = normalizeWeekPlan(d.state.weekPlan);
    if (!d.state.weekPlan.days[todayStr]) {
      d.state.weekPlan.days[todayStr] = {
        pileId: null,
        orderedTaskIds: [],
        note: '',
        excludedTaskIds: []
      };
    }
    d.state.weekPlan.days[todayStr].note = note;
    d.state.weekPlan.anchorWeekStart = mon;
    d.state.weekPlan = pruneWeekPlan(d.state.items, d.state.weekPlan);
    d.saveState();
    if (typeof d.onWeekPlanChanged === 'function') d.onWeekPlanChanged();
    refreshTodayAndFocus();
  }

  function syncTodayNoteFields() {
    const v = getTodayPlanNoteText();
    document.querySelectorAll('.today-main-note-field').forEach((ta) => {
      if (document.activeElement === ta) return;
      if (ta.value !== v) ta.value = v;
    });
  }

  function wireTodayNoteFieldsOnce() {
    if (todayNoteInputWired) return;
    todayNoteInputWired = true;
    document.addEventListener(
      'input',
      (e) => {
        const t = e.target;
        if (!t || !(t instanceof HTMLTextAreaElement)) return;
        if (!t.classList.contains('today-main-note-field')) return;
        if (todayNoteSaveTimer) clearTimeout(todayNoteSaveTimer);
        todayNoteSaveTimer = setTimeout(() => {
          todayNoteSaveTimer = null;
          persistTodayNoteFromField(t.value);
        }, 350);
      },
      true
    );
  }

  const ESTIMATE_MINUTES = { '~5m': 5, '~30m': 30, '~1h': 60, '~2h+': 120 };

  function capacityTotalHtml(items) {
    const known = items.filter(i => i.estimate && ESTIMATE_MINUTES[i.estimate]);
    if (!known.length) return '';
    const total = known.reduce((sum, i) => sum + ESTIMATE_MINUTES[i.estimate], 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    const label = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    return `<div class="today-capacity-total" title="Estimated total time for ${known.length} of ${items.length} tasks">~${label} total</div>`;
  }

  function overwhelmBannerHtml(items, todayStr) {
    if (items.length <= 5) return '';
    if (d.state.todayOverwhelmDismissed === todayStr) return '';
    return `<div class="today-overwhelm-banner" data-dismiss-overwhelm>
      <span>You've got <strong>${items.length} tasks</strong> for today — that's a lot. Which 3 actually matter most?</span>
      <button type="button" class="btn-dismiss-overwhelm" title="Dismiss">✕</button>
    </div>`;
  }

  function overdueReconnectHtml() {
    const people = getPeople();
    const overdue = people.filter(isOverdueToReconnect);
    if (!overdue.length) return '';
    const names = overdue.slice(0, 3).map(p => escapeHtml(p.name)).join(', ');
    const extra = overdue.length > 3 ? ` +${overdue.length - 3} more` : '';
    return `<div class="today-reconnect-nudge">Reach out to: <strong>${names}${extra}</strong></div>`;
  }

  /** One shared "Day note" control per list root (Today vs Focus); same backing field as week plan day note. */
  function dayNoteEditorHtml(rootId) {
    const safeId = `today-main-note-${rootId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const hasNote = getTodayPlanNoteText().length > 0;
    return `<details class="unified-today-day-note" ${hasNote ? 'open' : ''} aria-label="Day note">
      <summary class="unified-today-day-note-toggle">${hasNote ? 'Day note' : '+ Note'}</summary>
      <textarea id="${safeId}" class="settings-name-input today-main-note-field" rows="2" maxlength="400" placeholder="Jot something for today…" aria-label="Day note"></textarea>
    </details>`;
  }

  function taskRowHtml(item, extraClass = '', orderOpt) {
    const accent = getColumnColor(item.category);
    const order =
      orderOpt && orderOpt.show
        ? `<div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!orderOpt.canUp ? 'disabled' : ''} title="Move up">↑</button>
          <button type="button" class="btn-order" data-action="down" ${!orderOpt.canDown ? 'disabled' : ''} title="Move down">↓</button>
        </div>`
        : '';
    return `<div class="today-item today-item-accent ${extraClass}" data-id="${escapeHtml(item.id)}" style="--today-accent: ${accent}">
      ${order}
      <span class="task-text">${escapeHtml(item.text)}</span>
      <button type="button" class="btn-done btn-done-check" title="Done">✓</button>
      <button type="button" class="btn-remove" title="Remove from Today">Remove</button>
    </div>`;
  }

  function applyFocusPileReorder(todayStr, taskId, direction) {
    const wp = normalizeWeekPlan(d.state.weekPlan);
    const dayEntry = wp.days[todayStr];
    if (!dayEntry || !dayEntry.pileId) return;
    const next = swapFocusPileAdjacent(
      d.state.items,
      todayStr,
      dayEntry,
      taskId,
      direction,
      hiddenSetFor(todayStr)
    );
    if (!next) return;
    if (!d.state.weekPlan.days[todayStr]) {
      d.state.weekPlan.days[todayStr] = {
        pileId: dayEntry.pileId,
        orderedTaskIds: [],
        note: typeof dayEntry.note === 'string' ? dayEntry.note : '',
        excludedTaskIds: Array.isArray(dayEntry.excludedTaskIds) ? [...dayEntry.excludedTaskIds] : []
      };
    }
    d.state.weekPlan.days[todayStr].pileId = dayEntry.pileId;
    d.state.weekPlan.days[todayStr].orderedTaskIds = next;
    d.state.weekPlan = pruneWeekPlan(d.state.items, d.state.weekPlan);
    d.saveState();
    if (typeof d.onWeekPlanChanged === 'function') d.onWeekPlanChanged();
    refreshTodayAndFocus();
    d.renderColumns();
  }

  function bindTodayListEvents(root, { removeFromToday, reorderExplicit, focusPileReorderTodayStr }) {
    /* Done / Remove: delegated on #main-app in orchestrator (wireComposer) so clicks always fire after innerHTML repaints */
    if (reorderExplicit) {
      root.querySelectorAll('.btn-order').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const row = e.target.closest('.today-item');
          const id = row && row.dataset.id;
          if (!id) return;
          const idx = d.state.todaySuggestionIds.indexOf(id);
          if (idx < 0) return;
          if (e.target.dataset.action === 'up' && idx > 0) {
            const t = d.state.todaySuggestionIds[idx - 1];
            d.state.todaySuggestionIds[idx - 1] = d.state.todaySuggestionIds[idx];
            d.state.todaySuggestionIds[idx] = t;
          } else if (e.target.dataset.action === 'down' && idx < d.state.todaySuggestionIds.length - 1) {
            const t = d.state.todaySuggestionIds[idx + 1];
            d.state.todaySuggestionIds[idx + 1] = d.state.todaySuggestionIds[idx];
            d.state.todaySuggestionIds[idx] = t;
          }
          d.saveState();
          refreshTodayAndFocus();
          d.renderColumns();
        });
      });
    }
    if (focusPileReorderTodayStr) {
      const todayStr = focusPileReorderTodayStr;
      root.querySelectorAll('.btn-order').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const row = e.target.closest('.today-item');
          const id = row && row.dataset.id;
          if (!id) return;
          const dir = e.target.dataset.action === 'up' ? 'up' : 'down';
          applyFocusPileReorder(todayStr, id, dir);
        });
      });
    }
  }

  function clearHiddenFromTodayForTask(taskId) {
    clearHiddenFromTodayForTaskState(d.state, taskId);
  }

  function removeFromToday(id) {
    const todayStr = getTodayLocalYYYYMMDD();
    const item = d.state.items.find(i => i.id === id);
    if (item) item.skippedFromToday = (item.skippedFromToday || 0) + 1;
    d.state.todaySuggestionIds = d.state.todaySuggestionIds.filter(x => x !== id);
    d.state.weekPlan = normalizeWeekPlan(d.state.weekPlan);
    const day = d.state.weekPlan.days[todayStr];
    if (day && Array.isArray(day.orderedTaskIds)) {
      day.orderedTaskIds = day.orderedTaskIds.filter(x => x !== id);
    }
    if (!d.state.hiddenFromTodayByDate || typeof d.state.hiddenFromTodayByDate !== 'object') {
      d.state.hiddenFromTodayByDate = {};
    }
    if (!d.state.hiddenFromTodayByDate[todayStr]) d.state.hiddenFromTodayByDate[todayStr] = [];
    if (!d.state.hiddenFromTodayByDate[todayStr].includes(id)) {
      d.state.hiddenFromTodayByDate[todayStr].push(id);
    }
    d.state.weekPlan = pruneWeekPlan(d.state.items, d.state.weekPlan);
    d.saveState();
    refreshTodayAndFocus();
    d.renderColumns();
  }

  /**
   * @param {HTMLElement} root #today-list or #focus-list
   */
  function paintUnifiedToday(root) {
    const todayStr = getTodayLocalYYYYMMDD();
    const wp = normalizeWeekPlan(d.state.weekPlan);
    const rid = root.id || 'today';

    const mode = getTodayLayoutMode(wp, todayStr);

    if (mode === 'no_week') {
      const isFocusMode = rid === 'focus-list';
      const items = getSingleListNoPlanItems(
        d.state.items,
        todayStr,
        d.state.todaySuggestionIds,
        hiddenSetFor(todayStr)
      );
      root.innerHTML = `
        <div class="unified-today-no-plan">
          ${dayNoteEditorHtml(rid)}
          ${overwhelmBannerHtml(items, todayStr)}
          ${capacityTotalHtml(items)}
          ${isFocusMode
            ? `<div class="unified-today-plan-cta">
                <p class="unified-today-plan-cta-msg">No week plan yet — set one to unlock your daily focus pile.</p>
                <button type="button" class="btn-primary unified-today-plan-cta-btn">Plan your week →</button>
               </div>`
            : `<p class="unified-today-plan-hint-muted">Use <strong>Plan</strong> in the header when you're ready to set this week's focus.</p>`}
          <div class="unified-today-section-body" data-section="single">${items.length ? items.map((i) => {
            const idx = d.state.todaySuggestionIds.indexOf(i.id);
            const inExp = idx >= 0;
            const canUp = inExp && idx > 0;
            const canDown = inExp && idx < d.state.todaySuggestionIds.length - 1;
            return taskRowHtml(i, '', inExp ? { show: true, canUp, canDown } : null);
          }).join('') : '<div class="empty-state">Nothing dated for today — add tasks below or drag them here</div>'}</div>
        </div>`;
      bindTodayListEvents(root, { removeFromToday, reorderExplicit: true });
      root.querySelector('.unified-today-plan-cta-btn')?.addEventListener('click', () => d.openPlanningEntry({}));
      root.querySelector('.btn-dismiss-overwhelm')?.addEventListener('click', () => {
        d.state.todayOverwhelmDismissed = todayStr;
        d.saveState();
        refreshTodayAndFocus();
      });
      return;
    }

    if (mode === 'blank_today') {
      const otherItems = getSingleListNoPlanItems(
        d.state.items,
        todayStr,
        d.state.todaySuggestionIds,
        hiddenSetFor(todayStr)
      );
      const otherOpen = d.state.otherCollapsedOnDate !== todayStr;
      root.innerHTML = `
        <div class="unified-today-blank">
          ${dayNoteEditorHtml(rid)}
          ${overwhelmBannerHtml(otherItems, todayStr)}
          ${capacityTotalHtml(otherItems)}
          <div class="unified-today-banner"><strong>No focus pile for today</strong> — <button type="button" class="btn-link set-plan-today-btn">Plan your week →</button></div>
          <details class="unified-today-details" ${otherOpen ? 'open' : ''} data-section="other">
            <summary>Other <span class="badge-count" data-other-count>${otherItems.length}</span></summary>
            ${overdueReconnectHtml()}
            <div class="unified-today-section-body">${otherItems.length ? otherItems.map(i => taskRowHtml(i)).join('') : '<div class="empty-state">Nothing here yet</div>'}</div>
          </details>
        </div>`;
      bindTodayListEvents(root, { removeFromToday });
      root.querySelector('.set-plan-today-btn')?.addEventListener('click', () => d.openPlanningEntry({ scrollToDate: todayStr }));
      root.querySelector('.btn-dismiss-overwhelm')?.addEventListener('click', () => {
        d.state.todayOverwhelmDismissed = todayStr;
        d.saveState();
        refreshTodayAndFocus();
      });
      const det = root.querySelector('details[data-section="other"]');
      det?.addEventListener('toggle', () => {
        if (!det.open) d.state.otherCollapsedOnDate = todayStr;
        else d.state.otherCollapsedOnDate = null;
        d.saveState();
      });
      return;
    }

    const dayEntry = wp.days[todayStr] || { pileId: null, orderedTaskIds: [], note: '', excludedTaskIds: [] };
    const pileId = dayEntry.pileId;
    const pileLabel = pileId ? (getPileName(pileId) || pileId) : '—';
    const hidden = hiddenSetFor(todayStr);
    const focusItems = getFocusPileTasks(d.state.items, todayStr, dayEntry, hidden);
    const otherItems = getOtherBlockTasks(
      d.state.items,
      todayStr,
      pileId,
      d.state.todaySuggestionIds,
      hidden
    );
    // "Outside the plan" is closed by default; only open if user explicitly opened it today
    const otherOpen = d.state.otherOpenedOnDate === todayStr;

    const allTodayItems = [...focusItems, ...otherItems];
    root.innerHTML = `
      <div class="unified-today-with-plan">
        ${dayNoteEditorHtml(rid)}
        ${overwhelmBannerHtml(allTodayItems, todayStr)}
        ${capacityTotalHtml(allTodayItems)}
        <details class="unified-today-details unified-today-focus" open data-section="focus">
          <summary>Today: ${escapeHtml(pileLabel)}</summary>
          <p class="unified-today-focus-hint">
            <button type="button" class="btn-link pile-change-today-btn" title="Switch today's pile">↻ Switch pile</button>
            · <button type="button" class="btn-link unified-today-review-plan-btn">Review week</button>
          </p>
          <div class="unified-today-section-body">${focusItems.length ? focusItems.map((i, idx) => {
            const canUp = idx > 0;
            const canDown = idx < focusItems.length - 1;
            return taskRowHtml(i, '', { show: true, canUp, canDown });
          }).join('') : '<div class="empty-state">No tasks in this pile — add on the board</div>'}</div>
        </details>
        <details class="unified-today-details unified-today-escape" ${otherOpen ? 'open' : ''} data-section="other">
          <summary class="unified-today-other-summary">Outside the plan <span class="badge-count">${otherItems.length}</span></summary>
          ${overdueReconnectHtml()}
          <div class="unified-today-section-body">${otherItems.length ? otherItems.map(i => taskRowHtml(i)).join('') : '<div class="empty-state">Nothing else dated or pinned for today</div>'}</div>
        </details>
      </div>`;

    bindTodayListEvents(root, { removeFromToday, focusPileReorderTodayStr: todayStr });
    root.querySelector('.unified-today-review-plan-btn')?.addEventListener('click', () => {
      if (typeof d.openWeekView === 'function') d.openWeekView();
      else d.openPlanningEntry({ scrollToDate: todayStr });
    });
    root.querySelector('.pile-change-today-btn')?.addEventListener('click', function(e) {
      showPilePickerForToday(e.currentTarget, todayStr, pileId);
    });
    root.querySelector('.btn-dismiss-overwhelm')?.addEventListener('click', () => {
      d.state.todayOverwhelmDismissed = todayStr;
      d.saveState();
      refreshTodayAndFocus();
    });
    const otherDet = root.querySelector('details[data-section="other"]');
    otherDet?.addEventListener('toggle', () => {
      if (otherDet.open) d.state.otherOpenedOnDate = todayStr;
      else d.state.otherOpenedOnDate = null;
      d.saveState();
    });
  }

  // ── Mid-week pile reassignment ─────────────────────────────────

  function applyTodayPileChange(todayStr, newPileId) {
    const mon = getMondayYYYYMMDD();
    d.state.weekPlan = normalizeWeekPlan(d.state.weekPlan);
    if (!d.state.weekPlan.days[todayStr]) {
      d.state.weekPlan.days[todayStr] = { pileId: null, orderedTaskIds: [], note: '', excludedTaskIds: [] };
    }
    d.state.weekPlan.days[todayStr].pileId = newPileId;
    d.state.weekPlan.anchorWeekStart = mon;
    d.state.weekPlan = pruneWeekPlan(d.state.items, d.state.weekPlan);
    d.saveState();
    if (typeof d.onWeekPlanChanged === 'function') d.onWeekPlanChanged();
    refreshTodayAndFocus();
    d.renderColumns();
  }

  function showPilePickerForToday(anchorBtn, todayStr, currentPileId) {
    document.getElementById('today-pile-picker-popup')?.remove();
    const piles = (d.state.piles || []).filter(p => p && !p.archived);
    if (!piles.length) return;
    const popup = document.createElement('div');
    popup.id = 'today-pile-picker-popup';
    popup.className = 'today-pile-picker-popup';
    popup.innerHTML = `<div class="today-pile-picker-header">Switch today’s pile</div>
      ${piles.map(p => `<button type="button" class="today-pile-picker-option${p.id === currentPileId ? ' active' : ''}" data-pile-id="${escapeHtml(p.id)}">${escapeHtml(p.name || p.id)}</button>`).join('')}`;
    document.body.appendChild(popup);
    const rect = anchorBtn.getBoundingClientRect();
    popup.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 210) + 'px';
    popup.querySelectorAll('.today-pile-picker-option').forEach(opt => {
      opt.addEventListener('click', () => {
        popup.remove();
        applyTodayPileChange(todayStr, opt.dataset.pileId);
      });
    });
    function onOutside(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', onOutside, true);
      }
    }
    setTimeout(() => document.addEventListener('click', onOutside, true), 0);
  }

  // ── Select text in note → create task ──────────────────────────

  function wireSelectionToTaskPopup(textarea, pileId) {
    if (!d.openAddModal) return;
    let popup = document.getElementById('selection-task-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'selection-task-popup';
      popup.className = 'selection-task-popup';
      popup.innerHTML = '<button type="button" class="selection-task-popup-btn">→ Create task</button>';
      document.body.appendChild(popup);
      popup.querySelector('.selection-task-popup-btn').addEventListener('click', () => {
        const text = popup._selectedText || '';
        const pid = popup._pileId || null;
        popup.style.display = 'none';
        if (text) d.openAddModal(null, pid, text);
      });
    }
    textarea.addEventListener('mouseup', () => {
      const sel = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
      if (!sel) { popup.style.display = 'none'; return; }
      popup._selectedText = sel;
      popup._pileId = pileId;
      const rect = textarea.getBoundingClientRect();
      popup.style.display = 'flex';
      popup.style.top = (rect.bottom + window.scrollY + 4) + 'px';
      popup.style.left = rect.left + 'px';
    });
    textarea.addEventListener('blur', () => {
      setTimeout(() => { popup.style.display = 'none'; }, 200);
    });
  }

  function wireSelectionPopupsInRoot(root) {
    if (!d.openAddModal) return;
    const todayStr = getTodayLocalYYYYMMDD();
    const wp = normalizeWeekPlan(d.state.weekPlan);
    const dayEntry = wp.days[todayStr];
    const pileId = dayEntry ? dayEntry.pileId : null;
    root.querySelectorAll('.today-main-note-field').forEach(ta => {
      if (ta.dataset.selPopupWired) return;
      ta.dataset.selPopupWired = '1';
      wireSelectionToTaskPopup(ta, pileId);
    });
  }

  function renderTodayList() {
    const root = document.getElementById('today-list');
    if (!root) return;
    wireTodayNoteFieldsOnce();
    paintUnifiedToday(root);
    syncTodayNoteFields();
    wireSelectionPopupsInRoot(root);
  }

  function renderFocusUnified() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    wireTodayNoteFieldsOnce();
    paintUnifiedToday(list);
    syncTodayNoteFields();
    wireSelectionPopupsInRoot(list);
  }

  return {
    renderTodayList,
    renderFocusUnified,
    removeFromToday,
    clearHiddenFromTodayForTask,
    syncTodayNoteFields,
    wireTodayNoteFieldsOnce
  };
}
