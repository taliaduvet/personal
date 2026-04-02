/**
 * Bank CSV amount parsing and income/expense heuristics (browser + Vitest via global).
 * Load before app.js — same pattern as js/parse-csv.js (no ES modules on static hosts).
 */
(function (global) {
  'use strict';

  function parseBankCsvMoneyCents(raw) {
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

  function signedCentsFromBankRow(row, amountCol, debitCol, creditCol) {
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

  function descriptionLooksLikeIncome(description) {
    const d = String(description || '');
    return INCOME_DESC_HINTS.some(function (re) {
      return re.test(d);
    });
  }

  function guessBankEntryType(signedCents, description, sug, batchHasNegative) {
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

  global.LedgerBankAmount = {
    parseBankCsvMoneyCents: parseBankCsvMoneyCents,
    signedCentsFromBankRow: signedCentsFromBankRow,
    guessBankEntryType: guessBankEntryType,
    descriptionLooksLikeIncome: descriptionLooksLikeIncome
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
