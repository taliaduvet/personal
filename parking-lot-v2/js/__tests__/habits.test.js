import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wirePersist } from '../core/persist.js';
import { state } from '../state.js';
import { addHabit, computeWeightedPct, compute7DayRolling, getZoneLabel, toggleHabitManual } from '../domain/habits.js';
import { getTodayLocalYYYYMMDD } from '../domain/tasks.js';
import { pruneHabitCompletions } from '../storage/local.js';

describe('domain/habits', () => {
  beforeEach(() => {
    wirePersist(() => {});
    state.habits = [];
    state.habitCompletions = [];
  });

  it('computeWeightedPct() returns 0 with no habits', () => {
    expect(computeWeightedPct('2026-03-30')).toBe(0);
  });

  it('computeWeightedPct() weights completions', () => {
    const h1 = addHabit('A', 1);
    const h2 = addHabit('B', 4);
    // mark only the heavy habit done
    toggleHabitManual(h2, '2026-03-30');
    expect(computeWeightedPct('2026-03-30')).toBe(80);
  });

  it('compute7DayRolling() averages across last 7 days deterministically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));

    const h1 = addHabit('A', 1);
    const today = getTodayLocalYYYYMMDD();
    toggleHabitManual(h1, today);
    const rolling = compute7DayRolling();
    // 1 day at 100, 6 days at 0 -> ~14.285 => 14 after rounding
    expect(rolling).toBe(14);

    vi.useRealTimers();
  });

  it('getZoneLabel() returns expected labels', () => {
    expect(getZoneLabel(75)).toBe('Strong');
    expect(getZoneLabel(55)).toBe('Unstable but recoverable');
    expect(getZoneLabel(20)).toBe('Reduce volume');
    expect(getZoneLabel(90)).toBe('Check minimums');
  });
});

describe('habitCompletions pruning', () => {
  beforeEach(() => {
    wirePersist(() => {});
    state.habits = [];
    state.habitCompletions = [];
  });

  it('removes completions older than 90 days relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-12T12:00:00Z'));
    state.habitCompletions = [
      { habitId: 'h1', date: '2025-01-01', source: 'manual' },
      { habitId: 'h1', date: '2026-02-15', source: 'manual' },
      { habitId: 'h1', date: '2026-04-10', source: 'task', taskId: 't1' }
    ];
    pruneHabitCompletions(state);
    expect(state.habitCompletions.length).toBe(2);
    expect(state.habitCompletions.some((c) => c.date === '2025-01-01')).toBe(false);
    expect(state.habitCompletions.some((c) => c.date === '2026-02-15')).toBe(true);
    expect(state.habitCompletions.some((c) => c.date === '2026-04-10')).toBe(true);
    vi.useRealTimers();
  });

  it('keeps all completions when all are within 90 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-12T12:00:00Z'));
    state.habitCompletions = [
      { habitId: 'h1', date: '2026-04-01', source: 'manual' },
      { habitId: 'h1', date: '2026-04-11', source: 'manual' }
    ];
    pruneHabitCompletions(state);
    expect(state.habitCompletions.length).toBe(2);
    vi.useRealTimers();
  });

  it('handles empty habitCompletions array', () => {
    state.habitCompletions = [];
    pruneHabitCompletions(state);
    expect(state.habitCompletions).toEqual([]);
  });
});

