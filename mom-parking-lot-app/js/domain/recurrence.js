/**
 * Recurrence due dates and next spawn for Mom's Parking Lot.
 */
import { parseLocalDate, getTodayLocalYYYYMMDD } from './tasks.js';

/**
 * @param {import('../types.js').Task} task
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
export function isDueOnDate(task, dateStr) {
  if (!task || task.archived) return false;
  const r = task.recurrence;
  if (!r) return false;

  const d = parseLocalDate(dateStr);
  if (!d) return false;

  if (r === 'daily') return true;

  if (r === 'weekly') {
    const anchor = task.recurrenceRule?.anchorDate || task.doingDate || task.deadline;
    const a = parseLocalDate(anchor);
    if (!a) return d.getDay() === new Date().getDay();
    return d.getDay() === a.getDay();
  }

  if (r === 'monthly') {
    const day = task.recurrenceRule?.dayOfMonth;
    const anchor = task.recurrenceRule?.anchorDate || task.doingDate || task.deadline;
    const dom = day != null ? Number(day) : (parseLocalDate(anchor)?.getDate() ?? 1);
    return d.getDate() === dom;
  }

  if (r === 'quarterly') {
    const anchor = task.recurrenceRule?.anchorDate || task.doingDate || task.deadline;
    const a = parseLocalDate(anchor);
    if (!a) return false;
    const monthsDiff = (d.getFullYear() - a.getFullYear()) * 12 + (d.getMonth() - a.getMonth());
    return monthsDiff >= 0 && monthsDiff % 3 === 0 && d.getDate() === a.getDate();
  }

  if (r === 'semi_monthly') {
    return evalSemiMonthlyRule(task, dateStr);
  }

  return false;
}

/**
 * @param {import('../types.js').Task} task
 * @param {string} dateStr
 * @returns {boolean}
 */
function evalSemiMonthlyRule(task, dateStr) {
  const rule = task.recurrenceRule || {};
  const d = parseLocalDate(dateStr);
  if (!d) return false;

  if (rule.type === 'days_of_month' && Array.isArray(rule.days)) {
    return rule.days.includes(d.getDate());
  }

  if (rule.type === 'every_n_days' && rule.anchorDate && rule.intervalDays) {
    const anchor = parseLocalDate(rule.anchorDate);
    if (!anchor) return false;
    const diff = Math.floor((d - anchor) / 86400000);
    return diff >= 0 && diff % Number(rule.intervalDays) === 0;
  }

  if (rule.type === 'weekdays' && Array.isArray(rule.weekdays)) {
    return rule.weekdays.includes(d.getDay());
  }

  return false;
}

/**
 * Active tasks that should appear in Focus "Repeating" pane today.
 * @param {import('../types.js').Task[]} items
 * @param {string} [todayStr]
 * @returns {import('../types.js').Task[]}
 */
export function getRepeatingDueToday(items, todayStr = getTodayLocalYYYYMMDD()) {
  return items.filter((i) => !i.archived && isDueOnDate(i, todayStr));
}

/**
 * @param {import('../types.js').Task} item
 * @returns {string|null} next deadline YYYY-MM-DD
 */
/**
 * Parse simple rule text from task modal.
 * @param {string} raw
 * @returns {import('../types.js').Task['recurrenceRule']|null}
 */
export function parseRecurrenceRuleInput(raw) {
  const t = (raw || '').trim();
  if (!t) return null;
  const daysMatch = t.match(/^days:\s*([\d,\s]+)/i);
  if (daysMatch) {
    const days = daysMatch[1].split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 31);
    if (days.length) return { type: 'days_of_month', days };
  }
  const everyMatch = t.match(/^every:\s*(\d+)(?:\s+from:\s*(\d{4}-\d{2}-\d{2}))?/i);
  if (everyMatch) {
    return {
      type: 'every_n_days',
      intervalDays: Number(everyMatch[1]),
      anchorDate: everyMatch[2] || new Date().toISOString().slice(0, 10)
    };
  }
  return null;
}

/**
 * @param {import('../types.js').Task['recurrenceRule']} rule
 * @returns {string}
 */
export function formatRecurrenceRuleInput(rule) {
  if (!rule) return '';
  if (rule.type === 'days_of_month' && Array.isArray(rule.days)) return 'days:' + rule.days.join(',');
  if (rule.type === 'every_n_days') return 'every:' + rule.intervalDays + ' from:' + (rule.anchorDate || '');
  return '';
}

export function computeNextDeadlineAfterComplete(item) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) =>
    dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());

  if (item.recurrence === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }
  if (item.recurrence === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return fmt(d);
  }
  if (item.recurrence === 'monthly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return fmt(d);
  }
  if (item.recurrence === 'quarterly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 3);
    return fmt(d);
  }
  if (item.recurrence === 'semi_monthly') {
    return computeNextSemiMonthly(item, now);
  }
  return null;
}

/**
 * @param {import('../types.js').Task} item
 * @param {Date} from
 * @returns {string|null}
 */
function computeNextSemiMonthly(item, from) {
  const rule = item.recurrenceRule || {};
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) =>
    dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());

  if (rule.type === 'days_of_month' && Array.isArray(rule.days) && rule.days.length) {
    const sorted = [...rule.days].sort((a, b) => a - b);
    const todayDom = from.getDate();
    for (const dom of sorted) {
      if (dom > todayDom) {
        const d = new Date(from.getFullYear(), from.getMonth(), dom);
        return fmt(d);
      }
    }
    const d = new Date(from.getFullYear(), from.getMonth() + 1, sorted[0]);
    return fmt(d);
  }

  if (rule.type === 'every_n_days' && rule.intervalDays) {
    const d = new Date(from);
    d.setDate(d.getDate() + Number(rule.intervalDays));
    return fmt(d);
  }

  const d = new Date(from);
  d.setDate(d.getDate() + 15);
  return fmt(d);
}
