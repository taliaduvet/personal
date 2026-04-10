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
  clearWeekDaysForAnchor
} from '../domain/weekly-planning.js';
import { getPileName } from '../domain/piles-people.js';
import { getTodayLocalYYYYMMDD } from '../domain/tasks.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {() => void} d.onCommitted
 * @param {() => void} [d.saveDevicePreferencesToSupabase]
 */
export function createWeekPlanningUI(d) {
  let draft = normalizeWeekPlan({ anchorWeekStart: null, days: {} });
  let draftDirty = false;
  let pendingScrollDate = null;
  let positionModalCallback = null;

  function ensureDraftFromState() {
    const mon = getMondayYYYYMMDD();
    let base = normalizeWeekPlan(d.state.weekPlan);
    if (!base.anchorWeekStart || base.anchorWeekStart !== mon) {
      base = { anchorWeekStart: mon, days: {} };
    }
    draft = normalizeWeekPlan(JSON.parse(JSON.stringify(base)));
    draftDirty = false;
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
    pendingScrollDate = (opts && opts.scrollToDate) || null;
    const snap = d.state.lastCommittedPlanSnapshot;
    const hasSnap = snap && snap.anchorWeekStart;
    if (hasSnap) {
      showEl('pre-plan-review-modal', true);
    } else {
      ensureDraftFromState();
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
    ensureDraftFromState();
    renderPlanningDays();
    showEl('week-planning-overlay', true);
    document.body.classList.add('week-planning-open');
    const wrap = document.getElementById('week-planning-days');
    if (pendingScrollDate && wrap) {
      const row = wrap.querySelector(`[data-date="${pendingScrollDate}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

  function renderPlanningDays() {
    const mon = draft.anchorWeekStart || getMondayYYYYMMDD();
    draft.anchorWeekStart = mon;
    const keys = getWeekDateKeys(mon);
    const wrap = document.getElementById('week-planning-days');
    const lastWeekEl = document.getElementById('week-planning-last-week');
    if (lastWeekEl) {
      const prev = d.state.previousWeekPlanSnapshot;
      if (prev && prev.anchorWeekStart) {
        lastWeekEl.style.display = 'block';
        lastWeekEl.innerHTML = '<summary>Last week (reference)</summary><div class="last-week-inner">' + formatLastWeekPreview(prev) + '</div>';
      } else {
        lastWeekEl.style.display = 'none';
        lastWeekEl.innerHTML = '';
      }
    }
    const rangeEl = document.getElementById('week-planning-range');
    if (rangeEl && keys.length) {
      rangeEl.textContent = keys[0].replace(/^\d{4}-(\d{2})-(\d{2})$/, '$1-$2') + ' … ' + keys[6].replace(/^\d{4}-(\d{2})-(\d{2})$/, '$1-$2');
    }
    if (!wrap) return;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    wrap.innerHTML = keys.map((dateKey, i) => {
      if (!draft.days[dateKey]) draft.days[dateKey] = { pileId: null, orderedTaskIds: [] };
      const entry = draft.days[dateKey];
      const pileOpts = (d.state.piles || []).map(p =>
        `<option value="${escapeHtml(p.id)}" ${entry.pileId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
      ).join('');
      const inPile = (d.state.items || []).filter(
        it => !it.archived && entry.pileId && (it.pileId || null) === entry.pileId
      );
      const orderedFirst = (entry.orderedTaskIds || []).map(id => d.state.items.find(x => x.id === id)).filter(Boolean);
      const rest = inPile.filter(it => !(entry.orderedTaskIds || []).includes(it.id));
      const rows = [...orderedFirst, ...rest];
      const listHtml = rows.map((it, idx) => `
        <div class="plan-day-task" draggable="true" data-id="${it.id}" data-date="${dateKey}">
          <span class="plan-drag">⋮</span>
          <span class="plan-task-text">${escapeHtml(it.text)}</span>
          <button type="button" class="btn-secondary btn-sm plan-move-up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn-secondary btn-sm plan-move-down" ${idx >= rows.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      `).join('') || '<div class="empty-state plan-pile-empty">No tasks in this pile</div>';

      return `<div class="plan-day-card" data-date="${dateKey}">
        <div class="plan-day-head">${dayNames[i]} · ${dateKey.slice(5)}</div>
        <label class="plan-pile-label">Pile</label>
        <select class="plan-pile-select" data-date="${dateKey}">
          <option value="">— None —</option>
          ${pileOpts}
        </select>
        <div class="plan-day-list" data-date="${dateKey}">${listHtml}</div>
      </div>`;
    }).join('');

    wrap.querySelectorAll('.plan-pile-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const dateKey = sel.dataset.date;
        if (!draft.days[dateKey]) draft.days[dateKey] = { pileId: null, orderedTaskIds: [] };
        const v = sel.value || null;
        draft.days[dateKey].pileId = v;
        draft.days[dateKey].orderedTaskIds = (draft.days[dateKey].orderedTaskIds || []).filter(id => {
          const it = d.state.items.find(x => x.id === id);
          return it && !it.archived && (it.pileId || null) === v;
        });
        draftDirty = true;
        renderPlanningDays();
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

  function bindStatic() {
    document.getElementById('pre-plan-review-skip')?.addEventListener('click', () => {
      closePrePlanModal();
      ensureDraftFromState();
      openPlanningOverlay();
    });
    document.getElementById('pre-plan-review-open')?.addEventListener('click', () => {
      closePrePlanModal();
      openFourBlockReview();
    });
    document.getElementById('plan-review-continue')?.addEventListener('click', () => {
      closeFourBlockReview();
      ensureDraftFromState();
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

  return { openPlanningEntry, askTopOrBottom, renderWeekStrip, renderWeekViewPanel };
}
