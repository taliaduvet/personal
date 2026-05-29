/**
 * Habits and completion tracking. Shapes: {@link import('../types.js').Habit}, {@link import('../types.js').HabitCompletion}.
 */
import { persist } from '../core/persist.js';
import { state } from '../state.js';
import { getTodayLocalYYYYMMDD, parseLocalDate } from './tasks.js';

function getHabits() {
  return (state.habits || []).slice();
}

function getCompletionsForDate(date) {
  return (state.habitCompletions || []).filter(c => c.date === date);
}

function recordCompletion(habitId, date, source, taskId) {
  if (!state.habitCompletions) state.habitCompletions = [];
  state.habitCompletions.push({ habitId, date, source, taskId: taskId || undefined });
}

function removeCompletionsForTask(taskId, date) {
  if (!state.habitCompletions) return;
  state.habitCompletions = state.habitCompletions.filter(c => !(c.date === date && c.taskId === taskId));
}

function isHabitDoneOnDate(habitId, date) {
  return (state.habitCompletions || []).some(c => c.habitId === habitId && c.date === date);
}

function computeWeightedPct(date) {
  const habits = getHabits();
  if (habits.length === 0) return 0;
  const totalWeight = habits.reduce((s, h) => s + (h.weight || 1), 0);
  const doneWeight = habits.filter(h => isHabitDoneOnDate(h.id, date)).reduce((s, h) => s + (h.weight || 1), 0);
  return totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0;
}

function compute7DayRolling() {
  const today = getTodayLocalYYYYMMDD();
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseLocalDate(today) || new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    sum += computeWeightedPct(dateStr);
    count++;
  }
  return count ? Math.round(sum / count) : 0;
}

function getZoneLabel(pct) {
  if (pct >= 70 && pct <= 85) return 'Strong';
  if (pct >= 50 && pct < 70) return 'Unstable but recoverable';
  if (pct < 50) return 'Reduce volume';
  if (pct > 85) return 'Check minimums';
  return '—';
}

function addHabit(name, weight, linkedCategoryId, linkedPileId) {
  const id = 'habit_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  (state.habits || []).push({
    id,
    name: (name || '').trim() || 'Habit',
    weight: Math.max(1, Math.min(5, parseInt(weight, 10) || 3)),
    linkedCategoryId: linkedCategoryId || null,
    linkedPileId: linkedPileId || null
  });
  persist();
  return id;
}

function updateHabit(id, name, weight, linkedCategoryId, linkedPileId) {
  const h = (state.habits || []).find(x => x.id === id);
  if (!h) return;
  if (name != null) h.name = (name || '').trim() || h.name;
  if (weight != null) h.weight = Math.max(1, Math.min(5, parseInt(weight, 10) || 3));
  if (linkedCategoryId !== undefined) h.linkedCategoryId = linkedCategoryId || null;
  if (linkedPileId !== undefined) h.linkedPileId = linkedPileId || null;
  persist();
}

function deleteHabit(id) {
  state.habits = (state.habits || []).filter(h => h.id !== id);
  state.habitCompletions = (state.habitCompletions || []).filter(c => c.habitId !== id);
  persist();
}

function toggleHabitManual(habitId, date) {
  if (isHabitDoneOnDate(habitId, date)) {
    const list = state.habitCompletions || [];
    const idx = list.findIndex(c => c.habitId === habitId && c.date === date && c.source === 'manual');
    if (idx !== -1) {
      list.splice(idx, 1);
      state.habitCompletions = list;
    }
  } else {
    recordCompletion(habitId, date, 'manual');
  }
  persist();
}

export {
  getHabits,
  getCompletionsForDate,
  recordCompletion,
  removeCompletionsForTask,
  isHabitDoneOnDate,
  computeWeightedPct,
  compute7DayRolling,
  getZoneLabel,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleHabitManual
};
