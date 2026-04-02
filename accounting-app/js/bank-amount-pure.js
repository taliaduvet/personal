/**
 * Bank CSV amount parsing and income/expense heuristics (Vitest + app.js module import).
 */

export function parseBankCsvMoneyCents(raw) {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  let negate = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negate = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/,/g, '');
  const crdr = s.match(/^(.+?)\s+(CR|DR|DB)$/i);
  if (crdr) {
    s = crdr[1].trim();
    const t = crdr[2].toUpperCase();
    if (t === 'DR' || t === 'DB') negate = !negate;
  }
  const n = parseFloat(String(s).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return 0;
  let cents = Math.round(Math.abs(n) * 100);
  if (n < 0) negate = !negate;
  if (negate) cents = -cents;
  return cents;
}

/** Single amount column, or debit/credit pair (positive numbers = out / in). */
export function signedCentsFromBankRow(row, amountCol, debitCol, creditCol) {
  if (debitCol || creditCol) {
    const debit = debitCol ? parseBankCsvMoneyCents(row[debitCol]) : 0;
    const credit = creditCol ? parseBankCsvMoneyCents(row[creditCol]) : 0;
    return credit - debit;
  }
  if (!amountCol) return 0;
  return parseBankCsvMoneyCents(row[amountCol]);
}

const INCOME_DESC_HINTS = [
  /PAY\s*ROLL/i,
  /PAYROLL/i,
  /DIRECT\s*DEP/i,
  /DIR\.?\s*DEP/i,
  /DEPOSIT/i,
  /E[\s.-]*TRANSFER.*REC/i,
  /RECEIVED/i,
  /INTEREST(?!\s+CHARG)/i,
  /REFUND/i,
  /DIVIDEND/i,
  /WIRE\s*IN/i,
  /INCOMING/i,
  /CREDIT\s*MEMO/i
];

export function descriptionLooksLikeIncome(description) {
  const d = String(description || '');
  return INCOME_DESC_HINTS.some(function (re) {
    return re.test(d);
  });
}

/**
 * @param {number} signedCents — negative outflow / positive inflow when bank uses signed "Amount"
 * @param {object|null} sug — from suggestFromRules
 * @param {boolean} batchHasNegative — any tx in this batch has amount_cents < 0 (classic signed CSV)
 */
export function guessBankEntryType(signedCents, description, sug, batchHasNegative) {
  if (sug && sug.entryType) return sug.entryType;
  if (batchHasNegative) {
    if (signedCents < 0) return 'expense';
    if (signedCents > 0) return 'income';
    return 'expense';
  }
  if (signedCents < 0) return 'expense';
  if (signedCents > 0) {
    return descriptionLooksLikeIncome(description) ? 'income' : 'expense';
  }
  return 'expense';
}
