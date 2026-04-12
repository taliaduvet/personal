import { describe, it, expect } from 'vitest';
import { plannedAmountInPeriod } from '../ledger-pure.js';

describe('plannedAmountInPeriod', () => {
  const monthly1000 = { amount_cents: 100000, frequency: 'monthly' };
  const weekly500 = { amount_cents: 50000, frequency: 'weekly' };
  const yearly1200 = { amount_cents: 120000, frequency: 'yearly' };
  const biweekly800 = { amount_cents: 80000, frequency: 'biweekly' };

  it('monthly: single month period = 1x amount', () => {
    expect(plannedAmountInPeriod(monthly1000, '2024-01-01', '2024-01-31')).toBe(100000);
  });

  it('monthly: two month period = 2x amount', () => {
    expect(plannedAmountInPeriod(monthly1000, '2024-01-01', '2024-02-29')).toBe(200000);
  });

  it('weekly: 7-day period = 1x amount', () => {
    expect(plannedAmountInPeriod(weekly500, '2024-01-01', '2024-01-07')).toBe(50000);
  });

  it('weekly: 14-day period = 2x amount', () => {
    expect(plannedAmountInPeriod(weekly500, '2024-01-01', '2024-01-14')).toBe(100000);
  });

  it('biweekly: 14-day period = 1x amount', () => {
    expect(plannedAmountInPeriod(biweekly800, '2024-01-01', '2024-01-14')).toBe(80000);
  });

  it('yearly: 12-month period = 1x amount', () => {
    expect(plannedAmountInPeriod(yearly1200, '2024-01-01', '2024-12-31')).toBe(120000);
  });

  it('yearly: 6-month period = 0.5x amount', () => {
    expect(plannedAmountInPeriod(yearly1200, '2024-01-01', '2024-06-30')).toBe(60000);
  });

  it('monthly: same-day period = at least 1x (no zero month)', () => {
    expect(plannedAmountInPeriod(monthly1000, '2024-03-15', '2024-03-15')).toBe(100000);
  });

  it('handles missing frequency as monthly', () => {
    expect(plannedAmountInPeriod({ amount_cents: 100000 }, '2024-01-01', '2024-01-31')).toBe(100000);
  });
});
