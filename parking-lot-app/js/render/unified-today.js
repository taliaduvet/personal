/**
 * Unified Today: focus pile + other, single list, or blank-today layout.
 */
import { escapeHtml } from '../utils/dom.js';
import { getColumnColor, getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { getPileName } from '../domain/piles-people.js';
import {
  getTodayLayoutMode,
  normalizeWeekPlan,
  getFocusPileTasks,
  getOtherBlockTasks,
  getSingleListNoPlanItems,
  getMondayYYYYMMDD
} from '../domain/weekly-planning.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(id: string) => void} d.markDone
 * @param {() => void} d.renderColumns
 * @param {(opts?: { scrollToDate?: string }) => void} d.openPlanningEntry
 */
export function createUnifiedTodayRenderer(d) {
  function taskRowHtml(item, extraClass = '', orderOpt) {
    const accent = getColumnColor(item.category);
    const order =
      orderOpt && orderOpt.show
        ? `<div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!orderOpt.canUp ? 'disabled' : ''} title="Move up">↑</button>
          <button type="button" class="btn-order" data-action="down" ${!orderOpt.canDown ? 'disabled' : ''} title="Move down">↓</button>
        </div>`
        : '';
    return `<div class="today-item today-item-accent ${extraClass}" data-id="${item.id}" style="--today-accent: ${accent}">
      ${order}
      <span class="task-text">${escapeHtml(item.text)}</span>
      <button type="button" class="btn-done btn-done-check" title="Done">✓</button>
      <button type="button" class="btn-remove" title="Remove from Today">Remove</button>
    </div>`;
  }

  function bindTodayListEvents(root, { removeFromToday, reorderExplicit }) {
    root.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.today-item')?.dataset.id;
        if (id) d.markDone(id);
      });
    });
    root.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.today-item')?.dataset.id;
        if (id) removeFromToday(id);
      });
    });
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
          renderTodayList();
          if (typeof d.renderFocusUnified === 'function') d.renderFocusUnified();
          d.renderColumns();
        });
      });
    }
  }

  function removeFromToday(id) {
    d.state.todaySuggestionIds = d.state.todaySuggestionIds.filter(x => x !== id);
    d.saveState();
    renderTodayList();
    if (typeof d.renderFocusUnified === 'function') d.renderFocusUnified();
    d.renderColumns();
  }

  function renderTodayList() {
    const root = document.getElementById('today-list');
    if (!root) return;

    const todayStr = getTodayLocalYYYYMMDD();
    const mon = getMondayYYYYMMDD();
    const wp = normalizeWeekPlan(d.state.weekPlan);
    let weekAligned = wp;
    if (wp.anchorWeekStart && wp.anchorWeekStart !== mon) {
      weekAligned = { anchorWeekStart: mon, days: {} };
    }

    const mode = getTodayLayoutMode(weekAligned, todayStr);

    if (mode === 'no_week') {
      const items = getSingleListNoPlanItems(d.state.items, todayStr, d.state.todaySuggestionIds);
      root.innerHTML = `
        <div class="unified-today-no-plan">
          <div class="unified-today-section-body" data-section="single">${items.length ? items.map((i) => {
            const idx = d.state.todaySuggestionIds.indexOf(i.id);
            const inExp = idx >= 0;
            const canUp = inExp && idx > 0;
            const canDown = inExp && idx < d.state.todaySuggestionIds.length - 1;
            return taskRowHtml(i, '', inExp ? { show: true, canUp, canDown } : null);
          }).join('') : '<div class="empty-state">Nothing dated for today — add tasks below or drag them here</div>'}</div>
        </div>`;
      bindTodayListEvents(root, { removeFromToday, reorderExplicit: true });
      return;
    }

    if (mode === 'blank_today') {
      const otherItems = getSingleListNoPlanItems(d.state.items, todayStr, d.state.todaySuggestionIds);
      const otherOpen = d.state.otherCollapsedOnDate !== todayStr;
      root.innerHTML = `
        <div class="unified-today-blank">
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

    const dayEntry = weekAligned.days[todayStr] || { pileId: null, orderedTaskIds: [] };
    const pileId = dayEntry.pileId;
    const pileLabel = pileId ? (getPileName(pileId) || pileId) : '—';
    const focusItems = getFocusPileTasks(d.state.items, todayStr, dayEntry);
    const otherItems = getOtherBlockTasks(d.state.items, todayStr, pileId, d.state.todaySuggestionIds);
    const otherOpen = d.state.otherCollapsedOnDate !== todayStr;

    root.innerHTML = `
      <div class="unified-today-with-plan">
        <details class="unified-today-details unified-today-focus" open data-section="focus">
          <summary>Today: ${escapeHtml(pileLabel)}</summary>
          <div class="unified-today-section-body">${focusItems.length ? focusItems.map(i => taskRowHtml(i)).join('') : '<div class="empty-state">No tasks in this pile — add on the board</div>'}</div>
        </details>
        <details class="unified-today-details" ${otherOpen ? 'open' : ''} data-section="other">
          <summary>Other <span class="badge-count">${otherItems.length}</span></summary>
          <div class="unified-today-section-body">${otherItems.length ? otherItems.map(i => taskRowHtml(i)).join('') : '<div class="empty-state">Nothing else dated or pinned for today</div>'}</div>
        </details>
      </div>`;

    bindTodayListEvents(root, { removeFromToday });
    const otherDet = root.querySelector('details[data-section="other"]');
    otherDet?.addEventListener('toggle', () => {
      if (!otherDet.open) d.state.otherCollapsedOnDate = todayStr;
      else d.state.otherCollapsedOnDate = null;
      d.saveState();
    });
  }

  function renderFocusUnified() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    const todayStr = getTodayLocalYYYYMMDD();
    const mon = getMondayYYYYMMDD();
    const wp = normalizeWeekPlan(d.state.weekPlan);
    const weekAligned = wp.anchorWeekStart && wp.anchorWeekStart !== mon ? { anchorWeekStart: mon, days: {} } : wp;
    const mode = getTodayLayoutMode(weekAligned, todayStr);

    if (mode === 'no_week') {
      const items = getSingleListNoPlanItems(d.state.items, todayStr, d.state.todaySuggestionIds);
      list.innerHTML = `<p class="focus-banner"><button type="button" class="btn-secondary plan-focus-btn">Plan</button></p>
        <div class="focus-single">${items.map(i => taskRowHtml(i, 'task-card')).join('') ||
        '<div class="empty-state">Add items from the overview</div>'}</div>`;
      bindTodayListEvents(list, { removeFromToday });
      list.querySelector('.plan-focus-btn')?.addEventListener('click', () => d.openPlanningEntry({}));
      return;
    }

    if (mode === 'blank_today') {
      const otherItems = getSingleListNoPlanItems(d.state.items, todayStr, d.state.todaySuggestionIds);
      list.innerHTML = `
        <p class="focus-banner"><button type="button" class="btn-secondary plan-focus-btn">Plan</button> <span class="focus-banner-hint">or</span> <button type="button" class="btn-link set-plan-today-btn">Set plan for today</button></p>
        <div class="focus-other">${otherItems.map(i => taskRowHtml(i, 'task-card')).join('') || '<div class="empty-state">Nothing here yet</div>'}</div>`;
      bindTodayListEvents(list, { removeFromToday });
      list.querySelector('.plan-focus-btn')?.addEventListener('click', () => d.openPlanningEntry({}));
      list.querySelector('.set-plan-today-btn')?.addEventListener('click', () => d.openPlanningEntry({ scrollToDate: todayStr }));
      return;
    }

    const dayEntry = weekAligned.days[todayStr] || { pileId: null, orderedTaskIds: [] };
    const pileId = dayEntry.pileId;
    const pileLabel = pileId ? (getPileName(pileId) || pileId) : '—';
    const focusItems = getFocusPileTasks(d.state.items, todayStr, dayEntry);
    const otherItems = getOtherBlockTasks(d.state.items, todayStr, pileId, d.state.todaySuggestionIds);

    list.innerHTML = `
      <p class="focus-banner"><button type="button" class="btn-secondary plan-focus-btn">Plan</button></p>
      <h2 class="focus-sub">Today: ${escapeHtml(pileLabel)}</h2>
      <div class="focus-pile">${focusItems.map(i => taskRowHtml(i, 'task-card')).join('') || '<div class="empty-state">No tasks in this pile</div>'}</div>
      <h3 class="focus-sub">Other</h3>
      <div class="focus-other">${otherItems.map(i => taskRowHtml(i, 'task-card')).join('') || '<div class="empty-state">Nothing else</div>'}</div>`;
    bindTodayListEvents(list, { removeFromToday });
    list.querySelector('.plan-focus-btn')?.addEventListener('click', () => d.openPlanningEntry({}));
  }

  return { renderTodayList, renderFocusUnified, removeFromToday };
}
