import { state } from '../state.js';
import { createItem, getTodayLocalYYYYMMDD } from './tasks.js';
import { recordCompletion, removeCompletionsForTask } from './habits.js';
import { removeTaskIdFromAllDays } from './weekly-planning.js';

/**
 * Remove task id from today's "hidden from Today" list (state only).
 * @param {import('../types.js').AppState} stateRef
 * @param {string} taskId
 */
export function clearHiddenFromTodayForTaskState(stateRef, taskId) {
  const todayStr = getTodayLocalYYYYMMDD();
  const h = stateRef.hiddenFromTodayByDate;
  if (!h || !h[todayStr]) return;
  h[todayStr] = h[todayStr].filter((x) => x !== taskId);
  if (h[todayStr].length === 0) delete h[todayStr];
}

/**
 * @param {import('../types.js').Task} item
 * @returns {string|null} new task id
 */
function respawnRecurringItem(item) {
  const now = new Date();
  let nextDeadline = null;
  if (item.recurrence === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    nextDeadline = d.toISOString().slice(0, 10);
  } else if (item.recurrence === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    nextDeadline = d.toISOString().slice(0, 10);
  } else if (item.recurrence === 'monthly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    nextDeadline = d.toISOString().slice(0, 10);
  }
  const newItem = createItem(
    item.text,
    item.category,
    nextDeadline,
    item.priority,
    item.recurrence,
    null,
    item.doingDate,
    item.pileId,
    item.friction,
    item.personId || null
  );
  state.items.push(newItem);
  return newItem.id;
}

/**
 * Archives a task, updates week plan / suggestions / habits. Does not save or render.
 * @param {string} id
 * @returns {{
 *   mutated: boolean,
 *   reason?: string,
 *   wasInSuggestions?: boolean,
 *   respawnedId?: string|null,
 *   todayStr?: string,
 *   prev?: { archived: boolean, archivedAt: number|null, completedAt: number|null }
 * }}
 */
export function applyMarkDone(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return { mutated: false, reason: 'not_found' };
  if (item.archived) return { mutated: false, reason: 'already_archived' };

  const wasInSuggestions = state.todaySuggestionIds.includes(id);
  const prev = {
    archived: item.archived,
    archivedAt: item.archivedAt,
    completedAt: item.completedAt
  };

  item.archived = true;
  item.archivedAt = item.archivedAt || Date.now();
  item.completedAt = Date.now();
  state.todaySuggestionIds = state.todaySuggestionIds.filter((x) => x !== id);
  state.weekPlan = removeTaskIdFromAllDays(state.weekPlan, id);
  clearHiddenFromTodayForTaskState(state, id);

  const respawnedId = item.recurrence ? respawnRecurringItem(item) : null;
  const todayStr = getTodayLocalYYYYMMDD();
  (state.habits || []).forEach((h) => {
    if (h.linkedCategoryId === item.category || h.linkedPileId === item.pileId) {
      recordCompletion(h.id, todayStr, 'task', item.id);
    }
  });

  return {
    mutated: true,
    wasInSuggestions,
    respawnedId,
    todayStr,
    prev
  };
}

/**
 * Reverses {@link applyMarkDone} mutations (undo path).
 * @param {string} id
 * @param {{ archived: boolean, archivedAt: number|null, completedAt: number|null }} prev
 * @param {string} todayStr
 * @param {boolean} wasInSuggestions
 * @param {string|null} respawnedId
 */
export function revertMarkDone(id, prev, todayStr, wasInSuggestions, respawnedId) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  item.archived = prev.archived;
  item.archivedAt = prev.archivedAt;
  item.completedAt = prev.completedAt;
  if (wasInSuggestions) state.todaySuggestionIds.push(id);
  if (respawnedId) state.items = state.items.filter((i) => i.id !== respawnedId);
  removeCompletionsForTask(id, todayStr);
}

/**
 * Removes a task from state. Does not save or render.
 * @param {string} id
 * @returns {{ removed: boolean, item: import('../types.js').Task|null, index: number }}
 */
export function applyDeleteItem(id) {
  const idx = state.items.findIndex((i) => i.id === id);
  if (idx < 0) return { removed: false, item: null, index: -1 };
  const item = state.items[idx];
  state.items.splice(idx, 1);
  state.todaySuggestionIds = state.todaySuggestionIds.filter((x) => x !== id);
  state.weekPlan = removeTaskIdFromAllDays(state.weekPlan, id);
  state.selectedIds.delete(id);
  return { removed: true, item, index: idx };
}
