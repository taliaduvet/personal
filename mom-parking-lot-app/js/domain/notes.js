/**
 * Unified notes for Mom's Parking Lot.
 */
import { persist } from '../core/persist.js';
import { state } from '../state.js';
import { sanitizeJournalHtml } from './journal-daily.js';

/**
 * @returns {import('../types.js').AppNote[]}
 */
export function getNotes() {
  return (state.notes || []).slice();
}

/**
 * @param {string} id
 * @returns {import('../types.js').AppNote|undefined}
 */
export function getNoteById(id) {
  return (state.notes || []).find((n) => n.id === id);
}

/**
 * @param {string} date YYYY-MM-DD
 * @returns {import('../types.js').AppNote[]}
 */
export function getNotesForDate(date) {
  return getNotes().filter((n) => n.date === date);
}

/**
 * @param {string} categoryId
 * @returns {import('../types.js').AppNote|undefined}
 */
export function getColumnNote(categoryId) {
  return getNotes().find((n) => n.source === 'column' && n.categoryId === categoryId);
}

/**
 * @param {Partial<import('../types.js').AppNote>} attrs
 * @returns {import('../types.js').AppNote}
 */
export function upsertNote(attrs) {
  if (!state.notes) state.notes = [];
  const now = Date.now();
  if (attrs.id) {
    const idx = state.notes.findIndex((n) => n.id === attrs.id);
    if (idx >= 0) {
      state.notes[idx] = { ...state.notes[idx], ...attrs, updatedAt: now };
      persist();
      return state.notes[idx];
    }
  }
  const note = {
    id: attrs.id || 'note_' + now + '_' + Math.random().toString(36).slice(2, 8),
    date: attrs.date || new Date().toISOString().slice(0, 10),
    html: sanitizeJournalHtml(attrs.html || ''),
    source: attrs.source || 'standalone',
    categoryId: attrs.categoryId || null,
    projectId: attrs.projectId || null,
    createdAt: now,
    updatedAt: now
  };
  state.notes.push(note);
  persist();
  return note;
}

/**
 * @param {string} categoryId
 * @param {string} html
 */
export function setColumnNoteHtml(categoryId, html) {
  if (!state.notes) state.notes = [];
  const existing = getColumnNote(categoryId);
  const today = new Date().toISOString().slice(0, 10);
  if (existing) {
    existing.html = sanitizeJournalHtml(html);
    existing.updatedAt = Date.now();
  } else {
    state.notes.push({
      id: 'colnote_' + categoryId,
      date: today,
      html: sanitizeJournalHtml(html),
      source: 'column',
      categoryId,
      projectId: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  if (state.columnNotes) state.columnNotes[categoryId] = html;
  persist();
}

/**
 * @param {string} categoryId
 * @returns {string}
 */
export function getColumnNoteHtml(categoryId) {
  const n = getColumnNote(categoryId);
  if (n) return n.html || '';
  return (state.columnNotes && state.columnNotes[categoryId]) || '';
}

/**
 * Migrate legacy columnNotes + journalDaily into state.notes on load.
 */
export function migrateLegacyNotesToUnified() {
  if (!state.notes) state.notes = [];
  const hasColumn = state.notes.some((n) => n.source === 'column');
  if (!hasColumn && state.columnNotes && typeof state.columnNotes === 'object') {
    const today = new Date().toISOString().slice(0, 10);
    Object.keys(state.columnNotes).forEach((catId) => {
      const html = state.columnNotes[catId];
      if (!html) return;
      if (!getColumnNote(catId)) {
        state.notes.push({
          id: 'colnote_' + catId,
          date: today,
          html: String(html),
          source: 'column',
          categoryId: catId,
          projectId: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });
  }
}

/**
 * @param {string} query
 * @returns {import('../types.js').AppNote[]}
 */
export function searchNotes(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return getNotes();
  return getNotes().filter((n) => {
    const text = (n.html || '').replace(/<[^>]+>/g, ' ').toLowerCase();
    return text.includes(q);
  });
}
