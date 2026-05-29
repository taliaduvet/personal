/**
 * Notes tab + today notes panel for Mom's Parking Lot.
 */
import { escapeHtml } from '../utils/dom.js';
import {
  getNotes,
  getNotesForDate,
  upsertNote,
  searchNotes
} from '../domain/notes.js';
import { getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { wireNoteToTask } from './note-to-task.js';
import { sanitizeJournalHtml } from '../domain/journal-daily.js';

/**
 * @param {object} d
 * @param {import('../state.js').state} d.state
 * @param {() => void} d.saveState
 * @param {(msg: string) => void} d.showToast
 * @param {() => void} [d.renderColumns]
 */
export function createNotesUI(d) {
  let editorWired = false;

  function renderNotesTab() {
    const list = document.getElementById('notes-tab-list');
    const searchInput = document.getElementById('notes-search-input');
    if (!list) return;
    const q = searchInput ? searchInput.value : '';
    const notes = searchNotes(q).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    list.innerHTML = notes.length
      ? notes
          .map(
            (n) => `
        <button type="button" class="notes-tab-item" data-note-id="${escapeHtml(n.id)}">
          <span class="notes-tab-date">${escapeHtml(n.date)}</span>
          <span class="notes-tab-preview">${escapeHtml((n.html || '').replace(/<[^>]+>/g, ' ').slice(0, 80))}</span>
        </button>`
          )
          .join('')
      : '<div class="empty-state">No notes yet — tap New note</div>';

    list.querySelectorAll('.notes-tab-item').forEach((btn) => {
      btn.addEventListener('click', () => openNoteEditor(btn.dataset.noteId));
    });
  }

  function openNoteEditor(noteId) {
    const panel = document.getElementById('notes-editor-panel');
    const editor = document.getElementById('notes-editor-textarea');
    if (!panel || !editor) return;
    const note = getNotes().find((n) => n.id === noteId);
    panel.style.display = 'block';
    editor.dataset.noteId = noteId || '';
    editor.value = note ? (note.html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : '';
    if (!editorWired) {
      wireNoteEditor(editor, 'todos');
      editorWired = true;
    }
  }

  function wireNoteEditor(editor, defaultCategory) {
    const root = editor.closest('.notes-editor-wrap') || editor.parentElement;
    wireNoteToTask({
      root,
      editor,
      defaultCategory,
      state: d.state,
      saveState: d.saveState,
      showToast: d.showToast,
      onTaskCreated: () => {
        if (d.renderColumns) d.renderColumns();
        renderNotesTab();
        renderTodayNotesPanel();
      }
    });
    let saveTimer = null;
    editor.addEventListener('input', () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const id = editor.dataset.noteId;
        const html = sanitizeJournalHtml(editor.value.replace(/\n/g, '<br>'));
        if (id) {
          upsertNote({ id, html });
        } else {
          const created = upsertNote({
            date: getTodayLocalYYYYMMDD(),
            html,
            source: 'standalone'
          });
          editor.dataset.noteId = created.id;
        }
        renderNotesTab();
        renderTodayNotesPanel();
      }, 400);
    });
  }

  function renderTodayNotesPanel() {
    const panel = document.getElementById('today-notes-panel');
    if (!panel) return;
    const today = getTodayLocalYYYYMMDD();
    const notes = getNotesForDate(today);
    panel.innerHTML =
      notes.length > 0
        ? notes
            .map(
              (n) =>
                `<div class="today-note-snippet" data-note-id="${escapeHtml(n.id)}">${escapeHtml((n.html || '').replace(/<[^>]+>/g, ' ').slice(0, 120))}</div>`
            )
            .join('')
        : '<p class="settings-hint">No notes for today yet.</p>';
  }

  function showNotesView() {
    const notesView = document.getElementById('notes-view');
    const overview = document.getElementById('overview');
    const focusMode = document.getElementById('focus-mode');
    const todayPanel = document.getElementById('today-panel-wrap');
    if (notesView) notesView.style.display = 'block';
    if (overview) overview.style.display = 'none';
    if (focusMode) focusMode.style.display = 'none';
    if (todayPanel) todayPanel.style.display = 'none';
    renderNotesTab();
  }

  function hideNotesView() {
    const notesView = document.getElementById('notes-view');
    const overview = document.getElementById('overview');
    const todayPanel = document.getElementById('today-panel-wrap');
    if (notesView) notesView.style.display = 'none';
    if (overview) overview.style.display = '';
    if (todayPanel) todayPanel.style.display = '';
  }

  function bindNotesTabControls() {
    const newBtn = document.getElementById('notes-new-btn');
    const searchInput = document.getElementById('notes-search-input');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        const editor = document.getElementById('notes-editor-textarea');
        if (editor) {
          editor.dataset.noteId = '';
          editor.value = '';
        }
        openNoteEditor('');
        const created = upsertNote({
          date: getTodayLocalYYYYMMDD(),
          html: '',
          source: 'standalone'
        });
        if (editor) editor.dataset.noteId = created.id;
        renderNotesTab();
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => renderNotesTab());
    }
  }

  return {
    renderNotesTab,
    renderTodayNotesPanel,
    showNotesView,
    hideNotesView,
    bindNotesTabControls,
    openNoteEditor,
    wireNoteEditor
  };
}
