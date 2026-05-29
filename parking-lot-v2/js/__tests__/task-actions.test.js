import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wirePersist } from '../core/persist.js';
import { state } from '../state.js';
import { createItem } from '../domain/tasks.js';
import {
  applyMarkDone,
  revertMarkDone,
  applyDeleteItem
} from '../domain/task-actions.js';
import { getMondayYYYYMMDD } from '../domain/weekly-planning.js';

describe('domain/task-actions', () => {
  beforeEach(() => {
    wirePersist(() => {});
    state.items = [];
    state.todaySuggestionIds = [];
    state.selectedIds = new Set();
    state.habits = [];
    state.habitCompletions = [];
    state.weekPlan = { anchorWeekStart: getMondayYYYYMMDD(), days: {} };
    state.hiddenFromTodayByDate = {};
    state.processingIds = new Set();
  });

  describe('applyMarkDone', () => {
    it('archives the item', () => {
      const t = createItem('x', 'work', null, 'medium', null, null, null, null, null, null);
      state.items.push(t);
      const r = applyMarkDone(t.id);
      expect(r.mutated).toBe(true);
      const item = state.items.find((i) => i.id === t.id);
      expect(item?.archived).toBe(true);
      expect(item?.completedAt).toBeTruthy();
    });

    it('removes item from todaySuggestionIds', () => {
      const t = createItem('x', 'work', null, 'medium', null, null, null, null, null, null);
      state.items.push(t);
      state.todaySuggestionIds = [t.id];
      applyMarkDone(t.id);
      expect(state.todaySuggestionIds.includes(t.id)).toBe(false);
    });

    it('respawns a new item if recurrence is set', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
      const t = createItem('daily thing', 'work', null, 'medium', 'daily', null, null, null, null, null);
      state.items.push(t);
      const before = state.items.length;
      const r = applyMarkDone(t.id);
      expect(r.mutated).toBe(true);
      expect(state.items.length).toBe(before + 1);
      const spawned = state.items.find((i) => i.id !== t.id);
      expect(spawned?.recurrence).toBe('daily');
      vi.useRealTimers();
    });

    it('is idempotent if item already archived', () => {
      const t = createItem('x', 'work', null, 'medium', null, null, null, null, null, null);
      t.archived = true;
      t.archivedAt = 1;
      t.completedAt = 2;
      state.items.push(t);
      const r = applyMarkDone(t.id);
      expect(r.mutated).toBe(false);
    });
  });

  describe('revertMarkDone', () => {
    it('restores archived=false and removes respawned item', () => {
      const t = createItem('x', 'work', null, 'medium', 'daily', null, null, null, null, null);
      state.items.push(t);
      const r = applyMarkDone(t.id);
      expect(r.mutated).toBe(true);
      const prev = r.prev;
      revertMarkDone(t.id, prev, r.todayStr, r.wasInSuggestions, r.respawnedId);
      const item = state.items.find((i) => i.id === t.id);
      expect(item?.archived).toBe(false);
      if (r.respawnedId) {
        expect(state.items.some((i) => i.id === r.respawnedId)).toBe(false);
      }
    });
  });

  describe('applyDeleteItem', () => {
    it('removes item from state.items and todaySuggestionIds', () => {
      const a = createItem('a', 'work', null, 'medium', null, null, null, null, null, null);
      const b = createItem('b', 'work', null, 'medium', null, null, null, null, null, null);
      state.items.push(a, b);
      state.todaySuggestionIds = [a.id];
      state.selectedIds.add(a.id);
      const r = applyDeleteItem(a.id);
      expect(r.removed).toBe(true);
      expect(state.items.find((i) => i.id === a.id)).toBeUndefined();
      expect(state.todaySuggestionIds.includes(a.id)).toBe(false);
      expect(state.selectedIds.has(a.id)).toBe(false);
    });

    it('returns removed: false if id not found', () => {
      const r = applyDeleteItem('missing');
      expect(r.removed).toBe(false);
    });
  });
});
