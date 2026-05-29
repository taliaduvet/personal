/**
 * Notes side drawer — quick capture and date-grouped list.
 */
import { escapeHtml } from '../utils/dom.js';
import { getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { createNote, deleteNote, getNotes } from '../domain/notes.js';

export function createNotesPanel(deps) {
  const { state, saveState, showToast } = deps;

  function formatNoteTime(createdAt) {
    const d = new Date(createdAt);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatDateLabel(dateStr) {
    const today = getTodayLocalYYYYMMDD();
    if (dateStr === today) return 'Today';
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function getTaskLabel(taskId) {
    if (!taskId) return null;
    const item = state.items.find(i => i.id === taskId);
    return item ? item.text : null;
  }

  function renderNoteItem(note) {
    const taskLabel = note.taskId ? getTaskLabel(note.taskId) : null;
    const taskLink = taskLabel
      ? `<span class="note-task-link" data-task-id="${escapeHtml(note.taskId)}">→ ${escapeHtml(taskLabel)}</span>`
      : '';
    return `
      <div class="note-item" data-note-id="${escapeHtml(note.id)}">
        <div class="note-text">${escapeHtml(note.text)}</div>
        <div class="note-meta">
          <span class="note-time">${escapeHtml(formatNoteTime(note.createdAt))}</span>
          ${taskLink}
          <button type="button" class="note-delete-btn" data-note-id="${escapeHtml(note.id)}" aria-label="Delete note">×</button>
        </div>
      </div>`;
  }

  function renderNotes() {
    const today = getTodayLocalYYYYMMDD();
    const notes = getNotes().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const todayNotes = notes.filter(n => n.date === today);
    const olderByDate = {};
    notes.filter(n => n.date !== today).forEach(n => {
      if (!olderByDate[n.date]) olderByDate[n.date] = [];
      olderByDate[n.date].push(n);
    });
    const olderDates = Object.keys(olderByDate).sort((a, b) => b.localeCompare(a));

    const todayList = document.getElementById('notes-today-list');
    const olderList = document.getElementById('notes-older-list');
    const olderSection = document.getElementById('notes-older-section');

    if (todayList) {
      todayList.innerHTML = todayNotes.length
        ? todayNotes.map(renderNoteItem).join('')
        : '<p class="settings-hint notes-empty-hint">No notes yet today</p>';
    }

    if (olderList && olderSection) {
      if (!olderDates.length) {
        olderSection.style.display = 'none';
        olderList.innerHTML = '';
      } else {
        olderSection.style.display = 'block';
        olderList.innerHTML = olderDates.map(dateStr => `
          <div class="notes-date-group">
            <div class="notes-date-label">${escapeHtml(formatDateLabel(dateStr))}</div>
            <div class="notes-list">${olderByDate[dateStr].map(renderNoteItem).join('')}</div>
          </div>
        `).join('');
      }
    }

    bindNoteListEvents();
  }

  function bindNoteListEvents() {
    document.querySelectorAll('.note-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.noteId;
        if (!id) return;
        deleteNote(id);
        saveState();
        renderNotes();
        showToast('Note deleted');
      });
    });
    document.querySelectorAll('.note-task-link').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = el.dataset.taskId;
        if (!taskId || !deps.openEditModal) return;
        closeNotesPanel();
        deps.openEditModal(taskId);
      });
    });
  }

  function saveQuickNote() {
    const input = document.getElementById('notes-quick-input');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) return;
    createNote(text, null, 'standalone');
    saveState();
    input.value = '';
    renderNotes();
    showToast('Note saved');
  }

  function openNotesPanel() {
    const panel = document.getElementById('notes-panel');
    const overlay = document.getElementById('notes-panel-overlay');
    if (overlay) overlay.style.display = 'block';
    if (panel) panel.style.display = 'flex';
    renderNotes();
    const input = document.getElementById('notes-quick-input');
    if (input) input.focus();
  }

  function closeNotesPanel() {
    const panel = document.getElementById('notes-panel');
    const overlay = document.getElementById('notes-panel-overlay');
    if (panel) panel.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  }

  function bindEvents() {
    const closeBtn = document.getElementById('close-notes-panel');
    const overlay = document.getElementById('notes-panel-overlay');
    const quickInput = document.getElementById('notes-quick-input');

    if (closeBtn) closeBtn.addEventListener('click', closeNotesPanel);
    if (overlay) overlay.addEventListener('click', closeNotesPanel);

    if (quickInput) {
      quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveQuickNote();
        }
      });
    }
  }

  return { openNotesPanel, closeNotesPanel, renderNotes, bindEvents };
}
