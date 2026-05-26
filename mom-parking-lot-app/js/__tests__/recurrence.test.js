import { describe, it, expect } from 'vitest';
import { isDueOnDate, parseRecurrenceRuleInput, getRepeatingDueToday } from '../domain/recurrence.js';

describe('recurrence', () => {
  it('daily is due every day', () => {
    const task = { archived: false, recurrence: 'daily' };
    expect(isDueOnDate(task, '2026-05-26')).toBe(true);
  });

  it('days_of_month semi-monthly', () => {
    const task = {
      archived: false,
      recurrence: 'semi_monthly',
      recurrenceRule: { type: 'days_of_month', days: [1, 15] }
    };
    expect(isDueOnDate(task, '2026-05-01')).toBe(true);
    expect(isDueOnDate(task, '2026-05-15')).toBe(true);
    expect(isDueOnDate(task, '2026-05-10')).toBe(false);
  });

  it('parseRecurrenceRuleInput days', () => {
    expect(parseRecurrenceRuleInput('days:1,15')).toEqual({ type: 'days_of_month', days: [1, 15] });
  });

  it('getRepeatingDueToday filters archived', () => {
    const items = [
      { id: '1', archived: false, recurrence: 'daily', text: 'a' },
      { id: '2', archived: true, recurrence: 'daily', text: 'b' }
    ];
    expect(getRepeatingDueToday(items, '2026-05-26').length).toBe(1);
  });
});
