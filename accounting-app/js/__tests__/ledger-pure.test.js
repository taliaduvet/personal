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
