/**
 * Pure helpers mirrored from app.js for Vitest. When changing rules here, sync app.js (or extract shared module later).
 * income_type enum must match supabase-accounting-schema.sql (acct_income.income_type check).
 */

export function guessVendorFromBankDescription(desc) {
  if (!desc || !String(desc).trim()) return null;
  const s = String(desc).trim();
  const star = s.indexOf('*');
  if (star > 0) {
    const v = s.slice(0, star).trim();
    return v || null;
  }
  return s.length > 55 ? s.slice(0, 55).trim() : s;
}

export function normalizeDate(str) {
  if (!str) return '';
  const s = String(str).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const isoWithTime = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoWithTime) return isoWithTime[1];

  // Two-digit years are ambiguous (e.g. 04/05/06); reject rather than guess wrong.
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2}$/.test(s)) {
    return '';
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  const parts = s.split(/[/\-.]/).map(p => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 31 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    }
    if (c > 31 && a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    }
    if (c > 31 && b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
  }

  return '';
}

export function suggestFromRules(description, rules) {
  if (!description || !rules.length) return { entryType: null, categoryId: '9270', incomeType: null, gstEligible: false };
  const desc = String(description).toUpperCase();
  const matched = rules
    .filter(r => {
      const p = (r.pattern || '').toUpperCase();
      if (r.pattern_type === 'exact') return desc === p;
      return desc.includes(p);
    })
    .sort((a, b) => (b.pattern || '').length - (a.pattern || '').length);
  const r = matched[0];
  if (!r) return { entryType: null, categoryId: '9270', incomeType: null, gstEligible: false };
  return {
    entryType: r.entry_type || null,
    categoryId: r.category_id || '9270',
    incomeType: r.income_type || null,
    gstEligible: !!r.gst_eligible
  };
}

/**
 * Calculates the expected amount of a planned recurring item within a date range.
 * @param {{ amount_cents: number, frequency: string }} p
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @returns {number} amount in cents
 */
export function plannedAmountInPeriod(p, from, to) {
  const fromD = new Date(from + 'T00:00:00');
  const toD = new Date(to + 'T00:00:00');
  const days = Math.max(0, Math.round((toD - fromD) / (24 * 60 * 60 * 1000))) + 1;
  const months = (toD.getFullYear() - fromD.getFullYear()) * 12
    + (toD.getMonth() - fromD.getMonth()) + 1;
  const freq = p.frequency || 'monthly';
  let count = 1;
  if (freq === 'weekly') count = days / 7;
  else if (freq === 'biweekly') count = days / 14;
  else if (freq === 'monthly') count = Math.max(1, months);
  else if (freq === 'yearly') count = months / 12;
  return Math.round(Number(p.amount_cents) * count);
}

export function toCents(val) {
  const n = parseFloat(String(val === null || val === undefined ? '' : val).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollars(c) {
  if (c === null || c === undefined) return '0.00';
  return (Number(c) / 100).toFixed(2);
}
