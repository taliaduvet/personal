import { state } from '../state.js';
import { getTodayLocalYYYYMMDD } from './tasks.js';

export function getNotes() {
  return (state.notes || []).slice();
}

export function getNotesForDate(dateStr) {
  return getNotes().filter(n => n.date === dateStr);
}

export function createNote(text, taskId = null, source = 'standalone') {
  if (!state.notes) state.notes = [];
  const note = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    date: getTodayLocalYYYYMMDD(),
    text: (text || '').trim(),
    taskId: taskId || null,
    source,
    triaged: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.notes.push(note);
  return note;
}

export function updateNote(id, text) {
  const note = (state.notes || []).find(n => n.id === id);
  if (!note) return false;
  note.text = (text || '').trim();
  note.updatedAt = Date.now();
  return true;
}

export function deleteNote(id) {
  if (!state.notes) return;
  state.notes = state.notes.filter(n => n.id !== id);
}

export function triageNote(id) {
  const note = (state.notes || []).find(n => n.id === id);
  if (!note) return;
  note.triaged = true;
}

export function searchNotes(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return getNotes();
  return getNotes().filter(n => (n.text || '').toLowerCase().includes(q));
}
