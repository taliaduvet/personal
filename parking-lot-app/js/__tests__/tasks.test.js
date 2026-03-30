import { beforeEach, describe, expect, it, vi } from 'vitest';

import { state } from '../state.js';
import {
  createItem,
  detectCategory,
  extractDeadline,
  extractPriority,
  formatDeadline,
  formatDuration,
  getActiveColumnColors,
  getColumnColor,
  getItemsByCategory,
  getSortReferenceDate,
  getTimeBand,
  parseLocalDate,
  sortByTimeBandsAndFriction,
  stripAutoExtractedFromText
} from '../domain/tasks.js';

describe('domain/tasks', () => {
  beforeEach(() => {
    state.items = [];
    state.searchQuery = '';
    state.lastCategory = 'life';
    state.categoryPreset = 'generic';
    state.customLabels = {};
    state.columnColors = {};
  });

  it('detectCategory() matches generic preset keywords', () => {
    state.categoryPreset = 'generic';
    expect(detectCategory('work invoice')).toBe('work');
    expect(detectCategory('hobby painting')).toBe('hobbies');
    expect(detectCategory('hobbi time')).toBe('hobbies');
    expect(detectCategory('life dentist')).toBe('life');
    expect(detectCategory('totally neutral')).toBe(null);
  });

  it('detectCategory() matches creative preset keywords', () => {
    state.categoryPreset = 'creative';
    expect(detectCategory('misfit draft')).toBe('misfit');
    expect(detectCategory('stop2030 backlog')).toBe('stop2030barclay');
    expect(detectCategory('stop 2030 planning')).toBe('stop2030barclay');
    expect(detectCategory('barclay call')).toBe('stop2030barclay');
    expect(detectCategory('cycles grant')).toBe('cycles');
    expect(detectCategory('life admin')).toBe('life');
    expect(detectCategory('totally neutral')).toBe(null);
  });

  it('extractPriority() detects common priority phrases', () => {
    expect(extractPriority('ASAP please')).toBe('critical');
    expect(extractPriority('top priority')).toBe('critical');
    expect(extractPriority('high priority')).toBe('high');
    expect(extractPriority('this is important')).toBe('high');
    expect(extractPriority('nice to have')).toBe('low');
    expect(extractPriority('optional')).toBe('low');
    expect(extractPriority('normal task')).toBe('medium');
    expect(extractPriority('no signal here')).toBe(null);
  });

  it('extractDeadline() parses month/day formats deterministically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));
    expect(extractDeadline('due mar 15')).toBe('2026-03-15');
    expect(extractDeadline('by March 2 2027')).toBe('2027-03-02');
    vi.useRealTimers();
  });

  it('extractDeadline() parses slash formats deterministically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));
    expect(extractDeadline('due 3/20')).toBe('2026-03-20');
    expect(extractDeadline('by 12-1-27')).toBe('2027-12-01');
    vi.useRealTimers();
  });

  it('stripAutoExtractedFromText() removes recognized tokens cleanly', () => {
    const out = stripAutoExtractedFromText('work invoice due mar 15 asap', 'work', '2026-03-15', 'critical');
    expect(out).toBe('invoice');
  });

  it('createItem() uses lastCategory fallback and normalizes friction/person/pile', () => {
    state.lastCategory = 'work';
    const item = createItem('hello', null, null, null, null, null, null, undefined, 'not-a-friction', 'person_1');
    expect(item.category).toBe('work');
    expect(item.friction).toBe(null);
    expect(item.pileId).toBe(null);
    expect(item.personId).toBe('person_1');
    expect(item.archived).toBe(false);
  });

  it('parseLocalDate() only accepts YYYY-MM-DD', () => {
    expect(parseLocalDate('2026-03-30')).toBeInstanceOf(Date);
    expect(parseLocalDate('03/30/2026')).toBe(null);
    expect(parseLocalDate(null)).toBe(null);
  });

  it('getSortReferenceDate() prefers doingDate over deadline', () => {
    const item = { doingDate: '2026-04-02', deadline: '2026-04-01' };
    const ref = getSortReferenceDate(item);
    expect(ref.toISOString().slice(0, 10)).toBe('2026-04-02');
  });

  it('formatDeadline() marks overdue and formats near-term labels', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));
    expect(formatDeadline('2026-03-29')).toEqual({ text: 'OVERDUE (1d)', overdue: true });
    expect(formatDeadline('2026-03-30')).toEqual({ text: 'Today', overdue: false });
    expect(formatDeadline('2026-04-01')).toEqual({ text: 'In 2d', overdue: false });
    vi.useRealTimers();
  });

  it('getTimeBand() maps missing dates to the catch-all band', () => {
    expect(getTimeBand({ deadline: null, doingDate: null })).toBe(3);
  });

  it('sortByTimeBandsAndFriction() sorts by band, then priority, then friction', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T08:00:00Z'));

    const a = { id: 'a', doingDate: '2026-03-30', deadline: null, priority: 'medium', friction: 'deep', parkedAt: 1 };
    const b = { id: 'b', doingDate: '2026-03-30', deadline: null, priority: 'high', friction: 'medium', parkedAt: 2 };
    const c = { id: 'c', doingDate: '2026-04-05', deadline: null, priority: 'critical', friction: 'quick', parkedAt: 3 };

    const sorted = sortByTimeBandsAndFriction([a, b, c]).map(x => x.id);
    // b beats a due to higher priority within same band; c likely lands in "week" band vs "today"
    expect(sorted[0]).toBe('b');
    expect(sorted[1]).toBe('a');
    expect(sorted).toContain('c');

    vi.useRealTimers();
  });

  it('getItemsByCategory() filters by searchQuery', () => {
    state.items = [
      { id: 1, category: 'work', text: 'Invoice Acme', archived: false },
      { id: 2, category: 'work', text: 'Email Bob', archived: false },
      { id: 3, category: 'life', text: 'Dentist', archived: false }
    ];
    state.searchQuery = 'invoice';
    expect(getItemsByCategory('work').map(i => i.id)).toEqual([1]);
  });

  it('formatDuration() uses human-friendly buckets', () => {
    expect(formatDuration(0)).toBe('Today');
    expect(formatDuration(86400000)).toBe('1d');
    expect(formatDuration(3 * 86400000)).toBe('3d');
    expect(formatDuration(10 * 86400000)).toBe('1w');
  });

  it('getColumnColor()/getActiveColumnColors() respect defaults and reserved keys', () => {
    expect(getColumnColor('work')).toBe('#e07a5f'); // default
    state.columnColors = { work: '#111111', __button: '#222222', __text: '#333333' };
    expect(getColumnColor('work')).toBe('#111111');
    expect(getColumnColor('__button')).toBe(null);
    expect(getActiveColumnColors()).toEqual({ work: '#111111' });
  });
});

