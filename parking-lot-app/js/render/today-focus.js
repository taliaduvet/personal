/**
 * Today suggestions, focus list, tally, suggest-next strip, small consistency widget.
 */
import { escapeHtml } from '../utils/dom.js';
import {
  getActiveItems,
  getColumnColor,
  getTimeBand,
  sortByTimeBandsAndFriction,
  getTodayLocalYYYYMMDD
} from '../domain/tasks.js';
import { getPileName } from '../domain/piles-people.js';
import {
  getHabits,
  isHabitDoneOnDate,
  toggleHabitManual,
  computeWeightedPct,
  compute7DayRolling,
  getZoneLabel
} from '../domain/habits.js';
import { countCompletedInTallyDay } from '../storage/local.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(skipCloud?: boolean) => void} [d.saveStateTally]
 * @param {(id: string) => void} d.markDone
 * @param {() => void} d.renderColumns
 * @param {() => void} [d.renderConsistencySmall]
 * @param {() => void} [d.saveDevicePreferencesToSupabase]
 * @param {() => void} [d.refreshTodayUI] When set, repaints #today-list / #focus-list via unified Today (no legacy innerHTML).
 * @param {(id: string) => void} [d.removeFromToday] Unified remove (week plan + suggestions + hidden set); overrides legacy suggestion-only remove.
 */
export function createTodayFocusRenderer(d) {
  const saveTally = d.saveStateTally || ((skip) => d.saveState(skip));

  function refreshTodayAndFocus() {
    if (typeof d.refreshTodayUI === 'function') {
      d.refreshTodayUI();
      return;
    }
    renderTodayList();
    renderFocusList();
  }

  function moveTodayUp(id) {
    const idx = d.state.todaySuggestionIds.indexOf(id);
    if (idx <= 0) return;
    d.state.todaySuggestionIds.splice(idx, 1);
    d.state.todaySuggestionIds.splice(idx - 1, 0, id);
    d.saveState();
    refreshTodayAndFocus();
  }

  function moveTodayDown(id) {
    const idx = d.state.todaySuggestionIds.indexOf(id);
    if (idx < 0 || idx >= d.state.todaySuggestionIds.length - 1) return;
    d.state.todaySuggestionIds.splice(idx, 1);
    d.state.todaySuggestionIds.splice(idx + 1, 0, id);
    d.saveState();
    refreshTodayAndFocus();
  }

  function renderTodayList() {
    const list = document.getElementById('today-list');
    if (!list) return;
    const ids = d.state.todaySuggestionIds;
    const items = ids.map(id => d.state.items.find(i => i.id === id)).filter(Boolean);

    list.innerHTML = items.map((item, idx) => {
      const accent = getColumnColor(item.category);
      const canUp = idx > 0;
      const canDown = idx < items.length - 1;
      return `<div class="today-item today-item-accent" data-id="${item.id}" style="--today-accent: ${accent}">
        <div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!canUp ? 'disabled' : ''} title="Move up">↑</button>
          <button type="button" class="btn-order" data-action="down" ${!canDown ? 'disabled' : ''} title="Move down">↓</button>
        </div>
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done btn-done-check" title="Done">✓</button>
        <button class="btn-remove" title="Remove from suggestions">Remove</button>
      </div>`;
    }).join('') || '<div class="empty-state">Select tasks below and click Add to Today, or drag tasks here</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => d.markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        if (e.target.dataset.action === 'up') moveTodayUp(id);
        else moveTodayDown(id);
      });
    });
    if (d.renderConsistencySmall) d.renderConsistencySmall();
  }

  function renderConsistencySmall() {
    const block = document.getElementById('consistency-small');
    if (!block) return;
    const metricsEl = block?.querySelector('.consistency-small-metrics');
    const habitsEl = document.getElementById('consistency-small-habits');
    const habits = getHabits();
    if (habits.length === 0) {
      block.style.display = 'none';
      return;
    }
    block.style.display = 'block';
    const todayStr = getTodayLocalYYYYMMDD();
    const pct = computeWeightedPct(todayStr);
    const rolling = compute7DayRolling();
    const zone = getZoneLabel(pct);
    if (metricsEl) metricsEl.textContent = 'Weighted: ' + pct + '% · 7-day: ' + rolling + '% · ' + zone;
    if (habitsEl) {
      habitsEl.innerHTML = habits.map(h => {
        const done = isHabitDoneOnDate(h.id, todayStr);
        return `<label class="consistency-small-habit"><input type="checkbox" data-habit-id="${h.id}" ${done ? 'checked' : ''}> ${escapeHtml(h.name)}</label>`;
      }).join('');
      habitsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          toggleHabitManual(cb.dataset.habitId, todayStr);
          renderConsistencySmall();
          if (typeof window !== 'undefined' && window.talkAbout && d.state.deviceSyncId && d.saveDevicePreferencesToSupabase) {
            d.saveDevicePreferencesToSupabase();
          }
        });
      });
    }
  }

  function renderFocusList() {
    const list = document.getElementById('focus-list');
    if (!list) return;
    const items = d.state.todaySuggestionIds
      .map(id => d.state.items.find(i => i.id === id))
      .filter(Boolean);

    list.innerHTML = items.map((item, idx) => {
      const accent = getColumnColor(item.category);
      const canUp = idx > 0;
      const canDown = idx < items.length - 1;
      return `<div class="today-item today-item-accent task-card" data-id="${item.id}" style="--today-accent: ${accent}">
        <div class="today-item-order">
          <button type="button" class="btn-order" data-action="up" ${!canUp ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-order" data-action="down" ${!canDown ? 'disabled' : ''}>↓</button>
        </div>
        <span class="task-text">${escapeHtml(item.text)}</span>
        <button class="btn-done btn-done-check" title="Done">✓</button>
        <button class="btn-remove">Remove from suggestions</button>
      </div>`;
    }).join('') || '<div class="empty-state">Add items from the overview to get started</div>';

    list.querySelectorAll('.btn-done').forEach(btn => {
      btn.addEventListener('click', () => d.markDone(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromSuggestions(btn.closest('.today-item').dataset.id));
    });
    list.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.today-item').dataset.id;
        if (e.target.dataset.action === 'up') moveTodayUp(id);
        else moveTodayDown(id);
      });
    });
  }

  function updateTally() {
    d.state.completedTodayCount = countCompletedInTallyDay();
    saveTally(true);
    const str = 'Completed today: ' + d.state.completedTodayCount;
    const tallyEl = document.getElementById('completed-tally');
    if (tallyEl) tallyEl.textContent = str;
    const focusTally = document.getElementById('focus-tally');
    if (focusTally) focusTally.textContent = str;
  }

  function updateAddToSuggestionsBtn() {
    const btn = document.getElementById('add-to-suggestions-btn');
    const float = document.getElementById('add-to-suggestions-float');
    if (!btn) return;
    const count = d.state.selectedIds.size;
    const show = count > 0;
    if (float) float.classList.toggle('visible', show);
    btn.disabled = !show;
    btn.textContent = show ? `Add ${count} to Today` : 'Add to Today';
  }

  function addToSuggestions() {
    const toAdd = [...d.state.selectedIds];
    toAdd.forEach(id => {
      d.state.todaySuggestionIds.push(id);
      d.state.selectedIds.delete(id);
    });
    d.saveState();
    refreshTodayAndFocus();
    d.renderColumns();
    updateAddToSuggestionsBtn();
  }

  function clearAddToSuggestionsSelection() {
    d.state.selectedIds.clear();
    updateAddToSuggestionsBtn();
    d.renderColumns();
  }

  function removeFromSuggestions(id) {
    if (typeof d.removeFromToday === 'function') {
      d.removeFromToday(id);
      return;
    }
    d.state.todaySuggestionIds = d.state.todaySuggestionIds.filter(x => x !== id);
    d.saveState();
    refreshTodayAndFocus();
    d.renderColumns();
  }

  function suggestNext(completedItem) {
    const active = getActiveItems();
    const pileId = completedItem && (completedItem.pileId != null) ? completedItem.pileId : null;
    let candidates = pileId != null ? active.filter(i => (i.pileId || null) === pileId) : active;
    candidates = sortByTimeBandsAndFriction(candidates);
    if (candidates.length === 0 && pileId != null) {
      candidates = sortByTimeBandsAndFriction(active);
    }
    if (candidates.length === 0) return null;
    const top = candidates[0];
    const lifeArea = completedItem && completedItem.category;
    if (!lifeArea) return top;
    const topBand = getTimeBand(top);
    const topPriority = top.priority || 'medium';
    const sameTier = candidates.filter(i => getTimeBand(i) === topBand && (i.priority || 'medium') === topPriority);
    const sameLifeArea = sameTier.find(i => i.category === lifeArea);
    return sameLifeArea || top;
  }

  function showSuggestNextStrip(nextTask, completedItem) {
    const strip = document.getElementById('suggest-next-strip');
    if (!strip || !nextTask) return;
    const pileName = completedItem && completedItem.pileId ? getPileName(completedItem.pileId) : null;
    const label = pileName ? 'Next in ' + pileName + ': ' + nextTask.text : 'Next: ' + nextTask.text;
    const firstStepHtml = nextTask.firstStep ? `<p class="suggest-next-first-step">Start by: ${escapeHtml(nextTask.firstStep)}</p>` : '';
    strip.innerHTML = `
      <div class="suggest-next-content">
        <p class="suggest-next-label">${escapeHtml(label)}</p>
        ${firstStepHtml}
        <div class="suggest-next-actions">
          <button type="button" class="btn-primary btn-sm suggest-next-add-today" data-id="${nextTask.id}">Add to Today</button>
          <button type="button" class="btn-secondary btn-sm suggest-next-dismiss">Go</button>
        </div>
      </div>
    `;
    strip.classList.add('visible');
    strip.querySelector('.suggest-next-add-today')?.addEventListener('click', () => {
      if (!d.state.todaySuggestionIds.includes(nextTask.id)) {
        d.state.todaySuggestionIds.push(nextTask.id);
        d.saveState();
        refreshTodayAndFocus();
        d.renderColumns();
      }
      hideSuggestNextStrip();
    });
    strip.querySelector('.suggest-next-dismiss')?.addEventListener('click', hideSuggestNextStrip);
    if (d.state.suggestNextStripTimeout) clearTimeout(d.state.suggestNextStripTimeout);
    d.state.suggestNextStripTimeout = setTimeout(hideSuggestNextStrip, 8000);
  }

  function hideSuggestNextStrip() {
    const strip = document.getElementById('suggest-next-strip');
    if (strip) strip.classList.remove('visible');
    if (d.state.suggestNextStripTimeout) {
      clearTimeout(d.state.suggestNextStripTimeout);
      d.state.suggestNextStripTimeout = null;
    }
  }

  return {
    renderTodayList,
    renderFocusList,
    renderConsistencySmall,
    updateTally,
    updateAddToSuggestionsBtn,
    addToSuggestions,
    clearAddToSuggestionsSelection,
    removeFromSuggestions,
    suggestNext,
    showSuggestNextStrip,
    hideSuggestNextStrip,
    moveTodayUp,
    moveTodayDown
  };
}
