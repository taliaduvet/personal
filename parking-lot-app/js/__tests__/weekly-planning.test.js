import { describe, it, expect } from 'vitest';
import { swapFocusPileAdjacent, getFocusPileTasks } from '../domain/weekly-planning.js';

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
