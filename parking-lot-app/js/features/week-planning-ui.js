/**
 * Pre-plan review, four-block review screen, fullscreen week planning overlay.
 */
import { escapeHtml } from '../utils/dom.js';
import {
  normalizeWeekPlan,
  pruneWeekPlan,
  getMondayYYYYMMDD,
  getWeekDateKeys,
  computePlanReview,
  clearWeekDaysForAnchor,
  addWeeksToMonday
} from '../domain/weekly-planning.js';
import { showToast } from './toast.js';
import { getPileName } from '../domain/piles-people.js';
import {
  getTodayLocalYYYYMMDD,
  parseLocalDate,
  getActiveItems,
  sortByTimeBandsAndFriction
} from '../domain/tasks.js';
import { renderTaskCard } from '../render/task-card.js';

/** @param {string[]} keys Mon..Sun YYYY-MM-DD */
function formatWeekRangeHeading(keys) {
  if (keys.length < 7) return '';
  const a = parseLocalDate(keys[0]);
  const b = parseLocalDate(keys[6]);
  if (!a || !b) return '';
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long' });
  const ma = monthLong.format(a);
  const mb = monthLong.format(b);
  const da = a.getDate();
  const db = b.getDate();
  if (ma === mb && a.getFullYear() === b.getFullYear()) {
    return `${ma} ${da}–${db}`;
  }
  return `${ma} ${da} – ${mb} ${db}`;
}

/** @param {string} dateKey */
function weekdayLong(dateKey) {
  const d = parseLocalDate(dateKey);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d);
}

/** @param {string} dateKey */
function dayOfMonthNum(dateKey) {
  const d = parseLocalDate(dateKey);
  return d ? d.getDate() : '';
}

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {() => void} d.onCommitted
 * @param {() => void} [d.saveDevicePreferencesToSupabase]
 * @param {(presetCategory?: string, presetPileId?: string | null) => void} [d.openAddModal]
 */
export function createWeekPlanningUI(d) {
  let draft = normalizeWeekPlan({ anchorWeekStart: null, days: {} });
  let draftDirty = false;
  let pendingScrollDate = null;
  let positionModalCallback = null;
  /** @type {Record<string, unknown>} */
  let lastPlanningOpts = {};

  /**
   * @param {Record<string, unknown>} [opts]
   * @param {string} [opts.anchorWeekStart] YYYY-MM-DD (any day in the week; normalized to Monday)
   * @param {string} [opts.scrollToDate] YYYY-MM-DD — week containing this day becomes the draft anchor
   */
  function ensureDraftFromState(opts = {}) {
    const calMon = getMondayYYYYMMDD();
    let targetMon = calMon;
    if (opts.anchorWeekStart && typeof opts.anchorWeekStart === 'string') {
      const anchorD = parseLocalDate(opts.anchorWeekStart);
      if (anchorD) targetMon = getMondayYYYYMMDD(anchorD);
    } else if (opts.scrollToDate && typeof opts.scrollToDate === 'string') {
      const scrollD = parseLocalDate(opts.scrollToDate);
      if (scrollD) targetMon = getMondayYYYYMMDD(scrollD);
    }
    const base = normalizeWeekPlan(d.state.weekPlan);
    if (base.anchorWeekStart === targetMon) {
      draft = normalizeWeekPlan(JSON.parse(JSON.stringify(base)));
    } else {
      draft = normalizeWeekPlan({ anchorWeekStart: targetMon, days: {} });
    }
    draftDirty = false;
  }

  function loadDraftForMonday(targetMon) {
    const base = normalizeWeekPlan(d.state.weekPlan);
    if (base.anchorWeekStart === targetMon) {
      draft = normalizeWeekPlan(JSON.parse(JSON.stringify(base)));
    } else {
      draft = normalizeWeekPlan({ anchorWeekStart: targetMon, days: {} });
    }
    draftDirty = false;
  }

  function tryChangePlanningWeek(newMonday) {
    if (!newMonday) return;
    if (draftDirty && !window.confirm('Switch week? Unsaved changes for this week will be lost.')) return;
    loadDraftForMonday(newMonday);
    lastPlanningOpts = { ...lastPlanningOpts, anchorWeekStart: newMonday };
    if ('scrollToDate' in lastPlanningOpts) delete lastPlanningOpts.scrollToDate;
    pendingScrollDate = null;
    renderPlanningDays();
  }

  function showEl(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!show) {
      el.style.display = 'none';
      return;
    }
    if (el.classList.contains('week-plan-fullscreen')) el.style.display = 'flex';
    else if (el.classList.contains('modal')) el.style.display = 'flex';
    else el.style.display = 'block';
  }

  function openPlanningEntry(opts) {
    lastPlanningOpts = opts && typeof opts === 'object' ? { ...opts } : {};
    pendingScrollDate = lastPlanningOpts.scrollToDate || null;
    const snap = d.state.lastCommittedPlanSnapshot;
    const hasSnap = snap && snap.anchorWeekStart;
    if (hasSnap) {
      showEl('pre-plan-review-modal', true);
    } else {
      ensureDraftFromState(lastPlanningOpts);
      openPlanningOverlay();
    }
  }

  function closePrePlanModal() {
    showEl('pre-plan-review-modal', false);
  }

  function openFourBlockReview() {
    closePrePlanModal();
    const snap = normalizeWeekPlan(d.state.lastCommittedPlanSnapshot);
    const rev = computePlanReview(snap, d.state.items);
    const body = document.getElementById('plan-review-four-blocks');
    if (!body) return;
    function block(title, rows) {
      const lines = rows.length
        ? rows.map(r => `<li>${typeof r === 'string' ? escapeHtml(r) : escapeHtml(r.text || r.pileName || '')}</li>`).join('')
        : '<li class="review-empty-li">—</li>';
      return `<section class="review-block"><h4>${escapeHtml(title)}</h4><ul class="review-ul">${lines}</ul></section>`;
    }
    const plannedLines = rev.planned.map(p => `${p.dateKey}: ${p.text}`);
    body.innerHTML =
      block('What you planned', plannedLines) +
      block('Done', rev.done.map(x => x.text)) +
      block('Still to do', rev.still.map(x => x.text)) +
      block('New in piles', rev.newInPiles.map(x => `${x.pileName}: ${x.text}`));
    showEl('plan-review-screen', true);
  }

  function closeFourBlockReview() {
    showEl('plan-review-screen', false);
  }

  function openPlanningOverlay() {
    renderPlanningDays();
    showEl('week-planning-overlay', true);
    document.body.classList.add('week-planning-open');
    const wrap = document.getElementById('week-planning-days');
    if (pendingScrollDate && wrap) {
      const row = wrap.querySelector(`.plan-day-card[data-date="${pendingScrollDate}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'center' });
      pendingScrollDate = null;
    }
  }

  function closePlanningOverlay() {
    showEl('week-planning-overlay', false);
    document.body.classList.remove('week-planning-open');
  }

  function commitPlanning() {
    d.state.weekPlan = pruneWeekPlan(d.state.items, draft);
    d.state.lastCommittedPlanSnapshot = normalizeWeekPlan(JSON.parse(JSON.stringify(d.state.weekPlan)));
    d.state.lastPlanCommittedAt = new Date().toISOString();
    draftDirty = false;
    d.saveState();
    if (window.talkAbout && d.state.deviceSyncId && d.saveDevicePreferencesToSupabase) {
      d.saveDevicePreferencesToSupabase();
    }
    closePlanningOverlay();
    d.onCommitted();
  }

  function tryClosePlanning() {
    if (!draftDirty) {
      closePlanningOverlay();
      return;
    }
    if (window.confirm('Discard changes?')) {
      draftDirty = false;
      closePlanningOverlay();
    }
  }

  function renderPilesReference() {
    const ref = document.getElementById('week-planning-piles-ref');
    if (!ref) return;
    const piles = d.state.piles || [];
    const todayIdSet = new Set(d.state.todaySuggestionIds || []);
    const withoutToday = (items) => items.filter((i) => !todayIdSet.has(i.id));
    const active = getActiveItems();

    if (!piles.length) {
      ref.innerHTML =
        '<h3 class="week-planning-ref-title">Your piles & tasks</h3>' +
        '<p class="plan-ref-empty">No piles yet — add piles in Settings, then tap a pile button on each day above.</p>' +
        (d.openAddModal
          ? '<p class="plan-ref-empty plan-ref-add-line"><button type="button" class="btn-secondary btn-sm week-plan-ref-add-first">Add task</button></p>'
          : '');
      ref.querySelector('.week-plan-ref-add-first')?.addEventListener('click', () => {
        d.openAddModal(d.state.lastCategory, null);
      });
      return;
    }

    const pileColumns = piles.map((p) => ({ id: p.id, label: p.name, pileId: p.id }));
    pileColumns.push({ id: '__uncategorized', label: 'Uncategorized', pileId: null });

    const cols = pileColumns
      .map((col) => {
        const items = withoutToday(active.filter((i) => (i.pileId || null) === (col.pileId || null)));
        const sorted = sortByTimeBandsAndFriction(items);
        const pileIdAttr =
          col.pileId != null ? ` data-pile-id="${escapeHtml(col.pileId)}"` : ' data-uncategorized="true"';
        const body = sorted.length
          ? sorted
              .map((item) => {
                try {
                  return renderTaskCard(item, { showLifeAreaAsTag: true });
                } catch (e) {
                  console.warn('plan ref task card', item && item.id, e);
                  return `<div class="task-card"><div class="task-content"><div class="task-text">${escapeHtml((item && item.text) || '(task)')}</div><div class="task-meta">Preview unavailable</div></div></div>`;
                }
              })
              .join('')
          : '<div class="empty-state column-add-hint">No tasks in this pile</div>';
        const addBtnAttr =
          col.pileId != null
            ? ` data-pile-id="${escapeHtml(col.pileId)}"`
            : ' data-uncategorized="true"';
        return `<div class="column column-accent" data-category="${escapeHtml(col.id)}"${pileIdAttr} style="--column-accent: #6b7280">
            <div class="column-header plan-ref-column-head" role="none">
              <span class="plan-ref-column-title">${escapeHtml(col.label)} <span class="count">(${sorted.length})</span></span>
              <button type="button" class="btn-secondary btn-sm week-plan-ref-add"${addBtnAttr}>+ Add</button>
            </div>
            <div class="column-items">${body}</div>
          </div>`;
      })
      .join('');

    ref.innerHTML =
      '<h3 class="week-planning-ref-title">Your piles & tasks</h3>' +
      `<div class="columns piles-view week-plan-ref-board" role="region" aria-label="Piles">${cols}</div>`;
  }

  function renderPilesReferenceSafe() {
    try {
      renderPilesReference();
    } catch (err) {
      console.error('renderPilesReference', err);
      const ref = document.getElementById('week-planning-piles-ref');
      if (ref) {
        ref.innerHTML =
          '<h3 class="week-planning-ref-title">Your piles & tasks</h3>' +
          '<p class="plan-ref-empty">Could not load the pile preview. The week row above still works — try again or refresh.</p>';
      }
    }
  }

  function pileQuickRowHtml(dateKey, entry) {
    const piles = d.state.piles || [];
    const top3 = piles.slice(0, 3);
    const rest = piles.slice(3);
    const dk = escapeHtml(dateKey);
    const three = [0, 1, 2]
      .map((i) => {
        const p = top3[i];
        if (!p) {
          return `<span class="plan-pile-slot-empty" title="Add piles in Settings if you need a third column">—</span>`;
        }
        return `<button type="button" class="plan-pile-quick ${entry.pileId === p.id ? 'is-selected' : ''}" data-pile-id="${escapeHtml(p.id)}" data-date="${dk}">${escapeHtml(p.name)}</button>`;
      })
      .join('');
    const selectedInRest = entry.pileId && rest.some((p) => p.id === entry.pileId);
    const more =
      rest.length > 0
        ? `
    <details class="plan-pile-more"${selectedInRest ? ' open' : ''}>
      <summary>More piles</summary>
      <div class="plan-pile-more-list">
        ${rest
          .map(
            (p) =>
              `<button type="button" class="plan-pile-quick plan-pile-quick-more ${entry.pileId === p.id ? 'is-selected' : ''}" data-pile-id="${escapeHtml(p.id)}" data-date="${dk}">${escapeHtml(p.name)}</button>`
          )
          .join('')}
      </div>
    </details>`
        : '';
    const clearBtn = `<button type="button" class="plan-pile-clear" data-date="${dk}">Clear day</button>`;
    const addInPileBtn = entry.pileId
      ? `<button type="button" class="btn-link plan-day-add-task" data-pile-id="${escapeHtml(entry.pileId)}">New task in this pile</button>`
      : '';
    const noPilesHint =
      piles.length === 0 ? '<p class="plan-pile-no-piles-msg">Add piles in Settings to assign them here.</p>' : '';
    return `<div class="plan-pile-picker">
      ${noPilesHint}
      <div class="plan-pile-picker-label">Tap a pile</div>
      <div class="plan-pile-quick-row">${three}</div>
      ${clearBtn}
      ${addInPileBtn}
    </div>${more}`;
  }

  function setDayPile(dateKey, pileId) {
    if (!draft.days[dateKey]) draft.days[dateKey] = { pileId: null, orderedTaskIds: [] };
    const v = pileId || null;
    draft.days[dateKey].pileId = v;
    draft.days[dateKey].orderedTaskIds = (draft.days[dateKey].orderedTaskIds || []).filter((id) => {
      const it = d.state.items.find((x) => x.id === id);
      return it && !it.archived && (it.pileId || null) === v;
    });
    draftDirty = true;
    renderPlanningDays();
  }

  function renderPlanningDays() {
    const mon = draft.anchorWeekStart || getMondayYYYYMMDD();
    draft.anchorWeekStart = mon;
    const keys = getWeekDateKeys(mon);
    const wrap = document.getElementById('week-planning-days');
    if (!wrap) return;

    const lastWeekEl = document.getElementById('week-planning-last-week');
    if (lastWeekEl) {
      const prev = d.state.previousWeekPlanSnapshot;
      if (prev && prev.anchorWeekStart) {
        lastWeekEl.style.display = 'block';
        lastWeekEl.innerHTML =
          '<summary>Last week (reference)</summary><div class="last-week-inner">' + formatLastWeekPreview(prev) + '</div>';
      } else {
        lastWeekEl.style.display = 'none';
        lastWeekEl.innerHTML = '';
      }
    }
    const rangeEl = document.getElementById('week-planning-range');
    if (rangeEl && keys.length) {
      rangeEl.textContent = formatWeekRangeHeading(keys);
    }
    const jumpInput = document.getElementById('week-planning-jump-date');
    if (jumpInput && mon) jumpInput.value = mon;

    const todayStr = getTodayLocalYYYYMMDD();
    wrap.innerHTML = keys
      .map((dateKey) => {
        if (!draft.days[dateKey]) draft.days[dateKey] = { pileId: null, orderedTaskIds: [] };
        const entry = draft.days[dateKey];
        const inPile = (d.state.items || []).filter(
          (it) => !it.archived && entry.pileId && (it.pileId || null) === entry.pileId
        );
        const orderedFirst = (entry.orderedTaskIds || []).map((id) => d.state.items.find((x) => x.id === id)).filter(Boolean);
        const rest = inPile.filter((it) => !(entry.orderedTaskIds || []).includes(it.id));
        const rows = [...orderedFirst, ...rest];
        const listHtml =
          rows
            .map(
              (it, idx) => `
        <div class="plan-day-task" draggable="true" data-id="${it.id}" data-date="${dateKey}">
          <span class="plan-drag">⋮</span>
          <span class="plan-task-text">${escapeHtml(it.text)}</span>
          <button type="button" class="btn-secondary btn-sm plan-move-up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-secondary btn-sm plan-move-down" ${idx >= rows.length - 1 ? 'disabled' : ''}>↓</button>
        </div>`
            )
            .join('') || '<div class="empty-state plan-pile-empty">No tasks in this pile</div>';

        const wd = weekdayLong(dateKey);
        const dn = dayOfMonthNum(dateKey);
        const todayClass = dateKey === todayStr ? ' plan-day-today' : '';
        return `<div class="plan-day-card${todayClass}" data-date="${dateKey}">
        <div class="plan-day-head">
          <span class="plan-day-weekday">${escapeHtml(wd)}</span>
          <span class="plan-day-numline">${dn}</span>
        </div>
        ${pileQuickRowHtml(dateKey, entry)}
        <div class="plan-day-list" data-date="${dateKey}">${listHtml}</div>
      </div>`;
      })
      .join('');

    wrap.querySelectorAll('.plan-pile-quick, .plan-pile-quick-more').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateKey = btn.dataset.date;
        const pileId = btn.dataset.pileId || '';
        if (!dateKey || !pileId) return;
        const cur = draft.days[dateKey]?.pileId || null;
        if (cur === pileId) setDayPile(dateKey, null);
        else setDayPile(dateKey, pileId);
      });
    });

    wrap.querySelectorAll('.plan-pile-clear').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateKey = btn.dataset.date;
        if (dateKey) setDayPile(dateKey, null);
      });
    });

    wrap.querySelectorAll('.plan-day-add-task').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.dataset.pileId;
        if (d.openAddModal) d.openAddModal(d.state.lastCategory, pid || null);
      });
    });

    wrap.querySelectorAll('.plan-move-up, .plan-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.plan-day-task');
        const dateKey = row.dataset.date;
        const id = row.dataset.id;
        const list = draft.days[dateKey].orderedTaskIds || [];
        const fullOrder = [...list];
        const inPile = (d.state.items || []).filter(
          it => !it.archived && draft.days[dateKey].pileId && (it.pileId || null) === draft.days[dateKey].pileId
        );
        const restIds = inPile.filter(it => !fullOrder.includes(it.id)).map(it => it.id);
        const combined = [...fullOrder, ...restIds];
        const idx = combined.indexOf(id);
        if (idx < 0) return;
        const swap = btn.classList.contains('plan-move-up') ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= combined.length) return;
        const a = combined[idx];
        const b = combined[swap];
        combined[idx] = b;
        combined[swap] = a;
        draft.days[dateKey].orderedTaskIds = combined.filter(tid => {
          const it = d.state.items.find(x => x.id === tid);
          return it && (it.pileId || null) === draft.days[dateKey].pileId;
        });
        draftDirty = true;
        renderPlanningDays();
      });
    });

    wrap.querySelectorAll('.plan-day-list').forEach(listEl => {
      listEl.addEventListener('dragstart', (e) => {
        const t = e.target.closest('.plan-day-task');
        if (t) e.dataTransfer.setData('text/plain', JSON.stringify({ id: t.dataset.id, date: t.dataset.date }));
      });
      listEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      listEl.addEventListener('drop', (e) => {
        e.preventDefault();
        let data;
        try {
          data = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch (_) {
          return;
        }
        const { id, date: fromDate } = data;
        const toDate = listEl.dataset.date;
        if (!id || !toDate) return;
        if (fromDate !== toDate) {
          const item = d.state.items.find(x => x.id === id);
          if (!item || item.archived) return;
          if (!draft.days[toDate]) draft.days[toDate] = { pileId: null, orderedTaskIds: [] };
          const toPile = draft.days[toDate].pileId;
          if (!toPile || (item.pileId || null) !== toPile) return;
          Object.keys(draft.days).forEach(k => {
            draft.days[k].orderedTaskIds = (draft.days[k].orderedTaskIds || []).filter(x => x !== id);
          });
          draft.days[toDate].orderedTaskIds = [...(draft.days[toDate].orderedTaskIds || []), id];
          draftDirty = true;
          renderPlanningDays();
          return;
        }
        const row = e.target.closest('.plan-day-task');
        if (!row) return;
        const ids = [...(draft.days[toDate].orderedTaskIds || [])];
        const rest = (d.state.items || []).filter(
          it => !it.archived && draft.days[toDate].pileId && (it.pileId || null) === draft.days[toDate].pileId
        ).map(it => it.id).filter(i => !ids.includes(i));
        const full = [...ids, ...rest];
        const fromIdx = full.indexOf(id);
        const toIdx = full.indexOf(row.dataset.id);
        if (fromIdx < 0 || toIdx < 0) return;
        full.splice(fromIdx, 1);
        full.splice(toIdx, 0, id);
        draft.days[toDate].orderedTaskIds = full.filter(tid => {
          const it = d.state.items.find(x => x.id === tid);
          return it && (it.pileId || null) === draft.days[toDate].pileId;
        });
        draftDirty = true;
        renderPlanningDays();
      });
    });

    renderPilesReferenceSafe();
  }

  function formatLastWeekPreview(prev) {
    const keys = getWeekDateKeys(prev.anchorWeekStart);
    return keys.map(dk => {
      const e = prev.days[dk];
      const p = e && e.pileId ? getPileName(e.pileId) : '—';
      const n = e && e.orderedTaskIds ? e.orderedTaskIds.length : 0;
      return `<div class="last-week-row">${dk}: ${escapeHtml(p)} (${n} ordered)</div>`;
    }).join('');
  }

  function refreshOpenPlanner() {
    const el = document.getElementById('week-planning-overlay');
    if (!el || el.style.display !== 'flex') return;
    renderPlanningDays();
  }

  function bindStatic() {
    document.getElementById('pre-plan-review-skip')?.addEventListener('click', () => {
      closePrePlanModal();
      ensureDraftFromState(lastPlanningOpts);
      openPlanningOverlay();
    });
    document.getElementById('pre-plan-review-open')?.addEventListener('click', () => {
      closePrePlanModal();
      openFourBlockReview();
    });
    document.getElementById('plan-review-continue')?.addEventListener('click', () => {
      closeFourBlockReview();
      ensureDraftFromState(lastPlanningOpts);
      openPlanningOverlay();
    });
    document.getElementById('plan-review-back')?.addEventListener('click', () => {
      closeFourBlockReview();
      showEl('pre-plan-review-modal', true);
    });
    document.getElementById('week-planning-done')?.addEventListener('click', commitPlanning);
    document.getElementById('week-planning-back')?.addEventListener('click', tryClosePlanning);
    document.getElementById('week-planning-clear')?.addEventListener('click', () => {
      if (!window.confirm('Clear all planned days for this week? This cannot be undone.')) return;
      draft = clearWeekDaysForAnchor(draft);
      draftDirty = true;
      renderPlanningDays();
    });
    document.getElementById('week-planning-prev-week')?.addEventListener('click', () => {
      const cur = draft.anchorWeekStart || getMondayYYYYMMDD();
      const prev = addWeeksToMonday(cur, -1);
      if (prev) tryChangePlanningWeek(prev);
    });
    document.getElementById('week-planning-next-week')?.addEventListener('click', () => {
      const cur = draft.anchorWeekStart || getMondayYYYYMMDD();
      const next = addWeeksToMonday(cur, 1);
      if (next) tryChangePlanningWeek(next);
    });
    document.getElementById('week-planning-this-week')?.addEventListener('click', () => {
      tryChangePlanningWeek(getMondayYYYYMMDD());
    });
    document.getElementById('week-planning-jump-go')?.addEventListener('click', () => {
      const inp = document.getElementById('week-planning-jump-date');
      const v = inp && inp.value;
      if (!v) {
        showToast('Pick a date first');
        return;
      }
      const day = parseLocalDate(v);
      if (!day) return;
      tryChangePlanningWeek(getMondayYYYYMMDD(day));
    });
    document.getElementById('week-planning-add-task')?.addEventListener('click', () => {
      if (d.openAddModal) d.openAddModal(d.state.lastCategory, null);
    });
    document.getElementById('week-planning-piles-ref')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.week-plan-ref-add');
      if (!btn || !d.openAddModal) return;
      e.preventDefault();
      const unc = btn.hasAttribute('data-uncategorized');
      d.openAddModal(d.state.lastCategory, unc ? null : (btn.dataset.pileId || null));
    });
    document.getElementById('add-to-today-top')?.addEventListener('click', () => {
      if (positionModalCallback) positionModalCallback('top');
      closePositionModal();
    });
    document.getElementById('add-to-today-bottom')?.addEventListener('click', () => {
      if (positionModalCallback) positionModalCallback('bottom');
      closePositionModal();
    });
    document.getElementById('add-to-today-position-close')?.addEventListener('click', closePositionModal);
  }

  function closePositionModal() {
    showEl('add-to-today-position-modal', false);
    positionModalCallback = null;
  }

  function askTopOrBottom(cb) {
    positionModalCallback = cb;
    showEl('add-to-today-position-modal', true);
  }

  function renderWeekStrip(container) {
    if (!container) return;
    if (!d.state.showWeekStrip) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    container.style.display = 'flex';
    const mon = getMondayYYYYMMDD();
    let wp = normalizeWeekPlan(d.state.weekPlan);
    if (!wp.anchorWeekStart || wp.anchorWeekStart !== mon) {
      wp = { anchorWeekStart: mon, days: {} };
    }
    const keys = getWeekDateKeys(mon);
    const todayStr = getTodayLocalYYYYMMDD();
    const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    container.innerHTML = keys
      .map((dk, i) => {
        const e = wp.days[dk] || { pileId: null, orderedTaskIds: [] };
        const pile = e.pileId ? getPileName(e.pileId) || '?' : '—';
        const initial = escapeHtml(pile.slice(0, 1));
        const n = (e.orderedTaskIds || []).length;
        const isToday = dk === todayStr;
        return `<button type="button" class="week-strip-chip${isToday ? ' week-strip-today' : ''}" data-date="${dk}" title="${escapeHtml(pile)}">${dayLetters[i]} <span class="week-strip-initial">${initial}</span>${n ? `<span class="week-strip-n">${n}</span>` : ''}</button>`;
      })
      .join('');
    container.querySelectorAll('.week-strip-chip').forEach(btn => {
      btn.addEventListener('click', () => openPlanningEntry({ scrollToDate: btn.dataset.date }));
    });
  }

  function renderWeekViewPanel() {
    const container = document.getElementById('week-view-body');
    if (!container) return;
    const mon = getMondayYYYYMMDD();
    let wp = normalizeWeekPlan(d.state.weekPlan);
    if (!wp.anchorWeekStart || wp.anchorWeekStart !== mon) {
      wp = { anchorWeekStart: mon, days: {} };
    }
    const keys = getWeekDateKeys(mon);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    container.innerHTML = keys
      .map((dk, i) => {
        const e = wp.days[dk] || { pileId: null, orderedTaskIds: [] };
        const pile = e.pileId ? getPileName(e.pileId) : 'No pile';
        const n = (e.orderedTaskIds || []).length;
        return `<div class="week-view-row">
          <div><strong>${dayNames[i]}</strong> <span class="week-view-date">${dk}</span></div>
          <div class="week-view-meta">${escapeHtml(pile)} · ${n} ordered</div>
          <button type="button" class="btn-secondary btn-sm week-view-edit-day" data-date="${dk}">Edit</button>
        </div>`;
      })
      .join('');
    container.querySelectorAll('.week-view-edit-day').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById('week-view-panel');
        if (panel) panel.style.display = 'none';
        openPlanningEntry({ scrollToDate: btn.dataset.date });
      });
    });
  }

  bindStatic();

  /** Close every planning surface (modals + fullscreen). Safe to call on load if DOM was left inconsistent. */
  function forceCloseAllPlanningUI() {
    closePlanningOverlay();
    closePrePlanModal();
    closeFourBlockReview();
    closePositionModal();
    const wvp = document.getElementById('week-view-panel');
    if (wvp) wvp.style.display = 'none';
  }

  return {
    openPlanningEntry,
    askTopOrBottom,
    renderWeekStrip,
    renderWeekViewPanel,
    forceCloseAllPlanningUI,
    refreshOpenPlanner
  };
}
