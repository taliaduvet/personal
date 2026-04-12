import { describe, it, expect } from 'vitest';
import { guessVendorFromBankDescription, normalizeDate, suggestFromRules } from '../ledger-pure.js';

describe('ledger-pure', () => {
  it('guessVendorFromBankDescription truncates after star', () => {
    expect(guessVendorFromBankDescription('STARBUCKS*123')).toBe('STARBUCKS');
  });

  it('normalizeDate accepts ISO', () => {
    expect(normalizeDate('2024-03-15')).toBe('2024-03-15');
  });

  it('suggestFromRules picks longest pattern', () => {
    const rules = [
      { pattern_type: 'contains', pattern: 'FOO', entry_type: 'expense', category_id: '8810' },
      { pattern_type: 'contains', pattern: 'FOOBAR', entry_type: 'expense', category_id: '8910' },
    ];
    const s = suggestFromRules('MY FOOBAR BAZ', rules);
    expect(s.categoryId).toBe('8910');
  });
});

describe('normalizeDate edge cases', () => {
  it('handles ISO with time suffix', () => {
    expect(normalizeDate('2024-03-15T00:00:00Z')).toBe('2024-03-15');
  });
  it('handles MM/DD/YYYY (US format)', () => {
    expect(normalizeDate('03/15/2024')).toBe('2024-03-15');
  });
  it('handles DD/MM/YYYY (Canadian/EU format)', () => {
    expect(normalizeDate('15/03/2024')).toBe('2024-03-15');
  });
  it('handles natural language date', () => {
    expect(normalizeDate('Jan 5, 2024')).toBe('2024-01-05');
  });
  it('handles dot-separated YYYY.MM.DD', () => {
    expect(normalizeDate('2024.03.15')).toBe('2024-03-15');
  });
  it('returns empty string for unparseable input', () => {
    expect(normalizeDate('not-a-date')).toBe('');
    expect(normalizeDate('04/05/06')).toBe('');
  });
  it('handles empty and null', () => {
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate(null)).toBe('');
  });
});
