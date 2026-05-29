/**
 * Archive modal — calendar view of completions, sessions, and notes.
 */
import { escapeHtml } from '../utils/dom.js';
import { getCategoryLabel } from '../domain/categories.js';
import { getPileName } from '../domain/piles-people.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function createArchiveCalendar(deps) {
  const { state } = deps;

  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let selectedDay = null;

  function getSessionsByDay() {
    const map = {};
    (state.items || []).forEach(item => {
      (item.sessions || []).forEach(sess => {
        const day = new Date(sess.start).toLocaleDateString('en-CA');
        if (!map[day]) map[day] = [];
        map[day].push({ item, sess });
      });
    });
    return map;
  }

  function getCompletionsByDay() {
    const map = {};
    (state.items || []).filter(i => i.archived && i.completedAt).forEach(i => {
      const day = new Date(i.completedAt).toLocaleDateString('en-CA');
      if (!map[day]) map[day] = [];
      map[day].push(i);
    });
    return map;
  }

  function getNotesByDay() {
    const map = {};
    (state.notes || []).forEach(n => {
      const day = n.date;
      if (!map[day]) map[day] = [];
      map[day].push(n);
    });
    return map;
  }

  function dayHasData(day, completions, sessions, notes) {
    return !!(completions[day]?.length || sessions[day]?.length || notes[day]?.length);
  }

  function formatDurationShort(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  function formatDayHeading(dayStr) {
    const d = new Date(dayStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dayStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function getContextLabel(item) {
    const pile = getPileName(item.pileId);
    if (pile) return pile;
    return getCategoryLabel(item.category);
  }

  function renderDayDetail(dayStr) {
    const el = document.getElementById('archive-day-detail');
    if (!el) return;

    const completions = getCompletionsByDay();
    const sessions = getSessionsByDay();
    const notes = getNotesByDay();
    const done = completions[dayStr] || [];
    const sess = sessions[dayStr] || [];
    const dayNotes = notes[dayStr] || [];

    if (!done.length && !sess.length && !dayNotes.length) {
      el.innerHTML = '<p class="settings-hint">Select a day to see what happened</p>';
      return;
    }

    const parts = [`<div class="archive-day-heading">${escapeHtml(formatDayHeading(dayStr))}</div>`];

    if (done.length) {
      parts.push(`<div class="archive-day-section-title">COMPLETED (${done.length})</div>`);
      done.forEach(item => {
        parts.push(
          `<div class="archive-completed-item">✓ ${escapeHtml(item.text)} · ${escapeHtml(getCategoryLabel(item.category))}</div>`
        );
      });
    }

    if (sess.length) {
      parts.push(`<div class="archive-day-section-title">SESSIONS (${sess.length})</div>`);
      sess.forEach(({ item, sess: s }) => {
        const ctx = escapeHtml(getContextLabel(item));
        const isResearch = s.sessionType === 'research' || s.sessionType === 'research_queued';
        const dur = isResearch
          ? (s.sessionType === 'research_queued' ? 'queued' : 'research')
          : formatDurationShort(s.durationSeconds);
        parts.push(
          `<div class="archive-session-item">${escapeHtml(item.text)} · ${ctx} · ${escapeHtml(dur)}</div>`
        );
        if (s.notes && !s.paused) {
          parts.push(`<div class="archive-session-item-notes">└ ${escapeHtml(s.notes)}</div>`);
        }
      });
    }

    if (dayNotes.length) {
      parts.push(`<div class="archive-day-section-title">NOTES (${dayNotes.length})</div>`);
      dayNotes.forEach(n => {
        const prefix = n.source === 'day-note' ? '📋 ' : '';
        parts.push(`<div class="archive-completed-item">${prefix}"${escapeHtml(n.text)}"</div>`);
      });
    }

    el.innerHTML = parts.join('');
  }

  function renderCalendarGrid() {
    const grid = document.getElementById('archive-calendar-grid');
    const label = document.getElementById('archive-month-label');
    if (!grid) return;

    const completions = getCompletionsByDay();
    const sessions = getSessionsByDay();
    const notes = getNotesByDay();

    const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (label) label.textContent = monthName;

    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMo = new Date(viewYear, viewMonth + 1, 0).getDate();

    let html = DOW.map(d => `<div class="archive-cal-dow">${d}</div>`).join('');

    for (let i = 0; i < firstDow; i++) {
      html += '<div class="archive-cal-cell archive-cal-empty" aria-hidden="true"></div>';
    }

    for (let d = 1; d <= daysInMo; d++) {
      const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasData = dayHasData(dayStr, completions, sessions, notes);
      const selected = selectedDay === dayStr;
      const classes = [
        'archive-cal-cell',
        hasData ? 'has-data' : '',
        selected ? 'archive-cal-cell-selected' : ''
      ].filter(Boolean).join(' ');
      html += `<button type="button" class="${classes}" data-day="${dayStr}">${d}</button>`;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.archive-cal-cell[data-day]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDay = btn.dataset.day;
        renderCalendarGrid();
        renderDayDetail(selectedDay);
      });
    });
  }

  function renderSearchResults(query) {
    const resultsEl = document.getElementById('archive-search-results');
    if (!resultsEl) return;

    const q = (query || '').trim().toLowerCase();
    if (!q) {
      resultsEl.innerHTML = '';
      resultsEl.style.display = 'none';
      return;
    }

    const hits = [];

    (state.items || []).filter(i => i.archived).forEach(item => {
      if ((item.text || '').toLowerCase().includes(q)) {
        hits.push({ kind: 'completed', label: `✓ ${item.text}`, sub: getCategoryLabel(item.category) });
      }
    });

    (state.items || []).forEach(item => {
      (item.sessions || []).forEach(sess => {
        if ((sess.notes || '').toLowerCase().includes(q)) {
          hits.push({
            kind: 'session',
            label: item.text,
            sub: (sess.notes || '').slice(0, 120)
          });
        }
      });
    });

    (state.notes || []).forEach(note => {
      if ((note.text || '').toLowerCase().includes(q)) {
        hits.push({ kind: 'note', label: note.text, sub: note.date });
      }
    });

    if (!hits.length) {
      resultsEl.innerHTML = '<p class="settings-hint">No matches</p>';
      resultsEl.style.display = 'block';
      return;
    }

    resultsEl.innerHTML = hits.map(h => `
      <div class="archive-search-hit archive-search-hit--${h.kind}">
        <div class="archive-search-hit-label">${escapeHtml(h.label)}</div>
        ${h.sub ? `<div class="archive-search-hit-sub">${escapeHtml(h.sub)}</div>` : ''}
      </div>
    `).join('');
    resultsEl.style.display = 'block';
  }

  function open() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDay = now.toLocaleDateString('en-CA');

    const completions = getCompletionsByDay();
    const sessions = getSessionsByDay();
    const notes = getNotesByDay();
    if (!dayHasData(selectedDay, completions, sessions, notes)) {
      selectedDay = null;
    }

    const searchInput = document.getElementById('archive-search-input');
    if (searchInput) searchInput.value = '';

    const modal = document.getElementById('archive-modal');
    if (modal) modal.style.display = 'flex';

    renderSearchResults('');
    renderCalendarGrid();
    if (selectedDay) renderDayDetail(selectedDay);
    else {
      const detail = document.getElementById('archive-day-detail');
      if (detail) detail.innerHTML = '<p class="settings-hint">Select a day to see what happened</p>';
    }
  }

  function close() {
    const modal = document.getElementById('archive-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindEvents() {
    const prev = document.getElementById('archive-prev-month');
    const next = document.getElementById('archive-next-month');
    const searchInput = document.getElementById('archive-search-input');

    if (prev) {
      prev.addEventListener('click', () => {
        viewMonth -= 1;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear -= 1;
        }
        renderCalendarGrid();
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        viewMonth += 1;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear += 1;
        }
        renderCalendarGrid();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
    }
  }

  return { open, close, bindEvents };
}
