import { beforeEach, describe, expect, it } from 'vitest';

import { wirePersist } from '../core/persist.js';
import { state } from '../state.js';
import {
  addPerson,
  addPile,
  deletePile,
  getReconnectIntervalMs,
  getNextReconnectDueYmd,
  isAgreedReconnectSnoozed,
  isOverdueToReconnect,
  getUpcomingBirthdays,
  updatePile,
  parseYmdToMs,
  todayYmd
} from '../domain/piles-people.js';

describe('domain/piles-people', () => {
  beforeEach(() => {
    wirePersist(() => {});
    state.items = [];
    state.piles = [];
    state.people = [];
    state.peopleGroups = null;
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

  it('getNextReconnectDueYmd() computes from last connected + interval', () => {
    const last = parseYmdToMs('2020-01-01');
    const person = {
      lastConnected: last,
      reconnectRule: { interval: '1w' }
    };
    const due = getNextReconnectDueYmd(person);
    expect(due).toBe('2020-01-08');
  });

  it('isAgreedReconnectSnoozed() suppresses overdue until agreed date passes', () => {
    const futureYmd = todayYmd();
    const person = {
      lastConnected: parseYmdToMs('2000-01-01'),
      reconnectRule: { interval: '1w' },
      agreedReconnectOn: parseYmdToMs(futureYmd)
    };
    expect(isAgreedReconnectSnoozed(person)).toBe(true);
    expect(isOverdueToReconnect(person)).toBe(false);
  });

  it('getUpcomingBirthdays() finds birthdays within window', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    addPerson({ name: 'Birthday pal', group: 'friends', birthday: `${y}-${m}-${d}` });
    const upcoming = getUpcomingBirthdays(14);
    expect(upcoming.some((u) => u.person.name === 'Birthday pal' && u.daysUntil === 0)).toBe(true);
  });
});
