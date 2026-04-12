import { describe, it, expect } from 'vitest';
import { toCents, centsToDollars } from '../ledger-pure.js';

describe('toCents', () => {
  it('converts dollars to cents', () => expect(toCents('12.34')).toBe(1234));
  it('handles integer input', () => expect(toCents('100')).toBe(10000));
  it('handles string with dollar sign', () => expect(toCents('$9.99')).toBe(999));
  it('handles empty string', () => expect(toCents('')).toBe(0));
  it('handles null', () => expect(toCents(null)).toBe(0));
  it('rounds half-up correctly (floating point trap)', () => {
    expect(toCents('0.30')).toBe(30);
    expect(toCents((0.1 + 0.2).toString())).toBe(30);
  });
  it('handles negative values', () => expect(toCents('-5.00')).toBe(-500));
});

describe('centsToDollars', () => {
  it('formats correctly', () => expect(centsToDollars(1234)).toBe('12.34'));
  it('handles zero', () => expect(centsToDollars(0)).toBe('0.00'));
  it('handles null', () => expect(centsToDollars(null)).toBe('0.00'));
  it('handles large numbers', () => expect(centsToDollars(1000000)).toBe('10000.00'));
  it('pads decimal places', () => expect(centsToDollars(100)).toBe('1.00'));
});
