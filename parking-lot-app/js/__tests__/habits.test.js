import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wirePersist } from '../core/persist.js';
import { state } from '../state.js';
import { addHabit, computeWeightedPct, compute7DayRolling, getZoneLabel, toggleHabitManual } from '../domain/habits.js';
import { getTodayLocalYYYYMMDD } from '../domain/tasks.js';

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

