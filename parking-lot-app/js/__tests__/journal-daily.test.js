import { describe, it, expect } from 'vitest';
import {
  normalizeJournalDayValue,
  journalDayHasContent,
  mergeJournalDayRemote,
  legacyPlainTextToJournalHtml
} from '../domain/journal-daily.js';

describe('journal-daily', () => {
  it('normalizes legacy string to v2 entries', () => {
    const d = normalizeJournalDayValue('hello\n\nworld');
    expect(d.v).toBe(2);
    expect(d.entries.length).toBe(1);
    expect(d.entries[0].html).toContain('hello');
    expect(d.entries[0].html).toContain('world');
  });

  it('journalDayHasContent is false for empty', () => {
    expect(journalDayHasContent('')).toBe(false);
    expect(journalDayHasContent({ v: 2, entries: [{ id: 'a', html: '<p><br></p>', updatedAt: 1 }] })).toBe(false);
  });

  it('mergeJournalDayRemote unions entries by id', () => {
    const a = { v: 2, entries: [{ id: 'x', html: '<p>a</p>', updatedAt: 1 }] };
    const b = { v: 2, entries: [{ id: 'y', html: '<p>b</p>', updatedAt: 2 }] };
    const m = mergeJournalDayRemote(a, b);
    expect(m.entries.map((e) => e.id).sort()).toEqual(['x', 'y']);
  });

  it('legacyPlainTextToJournalHtml wraps paragraphs', () => {
    const h = legacyPlainTextToJournalHtml('a\n\nb');
    expect(h).toContain('<p>');
    expect(h).toContain('a');
    expect(h).toContain('b');
  });
});
