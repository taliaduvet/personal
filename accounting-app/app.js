import { apiErrorMessage } from './js/ledger-api-helpers.js';
import {
  T2125_CATEGORIES,
  INCOME_TYPES,
  INCOME_TYPE_IDS,
  categoryDisplayLabel
} from './js/ledger-constants.js';
import { showAppToast } from './js/ui-helpers.js';
import {
  guessVendorFromBankDescription,
  normalizeDate,
  suggestFromRules,
  toCents
} from './js/ledger-pure.js';

import { createBudgetPanel } from './js/panels/budget.js';
import { createDashboardPanel } from './js/panels/dashboard.js';
import { createIncomeExpensePanel } from './js/panels/income-expense.js';
import { createBankPanel } from './js/panels/bank.js';
import { createReportsPanel } from './js/panels/reports.js';
import { createGfPanel } from './js/panels/gf.js';

const acctApi = window.acctApi;
const gfApi = window.gfApi;

/** Bank CSV money + income/expense defaults (inlined so GitHub Pages only needs app.js + parse-csv). Vitest: keep in sync with js/ledger-bank.js */
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

/** Prefer a non-empty Amount cell when mapped — auto-guessed Debit/Credit columns are often wrong and would mask Amount. */
function signedCentsFromBankRow(row, amountCol, debitCol, creditCol) {
  const amountCell = amountCol != null ? row[amountCol] : null;
  const amountStr = amountCell != null ? String(amountCell).trim() : '';
  if (amountStr !== '') {
    return parseBankCsvMoneyCents(amountCell);
  }
  if (debitCol || creditCol) {
    const debit = debitCol ? parseBankCsvMoneyCents(row[debitCol]) : 0;
    const credit = creditCol ? parseBankCsvMoneyCents(row[creditCol]) : 0;
    return credit - debit;
  }
  if (amountCol) {
    return parseBankCsvMoneyCents(row[amountCol]);
  }
  return 0;
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

function incomeLineMeta(r) {
  const typeLabel = INCOME_TYPES.find(t => t.id === r.income_type)?.label || r.income_type || '';
  const v = (r.vendor || '').trim();
  const c = (r.client_or_project || '').trim();
  const parts = [];
  if (v) parts.push(v);
  if (c) parts.push(c);
  if (typeLabel) parts.push(typeLabel);
  return parts.length ? parts.join(' · ') : '—';
}

function expenseLineMeta(r) {
  const cat = T2125_CATEGORIES.find(c => c.id === r.category);
  const catStr = cat ? categoryDisplayLabel(cat) : r.category;
  const v = (r.vendor || '').trim();
  return v ? `${v} · ${catStr}` : catStr;
}

/** Must match Supabase acct_income_income_type_check (bad values break bank submit). */
function normalizeIncomeTypeForDb(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return 'other';
  if (INCOME_TYPE_IDS.has(s)) return s;
  return 'other';
}

/** Default period: first day of current month through today (or last day of month). */
function getDefaultMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const from = `${y}-${m}-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const dashboard = createDashboardPanel({ acctApi, incomeLineMeta, expenseLineMeta, getDefaultMonth });
const incomeExpense = createIncomeExpensePanel({
  acctApi,
  normalizeIncomeTypeForDb,
  getDefaultMonth,
  renderDashboard: dashboard.renderDashboard,
  incomeLineMeta,
  expenseLineMeta
});
const budget = createBudgetPanel({ acctApi });
const reports = createReportsPanel({ acctApi });
const bank = createBankPanel({
  acctApi,
  normalizeIncomeTypeForDb,
  initCategoryPicker: incomeExpense.initCategoryPicker,
  signedCentsFromBankRow,
  guessBankEntryType,
  incomeListRender: incomeExpense.incomeListRender,
  expenseListRender: incomeExpense.expenseListRender,
  renderDashboard: dashboard.renderDashboard
});
const gf = createGfPanel({ gfApi });

const { renderDashboard } = dashboard;
const { renderBudgetPanel, buildPlannedTableRow } = budget;
const { runReport, initReportDates } = reports;
const {
  incomeListRender,
  expenseListRender,
  openIncomeForm,
  openExpenseForm
} = incomeExpense;
const { onBankFileChosen, loadBankReconcile } = bank;
const { loadGFPanel, initGFPanelListeners } = gf;

function setPanel(name) {
  try {
    sessionStorage.setItem('ledger_panel', name);
  } catch (_e) {}
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.remove('visible');
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const panel = document.getElementById('panel-' + name);
  const btn = document.querySelector('.tab-btn[data-panel="' + name + '"]');
  if (panel) panel.classList.add('visible');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  }
  if (name === 'reports') runReport();
  if (name === 'dashboard') renderDashboard();
  if (name === 'income') incomeListRender();
  if (name === 'expenses') expenseListRender();
  if (name === 'bank') loadBankReconcile();
  if (name === 'budget') renderBudgetPanel();
  if (name === 'gf') loadGFPanel();
}

function initAuth() {
  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  const userEmail = document.getElementById('user-email');

  function setLoggedIn(user, event) {
    if (user) {
      authScreen.style.display = 'none';
      mainApp.classList.add('visible');
      if (userEmail) userEmail.textContent = user.email;
      initReportDates();
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        return;
      }
      if (event === 'SIGNED_IN') {
        try {
          sessionStorage.setItem('ledger_panel', 'dashboard');
        } catch (_e) {}
        setPanel('dashboard');
        return;
      }
      let saved = 'dashboard';
      try {
        saved = sessionStorage.getItem('ledger_panel') || 'dashboard';
      } catch (_e) {}
      setPanel(saved);
    } else {
      authScreen.style.display = 'flex';
      mainApp.classList.remove('visible');
    }
  }

  const sb = acctApi.getClient();
  if (sb) {
    sb.auth.getSession().then(({ data: { session } }) => setLoggedIn(session?.user, undefined));
    acctApi.onAuthChange((event, session) => setLoggedIn(session?.user, event));
  }

  document.getElementById('auth-signin-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    if (!email || !password) {
      errEl.textContent = 'Email and password required';
      errEl.style.display = 'block';
      return;
    }
    const { error } = await acctApi.signIn(email, password);
    if (error) {
      const msg = typeof error === 'string'
        ? error
        : (error.message || error.error_description || 'Sign in failed');
      errEl.textContent = msg;
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
  });

  document.getElementById('auth-signup-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const errEl = document.getElementById('signup-error');
    if (!email || !password) {
      errEl.textContent = 'Email and password required';
      errEl.style.display = 'block';
      return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters';
      errEl.style.display = 'block';
      return;
    }
    const { error } = await acctApi.signUp(email, password);
    if (error) {
      const msg = typeof error === 'string'
        ? error
        : (error.message || error.error_description || 'Sign up failed');
      errEl.textContent = msg;
      errEl.style.display = 'block';
      return;
    }
    errEl.textContent = 'Check your email to confirm, then sign in.';
    errEl.style.display = 'block';
  });

  document.getElementById('auth-show-signup')?.addEventListener('click', () => {
    document.getElementById('auth-tab-signin').style.display = 'none';
    document.getElementById('auth-tab-signup').style.display = 'block';
  });
  document.getElementById('auth-show-signin')?.addEventListener('click', () => {
    document.getElementById('auth-tab-signup').style.display = 'none';
    document.getElementById('auth-tab-signin').style.display = 'block';
  });

  document.getElementById('signout-btn')?.addEventListener('click', () => {
    acctApi.signOut();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setPanel(btn.dataset.panel));
  });

  document.getElementById('dash-apply')?.addEventListener('click', () => renderDashboard());
  document.getElementById('income-add-btn')?.addEventListener('click', () => openIncomeForm());
  document.getElementById('income-apply')?.addEventListener('click', () => incomeListRender());
  document.getElementById('expense-add-btn')?.addEventListener('click', () => openExpenseForm());
  document.getElementById('expense-apply')?.addEventListener('click', () => expenseListRender());
  document.getElementById('report-apply')?.addEventListener('click', () => runReport());

  // Budget tab
  document.getElementById('budget-period')?.addEventListener('change', () => {
    const customRange = document.getElementById('budget-custom-range');
    if (customRange) customRange.style.display = document.getElementById('budget-period')?.value === 'custom' ? 'block' : 'none';
  });
  document.getElementById('budget-apply')?.addEventListener('click', () => renderBudgetPanel());
  document.getElementById('budget-add-row-btn')?.addEventListener('click', () => {
    const tbody = document.getElementById('budget-planned-tbody');
    if (tbody) tbody.insertAdjacentHTML('beforeend', buildPlannedTableRow(null));
  });
  document.getElementById('budget-save-planned-btn')?.addEventListener('click', () => {
    const tbody = document.getElementById('budget-planned-tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    const promises = [];
    for (const tr of rows) {
      const type = tr.querySelector('.planned-input-type')?.value || 'expense';
      const label = (tr.querySelector('.planned-input-label')?.value || '').trim();
      const amountVal = tr.querySelector('.planned-input-amount')?.value;
      const amount_cents = toCents(amountVal);
      const frequency = tr.querySelector('.planned-input-frequency')?.value || 'monthly';
      if (!label && amount_cents <= 0) continue;
      const row = { type, label, amount_cents, frequency };
      if (type === 'expense') {
        row.category = tr.querySelector('.planned-input-category')?.value || null;
        row.income_type = null;
        if (!row.category) { showAppToast('Category required for expense: ' + (label || 'unnamed'), true); return; }
      } else {
        row.category = null;
        row.income_type = tr.querySelector('.planned-input-income-type')?.value || null;
      }
      const id = tr.dataset.id;
      const isNew = tr.dataset.new === 'true';
      if (id) promises.push(acctApi.plannedUpdate(id, row));
      else if (isNew) promises.push(acctApi.plannedInsert(row));
    }
    Promise.all(promises).then((results) => {
      const failures = (results || []).filter(r => r && r.error);
      if (failures.length) {
        const extra = failures.length > 1 ? ' (' + (failures.length - 1) + ' more)' : '';
        showAppToast('Save incomplete: ' + (apiErrorMessage(failures[0].error) || 'Save failed') + extra, true);
      }
      renderBudgetPanel();
    });
  });

  // Bank tab
  document.getElementById('bank-file')?.addEventListener('change', onBankFileChosen);

  // GF tab
  initGFPanelListeners();
}

function getClient() {
  return window.acctApi?.getClient() || null;
}

if (typeof window !== 'undefined' && window.__LEDGER_TEST_MODE__) {
  window._ledgerTestExports = { normalizeDate, guessVendorFromBankDescription, suggestFromRules };
}

initAuth();
