/**
 * Simplified Today list (no week planning) for Mom's Parking Lot.
 */
import { escapeHtml } from '../utils/dom.js';
import { getColumnColor, getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { getRepeatingDueToday } from '../domain/recurrence.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(id: string) => void} d.markDone
 * @param {() => void} d.renderColumns
 */
export function createTodaySimpleRenderer(d) {
  function taskRowHtml(item, orderOpts) {
    const accent = getColumnColor(item.category);
    const orderBtns =
      orderOpts && orderOpts.show
        ? `<div class="today-item-order">
            <button type="button" class="btn-order" data-action="up" ${!orderOpts.canUp ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn-order" data-action="down" ${!orderOpts.canDown ? 'disabled' : ''}>↓</button>
          </div>`
        : '';
    return `<div class="today-item today-item-accent task-card" data-id="${item.id}" style="--today-accent: ${accent}">
      ${orderBtns}
      <span class="task-text">${escapeHtml(item.text)}</span>
      <button class="btn-done btn-done-check" title="Done">✓</button>
      <button class="btn-remove">Remove from Today</button>
    </div>`;
  }

  function bindListEvents(list) {
    if (!list) return;
    list.querySelectorAll('.btn-done').forEach((btn) => {
      btn.addEventListener('click', () => d.markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.today-item').dataset.id;
        d.state.todaySuggestionIds = d.state.todaySuggestionIds.filter((x) => x !== id);
        d.saveState();
        renderTodayList();
      });
    });
    list.querySelectorAll('.btn-order').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        const idx = d.state.todaySuggestionIds.indexOf(id);
        if (idx < 0) return;
        if (e.target.dataset.action === 'up' && idx > 0) {
          d.state.todaySuggestionIds.splice(idx, 1);
          d.state.todaySuggestionIds.splice(idx - 1, 0, id);
        } else if (e.target.dataset.action === 'down' && idx < d.state.todaySuggestionIds.length - 1) {
          d.state.todaySuggestionIds.splice(idx, 1);
          d.state.todaySuggestionIds.splice(idx + 1, 0, id);
        }
        d.saveState();
        renderTodayList();
      });
    });
  }

  function renderTodayList() {
    const list = document.getElementById('today-list');
    if (!list) return;
    const todayStr = getTodayLocalYYYYMMDD();
    const selected = d.state.todaySuggestionIds
      .map((id) => d.state.items.find((i) => i.id === id))
      .filter(Boolean);

    const doingToday = d.state.items.filter(
      (i) => !i.archived && i.doingDate === todayStr && !d.state.todaySuggestionIds.includes(i.id)
    );

    const repeating = getRepeatingDueToday(d.state.items, todayStr).filter(
      (i) => !d.state.todaySuggestionIds.includes(i.id)
    );

    let html = '';
    if (repeating.length) {
      html += `<p class="unified-today-section-label">Also due today (repeating)</p>`;
      html += repeating.map((i) => taskRowHtml(i, null)).join('');
    }
    if (selected.length) {
      html += `<p class="unified-today-section-label">Selected for today</p>`;
      html += selected
        .map((item, idx) =>
          taskRowHtml(item, {
            show: true,
            canUp: idx > 0,
            canDown: idx < selected.length - 1
          })
        )
        .join('');
    }
    if (doingToday.length) {
      html += `<p class="unified-today-section-label">Doing today</p>`;
      html += doingToday.map((i) => taskRowHtml(i, null)).join('');
    }
    if (!html) {
      html = '<div class="empty-state">Add items from the board or drag tasks here</div>';
    }
    list.innerHTML = html;
    bindListEvents(list);
  }

  function removeFromToday(id) {
    d.state.todaySuggestionIds = d.state.todaySuggestionIds.filter((x) => x !== id);
    d.saveState();
    renderTodayList();
  }

  return { renderTodayList, removeFromToday };
}
