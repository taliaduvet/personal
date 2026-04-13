import { describe, it, expect } from 'vitest';
import {
  swapFocusPileAdjacent,
  getFocusPileTasks,
  rollWeekPlanIfStale,
  addWeeksToMonday
} from '../domain/weekly-planning.js';

describe('swapFocusPileAdjacent', () => {
  const todayKey = '2026-04-09';
  const items = [
    { id: 'a', pileId: 'p1', archived: false, category: 'life', parkedAt: 1 },
    { id: 'b', pileId: 'p1', archived: false, category: 'life', parkedAt: 2 },
    { id: 'c', pileId: 'p1', archived: false, category: 'life', parkedAt: 3 }
  ];

  it('swaps adjacent ids down', () => {
    const dayEntry = { pileId: 'p1', orderedTaskIds: ['a', 'b', 'c'] };
    const next = swapFocusPileAdjacent(items, todayKey, dayEntry, 'a', 'down');
    expect(next).toEqual(['b', 'a', 'c']);
  });

  it('returns null at boundary', () => {
    const dayEntry = { pileId: 'p1', orderedTaskIds: ['a', 'b'] };
    expect(swapFocusPileAdjacent(items, todayKey, dayEntry, 'a', 'up')).toBeNull();
  });

  it('getFocusPileTasks excludes ids marked hidden for today', () => {
    const dayEntry = { pileId: 'p1', orderedTaskIds: ['a', 'b'] };
    const ids = getFocusPileTasks(items, todayKey, dayEntry, new Set(['a'])).map(i => i.id);
    expect(ids).toEqual(['b', 'c']);
  });
});

describe('rollWeekPlanIfStale', () => {
  it('keeps a future week plan (e.g. next week planned from Sunday)', () => {
    const wp = {
      anchorWeekStart: '2026-04-13',
      days: { '2026-04-14': { pileId: 'p1', orderedTaskIds: ['x'] } }
    };
    const r = rollWeekPlanIfStale(wp, '2026-04-06');
    expect(r.rolled).toBe(false);
    expect(r.weekPlan.anchorWeekStart).toBe('2026-04-13');
    expect(r.weekPlan.days['2026-04-14'].pileId).toBe('p1');
  });

  it('rolls forward when anchor is before the current Monday', () => {
    const wp = { anchorWeekStart: '2026-03-30', days: { '2026-03-31': { pileId: 'p1', orderedTaskIds: [] } } };
    const r = rollWeekPlanIfStale(wp, '2026-04-06');
    expect(r.rolled).toBe(true);
    expect(r.weekPlan.anchorWeekStart).toBe('2026-04-06');
    expect(r.weekPlan.days).toEqual({});
    expect(r.previousWeekPlanSnapshot?.anchorWeekStart).toBe('2026-03-30');
  });
});

describe('addWeeksToMonday', () => {
  it('moves Monday anchor by whole weeks', () => {
    expect(addWeeksToMonday('2026-04-06',1)).toBe('2026-04-13');
    expect(addWeeksToMonday('2026-04-13', -1)).toBe('2026-04-06');
  });
});
