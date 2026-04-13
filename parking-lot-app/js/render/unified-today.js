/**
 * Unified Today: focus pile + other, single list, or blank-today layout.
 * Same markup is painted into #today-list and #focus-list so Focus mode matches Today.
 */
import { escapeHtml } from '../utils/dom.js';
import { getColumnColor, getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { getPileName } from '../domain/piles-people.js';
import {
  getTodayLayoutMode,
  normalizeWeekPlan,
  pruneWeekPlan,
  rollWeekPlanIfStale,
  getFocusPileTasks,
  getOtherBlockTasks,
  getSingleListNoPlanItems,
  getMondayYYYYMMDD,
  swapFocusPileAdjacent
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
  function hiddenSetFor(todayStr) {
    const h = d.state.hiddenFromTodayByDate;
    const arr = h && Array.isArray(h[todayStr]) ? h[todayStr] : [];
    return new Set(arr);
  }

  function refreshTodayAndFocus() {
    renderTodayList();
    renderFocusUnified();
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

  /** @param {string | undefined} note */
  function todayDayNoteHtml(note) {
    const t = (note || '').trim();
    if (!t) return '';
    return `<div class="unified-today-day-note" role="note"><div class="unified-today-day-note-label">Day note</div><p class="unified-today-day-note-body">${escapeHtml(t)}</p></div>`;
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
    const mon = getMondayYYYYMMDD();
    let wp = normalizeWeekPlan(d.state.weekPlan);
    if (wp.anchorWeekStart && wp.anchorWeekStart !== mon) {
      const rolled = rollWeekPlanIfStale(d.state.weekPlan, mon);
      if (rolled.rolled) {
        d.state.weekPlan = rolled.weekPlan;
        if (rolled.previousWeekPlanSnapshot) {
          d.state.previousWeekPlanSnapshot = normalizeWeekPlan(rolled.previousWeekPlanSnapshot);
        }
        d.state.weekPlan = pruneWeekPlan(d.state.items, d.state.weekPlan);
        d.saveState();
        if (typeof d.onWeekPlanChanged === 'function') d.onWeekPlanChanged();
      }
      wp = normalizeWeekPlan(d.state.weekPlan);
    }

    const mode = getTodayLayoutMode(wp, todayStr);

    if (mode === 'no_week') {
      const items = getSingleListNoPlanItems(
        d.state.items,
        todayStr,
        d.state.todaySuggestionIds,
        hiddenSetFor(todayStr)
      );
      root.innerHTML = `
        <div class="unified-today-no-plan">
          <p class="unified-today-focus-banner"><button type="button" class="btn-secondary plan-focus-inline-btn">Plan</button> <span class="focus-banner-hint">your week</span></p>
          <div class="unified-today-section-body" data-section="single">${items.length ? items.map((i) => {
            const idx = d.state.todaySuggestionIds.indexOf(i.id);
            const inExp = idx >= 0;
            const canUp = inExp && idx > 0;
            const canDown = inExp && idx < d.state.todaySuggestionIds.length - 1;
            return taskRowHtml(i, '', inExp ? { show: true, canUp, canDown } : null);
          }).join('') : '<div class="empty-state">Nothing dated for today — add tasks below or drag them here</div>'}</div>
        </div>`;
      bindTodayListEvents(root, { removeFromToday, reorderExplicit: true });
      root.querySelector('.plan-focus-inline-btn')?.addEventListener('click', () => d.openPlanningEntry({}));
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
      const blankDayNote = todayDayNoteHtml(wp.days[todayStr] && wp.days[todayStr].note);
      root.innerHTML = `
        <div class="unified-today-blank">
          ${blankDayNote}
          <div class="unified-today-banner"><strong>No theme for today</strong> — <button type="button" class="btn-link set-plan-today-btn">Set / update plan for today</button></div>
          <details class="unified-today-details" ${otherOpen ? 'open' : ''} data-section="other">
            <summary>Other <span class="badge-count" data-other-count>${otherItems.length}</span></summary>
            <div class="unified-today-section-body">${otherItems.length ? otherItems.map(i => taskRowHtml(i)).join('') : '<div class="empty-state">Nothing here yet</div>'}</div>
          </details>
        </div>`;
      bindTodayListEvents(root, { removeFromToday });
      root.querySelector('.set-plan-today-btn')?.addEventListener('click', () => d.openPlanningEntry({ scrollToDate: todayStr }));
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
    const withPlanDayNote = todayDayNoteHtml(dayEntry.note);
    const hidden = hiddenSetFor(todayStr);
    const focusItems = getFocusPileTasks(d.state.items, todayStr, dayEntry, hidden);
    const otherItems = getOtherBlockTasks(
      d.state.items,
      todayStr,
      pileId,
      d.state.todaySuggestionIds,
      hidden
    );
    const otherOpen = d.state.otherCollapsedOnDate !== todayStr;

    root.innerHTML = `
      <div class="unified-today-with-plan">
        <p class="unified-today-focus-banner"><button type="button" class="btn-secondary plan-focus-inline-btn">Plan</button> <span class="focus-banner-hint">this week</span></p>
        ${withPlanDayNote}
        <details class="unified-today-details unified-today-focus" open data-section="focus">
          <summary>Today: ${escapeHtml(pileLabel)}</summary>
          <p class="unified-today-focus-hint">↑ ↓ = order you’ll tackle first in this pile. <button type="button" class="btn-link unified-today-review-plan-btn">Review week</button></p>
          <div class="unified-today-section-body">${focusItems.length ? focusItems.map((i, idx) => {
            const canUp = idx > 0;
            const canDown = idx < focusItems.length - 1;
            return taskRowHtml(i, '', { show: true, canUp, canDown });
          }).join('') : '<div class="empty-state">No tasks in this pile — add on the board</div>'}</div>
        </details>
        <details class="unified-today-details" ${otherOpen ? 'open' : ''} data-section="other">
          <summary>Other <span class="badge-count">${otherItems.length}</span></summary>
          <div class="unified-today-section-body">${otherItems.length ? otherItems.map(i => taskRowHtml(i)).join('') : '<div class="empty-state">Nothing else dated or pinned for today</div>'}</div>
        </details>
      </div>`;

    bindTodayListEvents(root, { removeFromToday, focusPileReorderTodayStr: todayStr });
    root.querySelector('.plan-focus-inline-btn')?.addEventListener('click', () => d.openPlanningEntry({}));
    root.querySelector('.unified-today-review-plan-btn')?.addEventListener('click', () => d.openPlanningEntry({ scrollToDate: todayStr }));
    const otherDet = root.querySelector('details[data-section="other"]');
    otherDet?.addEventListener('toggle', () => {
      if (!otherDet.open) d.state.otherCollapsedOnDate = todayStr;
      else d.state.otherCollapsedOnDate = null;
      d.saveState();
    });
  }

  function renderTodayList() {
    const root = document.getElementById('today-list');
    if (!root) return;
    paintUnifiedToday(root);
  }

  function renderFocusUnified() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    paintUnifiedToday(list);
  }

  return { renderTodayList, renderFocusUnified, removeFromToday, clearHiddenFromTodayForTask };
}
