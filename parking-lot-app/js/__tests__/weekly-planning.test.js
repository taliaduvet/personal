import { describe, it, expect } from 'vitest';
import {
  swapFocusPileAdjacent,
  getFocusPileTasks,
  getTodayLayoutMode,
  rollWeekPlanIfStale,
  addWeeksToMonday,
  normalizeWeekPlan,
  removeTaskIdFromAllDays,
  insertTaskInDayOrder,
  clearWeekDaysForAnchor,
  extractDaysForCalendarWeek,
  mergeWeekPlanSlice
} from '../domain/weekly-planning.js';

describe('getTodayLayoutMode', () => {
  it('returns no_week when there is no day entry for todayKey', () => {
    expect(
      getTodayLayoutMode(
        {
          anchorWeekStart: '2026-04-13',
          days: { '2026-04-14': { pileId: 'p1', orderedTaskIds: [] } }
        },
        '2026-04-09'
      )
    ).toBe('no_week');
  });

  it('returns with_plan when todayKey has a pile, regardless of anchor week', () => {
    expect(
      getTodayLayoutMode(
        {
          anchorWeekStart: '2026-04-06',
          days: { '2026-04-09': { pileId: 'p1', orderedTaskIds: [] } }
        },
        '2026-04-09'
      )
    ).toBe('with_plan');
  });

  it('returns with_plan for today when that date is planned even if anchor points elsewhere', () => {
    expect(
      getTodayLayoutMode(
        {
          anchorWeekStart: '2026-03-30',
          days: { '2026-04-09': { pileId: 'p1', orderedTaskIds: [] } }
        },
        '2026-04-09'
      )
    ).toBe('with_plan');
  });

  it('returns blank_today when today has an entry but no pile theme', () => {
    expect(
      getTodayLayoutMode(
        {
          anchorWeekStart: '2026-04-06',
          days: { '2026-04-09': { pileId: null, orderedTaskIds: [], note: 'n', excludedTaskIds: [] } }
        },
        '2026-04-09'
      )
    ).toBe('blank_today');
  });
});

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
  it('is a no-op: plans stay on absolute calendar dates', () => {
    const wp = {
      anchorWeekStart: '2026-03-30',
      days: {
        '2026-03-31': { pileId: 'p1', orderedTaskIds: ['t1'], note: 'dentist', excludedTaskIds: [] }
      }
    };
    const r = rollWeekPlanIfStale(wp, '2026-04-06');
    expect(r.rolled).toBe(false);
    expect(r.previousWeekPlanSnapshot).toBeNull();
    expect(r.weekPlan.anchorWeekStart).toBe('2026-03-30');
    expect(r.weekPlan.days['2026-03-31'].note).toBe('dentist');
  });
});

describe('mergeWeekPlanSlice', () => {
  it('replaces one calendar week and keeps other date keys', () => {
    const existing = normalizeWeekPlan({
      anchorWeekStart: '2026-03-30',
      days: {
        '2026-04-07': { pileId: 'p1', orderedTaskIds: ['a'], note: 'old', excludedTaskIds: [] },
        '2026-04-20': { pileId: 'p2', orderedTaskIds: [], note: 'keep', excludedTaskIds: [] }
      }
    });
    const slice = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: {
        '2026-04-07': { pileId: 'p9', orderedTaskIds: [], note: 'new', excludedTaskIds: [] }
      }
    });
    const m = mergeWeekPlanSlice(existing, slice);
    expect(m.days['2026-04-07'].pileId).toBe('p9');
    expect(m.days['2026-04-07'].note).toBe('new');
    expect(m.days['2026-04-20'].note).toBe('keep');
    expect(m.anchorWeekStart).toBe('2026-04-06');
  });
});

describe('extractDaysForCalendarWeek', () => {
  it('copies only keys in the given week', () => {
    const wp = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: {
        '2026-04-07': { pileId: 'p1', orderedTaskIds: [], note: 'a', excludedTaskIds: [] },
        '2026-04-20': { pileId: 'p2', orderedTaskIds: [], note: 'b', excludedTaskIds: [] }
      }
    });
    const d = extractDaysForCalendarWeek(wp, '2026-04-06');
    expect(Object.keys(d).sort()).toEqual(['2026-04-07']);
    expect(d['2026-04-07'].note).toBe('a');
    expect(d['2026-04-20']).toBeUndefined();
  });
});

describe('clearWeekDaysForAnchor', () => {
  it('removes only days in the anchor week, not other calendar dates', () => {
    const wp = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: {
        '2026-04-07': { pileId: 'p1', orderedTaskIds: [], note: '', excludedTaskIds: [] },
        '2026-04-20': { pileId: 'p2', orderedTaskIds: [], note: 'later', excludedTaskIds: [] }
      }
    });
    const n = clearWeekDaysForAnchor(wp);
    expect(n.days['2026-04-07']).toBeUndefined();
    expect(n.days['2026-04-20'].note).toBe('later');
  });
});

describe('normalizeWeekPlan', () => {
  it('truncates per-day note', () => {
    const long = 'x'.repeat(500);
    const n = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-07': { pileId: null, orderedTaskIds: [], note: long } }
    });
    expect(n.days['2026-04-07'].note.length).toBe(400);
  });

  it('defaults day note to empty string', () => {
    const n = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-07': { pileId: 'p1', orderedTaskIds: [] } }
    });
    expect(n.days['2026-04-07'].note).toBe('');
    expect(n.days['2026-04-07'].excludedTaskIds).toEqual([]);
  });

  it('migrates legacy planNotes onto Monday when that day has no note', () => {
    const n = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: {},
      planNotes: 'Hello week'
    });
    expect(n.days['2026-04-06'].note).toBe('Hello week');
    expect('planNotes' in n).toBe(false);
  });

  it('does not overwrite Monday note with legacy planNotes', () => {
    const n = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-06': { pileId: null, orderedTaskIds: [], note: 'Already' } },
      planNotes: 'Legacy'
    });
    expect(n.days['2026-04-06'].note).toBe('Already');
  });

  it('normalizes excludedTaskIds per day', () => {
    const n = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-07': { pileId: 'p1', orderedTaskIds: ['a'], excludedTaskIds: ['b', 'b'] } }
    });
    expect(n.days['2026-04-07'].excludedTaskIds).toEqual(['b']);
  });

  it('drops excludedTaskIds when pile is cleared', () => {
    const n = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-07': { pileId: null, orderedTaskIds: [], excludedTaskIds: ['x'] } }
    });
    expect(n.days['2026-04-07'].excludedTaskIds).toEqual([]);
  });
});

describe('getFocusPileTasks', () => {
  const items = [
    { id: 'a', pileId: 'p1', archived: false, category: 'life', parkedAt: 1 },
    { id: 'b', pileId: 'p1', archived: false, category: 'life', parkedAt: 2 }
  ];

  it('omits tasks listed in excludedTaskIds', () => {
    const dayEntry = { pileId: 'p1', orderedTaskIds: ['a', 'b'], excludedTaskIds: ['a'] };
    const ids = getFocusPileTasks(items, '2026-04-09', dayEntry, null).map(t => t.id);
    expect(ids).toEqual(['b']);
  });
});

describe('removeTaskIdFromAllDays', () => {
  it('removes id from excludedTaskIds too', () => {
    const wp = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-07': { pileId: 'p1', orderedTaskIds: ['a'], excludedTaskIds: ['a', 'b'] } }
    });
    const next = removeTaskIdFromAllDays(wp, 'a');
    expect(next.days['2026-04-07'].orderedTaskIds).toEqual([]);
    expect(next.days['2026-04-07'].excludedTaskIds).toEqual(['b']);
  });
});

describe('insertTaskInDayOrder', () => {
  it('clears excluded when inserting task into that day', () => {
    const wp = normalizeWeekPlan({
      anchorWeekStart: '2026-04-06',
      days: { '2026-04-07': { pileId: 'p1', orderedTaskIds: [], excludedTaskIds: ['t1'] } }
    });
    const next = insertTaskInDayOrder(wp, '2026-04-07', 't1', 'top');
    expect(next.days['2026-04-07'].orderedTaskIds).toEqual(['t1']);
    expect(next.days['2026-04-07'].excludedTaskIds).toEqual([]);
  });
});

describe('addWeeksToMonday', () => {
  it('moves Monday anchor by whole weeks', () => {
    expect(addWeeksToMonday('2026-04-06',1)).toBe('2026-04-13');
    expect(addWeeksToMonday('2026-04-13', -1)).toBe('2026-04-06');
  });
});
