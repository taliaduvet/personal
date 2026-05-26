/**
 * Calendar archive with search and done-by-category summary.
 */
import { escapeHtml } from '../utils/dom.js';
import { getCategoryLabel } from '../domain/categories.js';
import { getNotesForDate, searchNotes } from '../domain/notes.js';
import { getPileName } from '../domain/piles-people.js';
import { wireNoteToTask } from './note-to-task.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {(msg: string) => void} d.showToast
 */
export function createArchiveCalendar(d) {
  let viewMonth = new Date();

  function getArchivedByDay() {
    const map = {};
    d.state.items
      .filter((i) => i.archived && i.completedAt)
      .forEach((i) => {
        const day = new Date(i.completedAt).toISOString().slice(0, 10);
        if (!map[day]) map[day] = [];
        map[day].push(i);
      });
    return map;
  }

  function categorySummary(items) {
    const counts = {};
    items.forEach((i) => {
      const c = i.category || 'todos';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }

  function renderMonthGrid() {
    const grid = document.getElementById('archive-calendar-grid');
    if (!grid) return;
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const byDay = getArchivedByDay();
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = labels.map((l) => `<div class="archive-cal-dow">${l}</div>`).join('');
    for (let i = 0; i < startPad; i++) html += '<div class="archive-cal-cell archive-cal-empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const key =
        y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const count = (byDay[key] || []).length;
      const noteCount = getNotesForDate(key).length;
      const has = count > 0 || noteCount > 0;
      html += `<button type="button" class="archive-cal-cell ${has ? 'has-data' : ''}" data-date="${key}">
        <span class="archive-cal-day">${day}</span>
        ${has ? `<span class="archive-cal-dot" title="${count} tasks, ${noteCount} notes"></span>` : ''}
      </button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.archive-cal-cell[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => renderDayDetail(btn.dataset.date));
    });
    const label = document.getElementById('archive-month-label');
    if (label) {
      label.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  function renderDayDetail(dateKey) {
    const detail = document.getElementById('archive-day-detail');
    if (!detail) return;
    const items = d.state.items
      .filter((i) => i.archived && i.completedAt)
      .filter((i) => new Date(i.completedAt).toISOString().slice(0, 10) === dateKey)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const notes = getNotesForDate(dateKey);
    const byCat = categorySummary(items);
    const summaryHtml = Object.keys(byCat)
      .map(
        (c) =>
          `<span class="archive-cat-chip">${escapeHtml(getCategoryLabel(c))}: ${byCat[c]}</span>`
      )
      .join(' ');

    const tasksHtml = items.length
      ? items
          .map((item) => {
            const proj = item.pileId ? getPileName(item.pileId) : '';
            return `<div class="archive-item">${escapeHtml(item.text)}
              <span class="archive-date">${escapeHtml(getCategoryLabel(item.category))}${proj ? ' · ' + escapeHtml(proj) : ''}</span></div>`;
          })
          .join('')
      : '<div class="empty-state">No completed tasks this day</div>';

    const notesHtml = notes.length
      ? notes
          .map(
            (n) => `
        <div class="archive-note-block notes-editor-wrap">
          <textarea class="archive-note-readonly column-note-textarea" readonly data-note-id="${escapeHtml(n.id)}">${escapeHtml((n.html || '').replace(/<[^>]+>/g, ''))}</textarea>
        </div>`
          )
          .join('')
      : '';

    detail.innerHTML = `
      <h4>${escapeHtml(dateKey)}</h4>
      <div class="archive-day-summary">${summaryHtml || '<span class="settings-hint">No completions</span>'}</div>
      <h5>Completed tasks</h5>
      ${tasksHtml}
      ${notesHtml ? '<h5>Notes</h5>' + notesHtml : ''}`;

    detail.querySelectorAll('.archive-note-readonly').forEach((ta) => {
      wireNoteToTask({
        root: ta.parentElement,
        editor: ta,
        defaultCategory: 'todos',
        state: d.state,
        saveState: () => {},
        showToast: d.showToast,
        readOnly: true
      });
    });
  }

  function runSearch() {
    const input = document.getElementById('archive-search-input');
    const results = document.getElementById('archive-search-results');
    if (!input || !results) return;
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      return;
    }
    const tasks = d.state.items
      .filter((i) => i.archived)
      .filter((i) => (i.text || '').toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q));
    const notes = searchNotes(q);
    results.innerHTML =
      (tasks.length
        ? '<h5>Tasks</h5>' +
          tasks
            .map(
              (i) =>
                `<div class="archive-item">${escapeHtml(i.text)} <span class="archive-date">${escapeHtml(getCategoryLabel(i.category))}</span></div>`
            )
            .join('')
        : '') +
      (notes.length
        ? '<h5>Notes</h5>' +
          notes
            .map(
              (n) =>
                `<div class="archive-item">${escapeHtml((n.html || '').replace(/<[^>]+>/g, ' ').slice(0, 100))} <span class="archive-date">${escapeHtml(n.date)}</span></div>`
            )
            .join('')
        : '') ||
      '<div class="empty-state">No matches</div>';
  }

  function openArchiveModal() {
    const modal = document.getElementById('archive-modal');
    if (modal) modal.style.display = 'flex';
    viewMonth = new Date();
    renderMonthGrid();
    const detail = document.getElementById('archive-day-detail');
    if (detail) detail.innerHTML = '<p class="settings-hint">Select a day on the calendar</p>';
  }

  function bindArchiveControls() {
    const prev = document.getElementById('archive-prev-month');
    const next = document.getElementById('archive-next-month');
    const search = document.getElementById('archive-search-input');
    if (prev) {
      prev.addEventListener('click', () => {
        viewMonth.setMonth(viewMonth.getMonth() - 1);
        renderMonthGrid();
      });
    }
    if (next) {
      next.addEventListener('click', () => {
        viewMonth.setMonth(viewMonth.getMonth() + 1);
        renderMonthGrid();
      });
    }
    if (search) search.addEventListener('input', runSearch);
  }

  return { openArchiveModal, bindArchiveControls, renderMonthGrid };
}
