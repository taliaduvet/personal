import { describe, it, expect } from 'vitest';
import {
  parseBankCsvMoneyCents,
  signedCentsFromBankRow,
  guessBankEntryType,
  descriptionLooksLikeIncome
} from '../bank-amount-pure.js';

describe('parseBankCsvMoneyCents', () => {
  it('parses plain dollars', () => {
    expect(parseBankCsvMoneyCents('12.34')).toBe(1234);
  });

  it('strips commas', () => {
    expect(parseBankCsvMoneyCents('1,234.56')).toBe(123456);
  });

  it('parentheses mean negative', () => {
    expect(parseBankCsvMoneyCents('(50.00)')).toBe(-5000);
  });

  it('DR suffix makes outflow negative when positive number', () => {
    expect(parseBankCsvMoneyCents('99.00 DR')).toBe(-9900);
  });

  it('CR keeps deposit positive', () => {
    expect(parseBankCsvMoneyCents('200.00 CR')).toBe(20000);
  });
});

describe('signedCentsFromBankRow', () => {
  it('uses credit minus debit', () => {
    const row = { D: '10', C: '100' };
    expect(signedCentsFromBankRow(row, '', 'D', 'C')).toBe(9000);
  });

  it('falls back to amount column', () => {
    expect(signedCentsFromBankRow({ A: '-25.00' }, 'A', '', '')).toBe(-2500);
  });
});

describe('guessBankEntryType', () => {
  const noSug = { entryType: null };

  it('respects saved rules suggestion', () => {
    expect(guessBankEntryType(5000, 'FOO', { entryType: 'expense', categoryId: '8810' }, false)).toBe('expense');
  });

  it('classic signed CSV: negative expense', () => {
    expect(guessBankEntryType(-1000, 'STORE', noSug, true)).toBe('expense');
  });

  it('classic signed CSV: positive income', () => {
    expect(guessBankEntryType(50000, 'PAYROLL', noSug, true)).toBe('income');
  });

  it('all-positive batch: default expense', () => {
    expect(guessBankEntryType(4500, 'UBER EATS', noSug, false)).toBe('expense');
  });

  it('all-positive batch: income keywords', () => {
    expect(guessBankEntryType(200000, 'DIRECT DEPOSIT PAYROLL', noSug, false)).toBe('income');
  });
});

describe('descriptionLooksLikeIncome', () => {
  it('detects deposit language', () => {
    expect(descriptionLooksLikeIncome('E-TRANSFER — RECEIVED')).toBe(true);
  });
});
