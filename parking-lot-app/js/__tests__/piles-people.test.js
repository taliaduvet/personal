import { beforeEach, describe, expect, it } from 'vitest';

import { wirePersist } from '../core/persist.js';
import { state } from '../state.js';
import {
  addPerson,
  addPile,
  deletePile,
  getReconnectIntervalMs,
  isOverdueToReconnect,
  updatePile
} from '../domain/piles-people.js';

describe('domain/piles-people', () => {
  beforeEach(() => {
    wirePersist(() => {});
    state.items = [];
    state.piles = [];
    state.people = [];
  });

  it('addPile()/updatePile()/deletePile() manage piles and clear item pileId', () => {
    const pileId = addPile('Admin');
    expect(pileId).toMatch(/^pile_/);
    expect(state.piles.find(p => p.id === pileId)?.name).toBe('Admin');

    updatePile(pileId, 'Admin 2');
    expect(state.piles.find(p => p.id === pileId)?.name).toBe('Admin 2');

    state.items = [
      { id: 't1', pileId, archived: false },
      { id: 't2', pileId: null, archived: false }
    ];
    const clearedCount = deletePile(pileId);
    expect(clearedCount).toBe(1);
    expect(state.items.find(i => i.id === 't1')?.pileId).toBe(null);
    expect(state.piles.some(p => p.id === pileId)).toBe(false);
  });

  it('addPerson() normalizes group and returns id', () => {
    const id = addPerson({ name: '  Alex  ', group: 'work' });
    expect(id).toMatch(/^person_/);
    expect(state.people.find(p => p.id === id)?.name).toBe('Alex');
    expect(state.people.find(p => p.id === id)?.group).toBe('work');
  });

  it('getReconnectIntervalMs() maps presets', () => {
    expect(getReconnectIntervalMs('1w')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(getReconnectIntervalMs('2w')).toBe(14 * 24 * 60 * 60 * 1000);
    expect(getReconnectIntervalMs('1m')).toBe(30 * 24 * 60 * 60 * 1000);
    expect(getReconnectIntervalMs('3m')).toBe(90 * 24 * 60 * 60 * 1000);
    expect(getReconnectIntervalMs('nope')).toBe(0);
  });

  it('isOverdueToReconnect() returns false on invalid inputs', () => {
    expect(isOverdueToReconnect(null)).toBe(false);
    expect(isOverdueToReconnect({})).toBe(false);
    expect(isOverdueToReconnect({ lastConnected: null, reconnectRule: { interval: '1w' } })).toBe(false);
  });
});

