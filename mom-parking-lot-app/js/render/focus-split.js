/**
 * Focus mode: side-by-side Repeating | Selected panes.
 */
import { escapeHtml } from '../utils/dom.js';
import { getColumnColor, getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { getRepeatingDueToday } from '../domain/recurrence.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(id: string) => void} d.markDone
 * @param {() => void} [d.updateTally]
 */
export function createFocusSplitRenderer(d) {
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
    </div>`;
  }

  function bindPane(list, allowReorder) {
    if (!list) return;
    list.querySelectorAll('.btn-done').forEach((btn) => {
      btn.addEventListener('click', () => {
        d.markDone(btn.closest('.today-item').dataset.id);
        renderFocus();
        if (d.updateTally) d.updateTally();
      });
    });
    if (!allowReorder) return;
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
        renderFocus();
      });
    });
  }

  function renderFocus() {
    const root = document.getElementById('focus-list');
    if (!root) return;
    const todayStr = getTodayLocalYYYYMMDD();

    const repeating = getRepeatingDueToday(d.state.items, todayStr);
    const selected = d.state.todaySuggestionIds
      .map((id) => d.state.items.find((i) => i.id === id))
      .filter(Boolean);

    const repeatingHtml = repeating.length
      ? repeating.map((i) => taskRowHtml(i, null)).join('')
      : '<div class="empty-state">Nothing repeating today</div>';

    const selectedHtml = selected.length
      ? selected
          .map((item, idx) =>
            taskRowHtml(item, {
              show: true,
              canUp: idx > 0,
              canDown: idx < selected.length - 1
            })
          )
          .join('')
      : '<div class="empty-state">Add items to Today from the board</div>';

    root.innerHTML = `
      <div class="focus-split">
        <section class="focus-pane focus-pane-repeating" aria-label="Repeating">
          <h2 class="focus-pane-title">Repeating</h2>
          <div class="focus-pane-body" id="focus-repeating-list">${repeatingHtml}</div>
        </section>
        <section class="focus-pane focus-pane-selected" aria-label="Selected">
          <h2 class="focus-pane-title">Selected</h2>
          <div class="focus-pane-body" id="focus-selected-list">${selectedHtml}</div>
        </section>
      </div>`;

    bindPane(document.getElementById('focus-repeating-list'), false);
    bindPane(document.getElementById('focus-selected-list'), true);
  }

  return { renderFocus, renderFocusUnified: renderFocus };
}
