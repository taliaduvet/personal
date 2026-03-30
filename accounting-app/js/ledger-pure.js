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
  const reIso = /^\d{4}-\d{2}-\d{2}$/;
  if (reIso.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const [a, b, c] = s.split(/[/-]/).map(Number);
  if (a > 31 && b <= 12 && c <= 31) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
  if (c > 31 && a <= 12 && b <= 31) return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
  if (a <= 31 && b <= 12) return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  return s;
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
