import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, INCOME_TYPES, categoryDisplayLabel } from '../ledger-constants.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm } from '../ui-helpers.js';
import { guessVendorFromBankDescription, normalizeDate, suggestFromRules, centsToDollars } from '../ledger-pure.js';

export function createBankPanel(deps) {
  const {
    acctApi,
    normalizeIncomeTypeForDb,
    initCategoryPicker,
    signedCentsFromBankRow,
    guessBankEntryType,
    incomeListRender,
    expenseListRender,
    renderDashboard
  } = deps;
  // --- Bank CSV import & reconciliation ---

  let bankParsedRows = [];
  let bankRules = [];
  let bankReviewRows = [];

  function normalizeRulePattern(description) {
    const vendor = guessVendorFromBankDescription(description) || description || '';
    return String(vendor)
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  }

  function parseBankMoneyToCents(value) {
    const n = parseFloat(String(value == null ? '' : value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }

  function toBankMoney(cents) {
    return (Number(cents || 0) / 100).toFixed(2);
  }

  function parseCsv(text) {
    if (!window.LedgerParseCsv || typeof window.LedgerParseCsv.parseCsv !== 'function') {
      console.warn('LedgerParseCsv not loaded; install js/parse-csv.js before app.js');
      return { headers: [], rows: [] };
    }
    return window.LedgerParseCsv.parseCsv(text);
  }

  function onBankFileChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers, rows } = parseCsv(ev.target.result);
    bankParsedRows = rows;
      if (!headers.length || !rows.length) {
        showAppToast('Could not parse CSV. Make sure it has a header row.', true);
        return;
      }
      showBankMapping(headers, file.name);
    };
    reader.readAsText(file);
  }

  function guessHeader(headers, needle) {
    const lower = needle.toLowerCase();
    return headers.find(h => h.toLowerCase().includes(lower)) || '';
  }

  function isValidIsoDate(d) {
    if (d == null || String(d).trim() === '') return false;
    const s = String(d).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const t = Date.parse(s + 'T12:00:00');
    return !Number.isNaN(t);
  }

  function showBankMapping(headers, fileName) {
    const wrap = document.getElementById('bank-mapping');
    if (!wrap) return;
    const dateGuess = guessHeader(headers, 'date');
    const descGuess = guessHeader(headers, 'description') || guessHeader(headers, 'details');
    const amountGuess = guessHeader(headers, 'amount');
    const debitGuess = guessHeader(headers, 'debit') || guessHeader(headers, 'withdrawal');
    const creditGuess = guessHeader(headers, 'credit') || guessHeader(headers, 'deposit');
    const optionsHtml = headers.map(h => `<option value="${escapeHtmlAttr(h)}">${escapeHtml(h)}</option>`).join('');
    wrap.style.display = 'block';
    wrap.innerHTML = `
      <label>Map columns for ${escapeHtml(fileName)}</label>
      <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:0.5rem;">
        <div><span style="font-size:0.85rem;color:var(--muted);">Date column</span><br>
          <select id="bank-col-date">
            <option value="">-- choose --</option>${optionsHtml}
          </select>
        </div>
        <div><span style="font-size:0.85rem;color:var(--muted);">Description column</span><br>
          <select id="bank-col-desc">
            <option value="">-- choose --</option>${optionsHtml}
          </select>
        </div>
        <div><span style="font-size:0.85rem;color:var(--muted);">Amount (signed or one column)</span><br>
          <select id="bank-col-amount">
            <option value="">-- optional if Debit/Credit --</option>${optionsHtml}
          </select>
        </div>
        <div><span style="font-size:0.85rem;color:var(--muted);">Debit (money out)</span><br>
          <select id="bank-col-debit">
            <option value="">-- optional --</option>${optionsHtml}
          </select>
        </div>
        <div><span style="font-size:0.85rem;color:var(--muted);">Credit (money in)</span><br>
          <select id="bank-col-credit">
            <option value="">-- optional --</option>${optionsHtml}
          </select>
        </div>
        <div style="align-self:flex-end;">
          <button type="button" class="btn btn-primary" id="bank-import-btn">Import</button>
        </div>
      </div>
      <p class="hint" style="margin-top:0.5rem">If your file has a single <strong>Amount</strong> column (positive or negative), map that and set <strong>Debit</strong>/<strong>Credit</strong> back to “optional” unless you truly use two amount columns—otherwise import can see every line as $0. Parentheses like (50.00) and trailing CR/DR are understood.</p>
    `;
    if (dateGuess) document.getElementById('bank-col-date').value = dateGuess;
    if (descGuess) document.getElementById('bank-col-desc').value = descGuess;
    if (amountGuess) document.getElementById('bank-col-amount').value = amountGuess;
    if (debitGuess) document.getElementById('bank-col-debit').value = debitGuess;
    if (creditGuess) document.getElementById('bank-col-credit').value = creditGuess;
    document.getElementById('bank-import-btn').addEventListener('click', importBankMapped);
  }

  function bankDedupKey(date, description, amount_cents) {
    const d = (date || '').toString().trim();
    const desc = (description || '').toString().trim();
    return d + '|' + desc + '|' + Number(amount_cents);
  }

  async function importBankMapped() {
    const dateCol = document.getElementById('bank-col-date').value;
    const descCol = document.getElementById('bank-col-desc').value;
    const amountCol = document.getElementById('bank-col-amount').value;
    const debitCol = document.getElementById('bank-col-debit').value;
    const creditCol = document.getElementById('bank-col-credit').value;
    if (!dateCol || !descCol) {
      showAppToast('Please choose date and description columns.', true);
      return;
    }
    if (!amountCol && !debitCol && !creditCol) {
      showAppToast('Choose an Amount column, or at least one of Debit / Credit.', true);
      return;
    }
    const source = document.getElementById('bank-file')?.files[0];
    const sourceName = source ? source.name : null;
    const mapped = bankParsedRows.map(function (r) {
      const amount_cents = signedCentsFromBankRow(r, amountCol, debitCol, creditCol);
      const dateNorm = normalizeDate(r[dateCol]);
      const descVal = r[descCol];
      const description = descVal != null ? String(descVal).trim() : '';
      return {
        date: dateNorm,
        description: description,
        amount_cents,
        source_file_name: sourceName
      };
    });
    const rows = mapped.filter(function (r) {
      return r.date && String(r.date).trim() && r.description && r.amount_cents !== 0;
    });
    if (rows.length === 0 && bankParsedRows.length > 0) {
      const noDate = mapped.filter(function (r) { return !r.date || !String(r.date).trim(); }).length;
      const noDesc = mapped.filter(function (r) { return !r.description; }).length;
      const zeroAmt = mapped.filter(function (r) { return r.amount_cents === 0; }).length;
      showAppToast(
        'No importable rows after mapping. CSV has ' + bankParsedRows.length + ' data row(s). ' +
        'Try clearing wrong Debit/Credit picks if you use an Amount column. ' +
        'Skipped: ' + zeroAmt + ' with $0, ' + noDate + ' missing date, ' + noDesc + ' missing description.',
        true
      );
      return;
    }
    const badDates = rows.filter(r => !isValidIsoDate(r.date));
    if (badDates.length > 0) {
      showAppToast('Import cancelled: ' + badDates.length + ' row(s) have dates that could not be parsed as YYYY-MM-DD. Fix the CSV or date mapping.', true);
      return;
    }
    const existingRes = await acctApi.bankListKeysForDedup();
    if (existingRes.error) { showAppToast(existingRes.error.message || 'Could not check for duplicates', true); return; }
    const existingKeys = new Set((existingRes.data || []).map(t => bankDedupKey(t.date, t.description, t.amount_cents)));
    const toInsert = rows.filter(r => !existingKeys.has(bankDedupKey(r.date, r.description, r.amount_cents)));
    const skipped = rows.length - toInsert.length;
    if (toInsert.length === 0) {
      showAppToast('All ' + rows.length + ' parsed row(s) are already in your bank list (same date, description, and amount). Nothing new imported.', true);
      document.getElementById('bank-mapping').style.display = 'none';
      document.getElementById('bank-file').value = '';
      bankParsedRows = [];
      loadBankReconcile();
      return;
    }
    const { error } = await acctApi.bankInsertMany(toInsert);
    if (error) { showAppToast(error.message || 'Import failed', true); return; }
    document.getElementById('bank-mapping').style.display = 'none';
    document.getElementById('bank-file').value = '';
    bankParsedRows = [];
    loadBankReconcile();
    if (skipped > 0) {
      showAppToast('Imported ' + toInsert.length + ' new transactions. Skipped ' + skipped + ' duplicate(s) already in your ledger.', true);
    }
  }

  async function loadBankReconcile() {
    const wrap = document.getElementById('bank-reconcile');
    if (!wrap) return;
    wrap.innerHTML = '<p class="empty-state">Loading…</p>';
    const [bankRes, rulesRes, plannedRes] = await Promise.all([acctApi.bankListUnreconciled(), acctApi.rulesList(), acctApi.plannedList()]);
    const error = bankRes.error || rulesRes.error;
    if (error) { wrap.innerHTML = '<p class="empty-state">Could not load.</p>'; return; }
    bankRules = rulesRes.data || [];
    const planned = plannedRes.data || [];
    const plannedExpenseOpts = planned.filter(p => p.type === 'expense').map(p => `<option value="${escapeHtmlAttr(p.id)}">${escapeHtml(p.label)} ($${centsToDollars(p.amount_cents)})</option>`).join('');
    const plannedIncomeOpts = planned.filter(p => p.type === 'income').map(p => `<option value="${escapeHtmlAttr(p.id)}">${escapeHtml(p.label)} ($${centsToDollars(p.amount_cents)})</option>`).join('');
    const all = bankRes.data || [];
    const unreconciled = all.filter(tx => !tx.acct_reconciliation || tx.acct_reconciliation.length === 0);
    if (!unreconciled.length) { wrap.innerHTML = '<p class="empty-state">No unreconciled transactions. Import a CSV or you’re fully reconciled.</p>'; return; }
    const batchHasNegative = unreconciled.some(function (tx) {
      return Number(tx.amount_cents) < 0;
    });
    bankReviewRows = unreconciled.map(tx => {
      const amt = Number(tx.amount_cents || 0);
      const abs = Math.abs(amt);
      const sug = suggestFromRules(tx.description, bankRules);
      return {
        id: tx.id,
        sourceFileName: tx.source_file_name || '',
        description: tx.description || '',
        date: tx.date,
        amountCents: abs,
        txSignedCents: amt,
        entryType: guessBankEntryType(amt, tx.description, sug, batchHasNegative),
        categoryId: sug.categoryId || '9270',
        incomeType: normalizeIncomeTypeForDb(sug.incomeType != null ? sug.incomeType : 'other'),
        plannedExpenseId: '',
        plannedIncomeId: '',
        include: false,
        bulkPick: false,
        status: 'pending',
        statusMessage: '',
        receiptFile: null
      };
    });

    function touchBankRow(state, rowEl) {
      state.include = true;
      if (rowEl) {
        const inc = rowEl.querySelector('.bank-row-include');
        if (inc) inc.checked = true;
      }
    }

    function renderBankReview() {
      const bulkIncomeOpts = INCOME_TYPES.map(t => `<option value="${escapeHtmlAttr(t.id)}">${escapeHtml(t.label)}</option>`).join('');
      const bulkBarHtml = `
        <div class="bank-bulk-edit-bar">
          <span class="bank-bulk-edit-title">Bulk edit</span>
          <span id="bank-bulk-count" class="muted"></span>
          <label class="bank-bulk-field">Type
            <select id="bank-bulk-entry-type">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label class="bank-bulk-field bank-bulk-field-expense" id="bank-bulk-cat-label">Category
            <div id="bank-bulk-category-wrap" class="category-picker-wrap"><input type="hidden" id="bank-bulk-category-value" value="9270"><input type="text" id="bank-bulk-category-input" class="category-picker-input" placeholder="Search categories..." value="${escapeHtmlAttr(categoryDisplayLabel(T2125_CATEGORIES.find(c => c.id === '9270')))}" autocomplete="off"><ul class="category-picker-list" aria-hidden="true"></ul></div>
          </label>
          <label class="bank-bulk-field bank-bulk-field-income" id="bank-bulk-inc-label" style="display:none">Income type
            <select id="bank-bulk-income-type"><option value="">— keep each row’s type</option>${bulkIncomeOpts}</select>
          </label>
          <button type="button" id="bank-bulk-apply-btn" class="btn btn-primary">Apply to bulk-selected rows</button>
          <button type="button" id="bank-bulk-select-all-btn" class="btn btn-secondary">Bulk-select all</button>
          <button type="button" id="bank-bulk-clear-btn" class="btn btn-secondary">Clear bulk selection</button>
        </div>`;
      const rowsHtml = bankReviewRows.map(function (r) {
        const dateBad = !isValidIsoDate(r.date);
        const statusCls = r.status === 'success' ? ' bank-row-success' : (r.status === 'error' ? ' bank-row-error' : '');
        const rowClass = 'bank-row' + (dateBad ? ' bank-row-invalid' : '') + statusCls;
        const incomeTypeOptions = INCOME_TYPES.map(t => `<option value="${escapeHtmlAttr(t.id)}" ${t.id === r.incomeType ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
        const statusLine = r.statusMessage ? `<div class="bank-row-status">${escapeHtml(r.statusMessage)}</div>` : '';
        return `<div class="${rowClass}" data-id="${escapeHtmlAttr(r.id)}">
          <div class="bank-row-main">
            <div class="bank-row-ledges">
              <label class="bank-include-toggle"><input type="checkbox" class="bank-row-include" ${r.include ? 'checked' : ''}> Include</label>
              <label class="bank-bulk-toggle" title="Select for bulk type/category changes"><input type="checkbox" class="bank-row-bulk" ${r.bulkPick ? 'checked' : ''}> Bulk</label>
            </div>
            <div>
              <div class="meta">${escapeHtml(r.description || '—')}</div>
              <div class="meta" style="font-size:0.8rem;">Source: ${escapeHtml(r.sourceFileName || '—')}</div>
            </div>
            <div class="amount ${r.txSignedCents >= 0 ? 'positive' : 'negative'}">${r.txSignedCents >= 0 ? '+' : '-'}$${centsToDollars(Math.abs(r.txSignedCents))}</div>
          </div>
          <div class="bank-row-edit-grid">
            <label>Type
              <select class="bank-row-entry-type">
                <option value="expense" ${r.entryType === 'expense' ? 'selected' : ''}>Expense</option>
                <option value="income" ${r.entryType === 'income' ? 'selected' : ''}>Income</option>
              </select>
            </label>
            <label>Date
              <input type="date" class="bank-row-date" value="${escapeHtmlAttr(r.date || '')}">
            </label>
            <label>Amount to record ($)
              <input type="number" step="0.01" min="0" class="bank-row-amount-record" value="${toBankMoney(r.amountCents)}">
            </label>
            <label class="bank-field-expense ${r.entryType === 'expense' ? '' : 'hidden'}">Category
              <div class="bank-row-category-wrap category-picker-wrap"><input type="hidden" class="bank-row-category-value" value="${escapeHtmlAttr(r.categoryId)}"><input type="text" class="category-picker-input" placeholder="Search categories..." value="${escapeHtmlAttr(categoryDisplayLabel(T2125_CATEGORIES.find(c => c.id === r.categoryId)))}" autocomplete="off"><ul class="category-picker-list" aria-hidden="true"></ul></div>
            </label>
            <label class="bank-field-income ${r.entryType === 'income' ? '' : 'hidden'}">Income type
              <select class="bank-row-income-type"><option value="">—</option>${incomeTypeOptions}</select>
            </label>
            <label class="bank-field-expense ${r.entryType === 'expense' ? '' : 'hidden'}">Planned expense
              <select class="bank-row-planned-expense"><option value="">—</option>${plannedExpenseOpts}</select>
            </label>
            <label class="bank-field-income ${r.entryType === 'income' ? '' : 'hidden'}">Planned income
              <select class="bank-row-planned-income"><option value="">—</option>${plannedIncomeOpts}</select>
            </label>
            <label class="bank-field-expense bank-field-receipt ${r.entryType === 'expense' ? '' : 'hidden'}"><span class="bank-receipt-label-text">Receipt (optional)</span>
              <input type="file" class="bank-row-receipt" accept="image/*,application/pdf">
            </label>
          </div>
          ${dateBad ? '<div class="bank-row-warn" role="status">Date is invalid. Fix before submit.</div>' : ''}
          ${statusLine}
        </div>`;
      }).join('');
      wrap.innerHTML = `
        <div class="bank-bulk-actions">
          <button type="button" id="bank-submit-all-btn" class="btn btn-primary">Submit all included</button>
          <button type="button" id="bank-ignore-unselected-btn" class="btn btn-secondary">Delete rows not included</button>
        </div>
        ${bulkBarHtml}
        ${rowsHtml}
      `;
      function updateBulkCount() {
        const n = bankReviewRows.filter(function (r) { return r.bulkPick; }).length;
        const el = document.getElementById('bank-bulk-count');
        if (el) el.textContent = n ? '(' + n + ' bulk-selected)' : '(no bulk selection)';
      }
      wrap.querySelectorAll('.bank-row-category-wrap').forEach(w => initCategoryPicker(w));
      initCategoryPicker(document.getElementById('bank-bulk-category-wrap'));
      const bulkTypeEl = document.getElementById('bank-bulk-entry-type');
      function syncBulkBarVisibility() {
        const isInc = bulkTypeEl && bulkTypeEl.value === 'income';
        const catL = document.getElementById('bank-bulk-cat-label');
        const incL = document.getElementById('bank-bulk-inc-label');
        if (catL) catL.style.display = isInc ? 'none' : '';
        if (incL) incL.style.display = isInc ? '' : 'none';
      }
      if (bulkTypeEl) bulkTypeEl.addEventListener('change', syncBulkBarVisibility);
      syncBulkBarVisibility();
      wrap.querySelectorAll('.bank-row').forEach(function (rowEl) {
        const id = rowEl.getAttribute('data-id');
        const state = bankReviewRows.find(r => r.id === id);
        if (!state) return;
        const includeEl = rowEl.querySelector('.bank-row-include');
        const bulkEl = rowEl.querySelector('.bank-row-bulk');
        const entryEl = rowEl.querySelector('.bank-row-entry-type');
        const dateEl = rowEl.querySelector('.bank-row-date');
        const amountEl = rowEl.querySelector('.bank-row-amount-record');
        const catEl = rowEl.querySelector('.bank-row-category-value');
        const typeEl = rowEl.querySelector('.bank-row-income-type');
        const pExpEl = rowEl.querySelector('.bank-row-planned-expense');
        const pIncEl = rowEl.querySelector('.bank-row-planned-income');
        const receiptEl = rowEl.querySelector('.bank-row-receipt');
        const catWrap = rowEl.querySelector('.bank-row-category-wrap');
        if (includeEl) includeEl.addEventListener('change', function () { state.include = !!includeEl.checked; });
        if (bulkEl) bulkEl.addEventListener('change', function () { state.bulkPick = !!bulkEl.checked; updateBulkCount(); });
        if (entryEl) entryEl.addEventListener('change', function () {
          touchBankRow(state, rowEl);
          state.entryType = entryEl.value === 'expense' ? 'expense' : 'income';
          renderBankReview();
        });
        if (dateEl) {
          dateEl.addEventListener('change', function () { state.date = dateEl.value || ''; touchBankRow(state, rowEl); });
          dateEl.addEventListener('input', function () { touchBankRow(state, rowEl); });
        }
        if (amountEl) {
          amountEl.addEventListener('change', function () { state.amountCents = Math.max(0, parseBankMoneyToCents(amountEl.value)); touchBankRow(state, rowEl); });
          amountEl.addEventListener('input', function () { touchBankRow(state, rowEl); });
        }
        if (catEl) catEl.addEventListener('change', function () { state.categoryId = catEl.value || '9270'; touchBankRow(state, rowEl); });
        if (catWrap) {
          catWrap.addEventListener('click', function (e) {
            if (e.target.closest('.category-picker-list li')) touchBankRow(state, rowEl);
          });
          const catIn = catWrap.querySelector('.category-picker-input');
          if (catIn) catIn.addEventListener('input', function () { touchBankRow(state, rowEl); });
        }
        if (typeEl) typeEl.addEventListener('change', function () { state.incomeType = normalizeIncomeTypeForDb(typeEl.value); touchBankRow(state, rowEl); });
        if (pExpEl) pExpEl.addEventListener('change', function () { state.plannedExpenseId = pExpEl.value || ''; touchBankRow(state, rowEl); });
        if (pIncEl) pIncEl.addEventListener('change', function () { state.plannedIncomeId = pIncEl.value || ''; touchBankRow(state, rowEl); });
        if (receiptEl) receiptEl.addEventListener('change', function () { state.receiptFile = receiptEl.files && receiptEl.files[0] ? receiptEl.files[0] : null; touchBankRow(state, rowEl); });
      });
      document.getElementById('bank-bulk-apply-btn')?.addEventListener('click', function () {
        const pick = bankReviewRows.filter(function (r) { return r.bulkPick; });
        if (!pick.length) { showAppToast('Tick Bulk on one or more rows first.', true); return; }
        const t = document.getElementById('bank-bulk-entry-type')?.value || 'expense';
        const catVal = document.getElementById('bank-bulk-category-value')?.value;
        const incVal = document.getElementById('bank-bulk-income-type')?.value;
        pick.forEach(function (state) {
          state.entryType = t === 'income' ? 'income' : 'expense';
          if (state.entryType === 'expense' && catVal) state.categoryId = catVal;
          if (state.entryType === 'income' && incVal) state.incomeType = normalizeIncomeTypeForDb(incVal);
        });
        showAppToast('Updated ' + pick.length + ' row(s).', false);
        renderBankReview();
      });
      document.getElementById('bank-bulk-select-all-btn')?.addEventListener('click', function () {
        bankReviewRows.forEach(function (r) { r.bulkPick = true; });
        renderBankReview();
      });
      document.getElementById('bank-bulk-clear-btn')?.addEventListener('click', function () {
        bankReviewRows.forEach(function (r) { r.bulkPick = false; });
        renderBankReview();
      });
      document.getElementById('bank-submit-all-btn')?.addEventListener('click', onBankSubmitAll);
      document.getElementById('bank-ignore-unselected-btn')?.addEventListener('click', onBankIgnoreUnselected);
      updateBulkCount();
    }

    async function ensureAutoRule(state) {
      const pattern = normalizeRulePattern(state.description);
      if (!pattern) return;
      const existing = bankRules.find(function (r) {
        const samePattern = String(r.pattern || '').toUpperCase().trim() === pattern;
        if (!samePattern) return false;
        return state.entryType === 'expense'
          ? (r.entry_type === 'expense' && String(r.category_id || '') === String(state.categoryId || ''))
          : (r.entry_type === 'income' && String(r.income_type || '') === String(state.incomeType || 'other'));
      });
      if (existing) return;
      const payload = state.entryType === 'expense'
        ? { pattern_type: 'contains', pattern, entry_type: 'expense', category_id: state.categoryId || '9270' }
        : { pattern_type: 'contains', pattern, entry_type: 'income', income_type: normalizeIncomeTypeForDb(state.incomeType) };
      const res = await acctApi.rulesInsert(payload);
      if (!res.error) bankRules.unshift(res.data || payload);
    }

    async function processBankRow(state) {
      if (!state.include) return;
      if (state.status === 'success') return;
      state.status = 'pending';
      state.statusMessage = '';
      if (!isValidIsoDate(state.date)) {
        state.status = 'error';
        state.statusMessage = 'Invalid date';
        return;
      }
      if (!state.amountCents || state.amountCents <= 0) {
        state.status = 'error';
        state.statusMessage = 'Amount must be greater than 0';
        return;
      }
      if (state.entryType === 'expense') {
        const expRow = {
          date: state.date,
          amount_cents: state.amountCents,
          gst_cents: 0,
          category: state.categoryId || '9270',
          vendor: guessVendorFromBankDescription(state.description),
          note: state.description || null
        };
        if (state.amountCents < Math.abs(state.txSignedCents)) expRow.total_payment_cents = Math.abs(state.txSignedCents);
        if (state.plannedExpenseId) expRow.planned_id = state.plannedExpenseId;
        const expRes = await acctApi.expensesInsert(expRow);
        if (expRes.error || !expRes.data?.id) {
          state.status = 'error';
          state.statusMessage = apiErrorMessage(expRes.error || 'Could not create expense');
          return;
        }
        const recRes = await acctApi.createReconciliation(state.id, null, expRes.data.id);
        if (recRes.error) {
          state.status = 'error';
          state.statusMessage = apiErrorMessage(recRes.error || 'Could not reconcile expense');
          return;
        }
        if (state.receiptFile) {
          const upRes = await acctApi.uploadReceipt(expRes.data.id, state.receiptFile);
          if (upRes.error) {
            state.status = 'error';
            state.statusMessage = 'Expense saved, receipt upload failed: ' + apiErrorMessage(upRes.error);
            return;
          }
        }
      } else {
        const incRow = {
          date: state.date,
          amount_cents: state.amountCents,
          gst_cents: 0,
          vendor: guessVendorFromBankDescription(state.description),
          client_or_project: null,
          income_type: normalizeIncomeTypeForDb(state.incomeType),
          note: state.description || null
        };
        if (state.plannedIncomeId) incRow.planned_id = state.plannedIncomeId;
        const incRes = await acctApi.incomeInsert(incRow);
        if (incRes.error || !incRes.data?.id) {
          state.status = 'error';
          state.statusMessage = apiErrorMessage(incRes.error || 'Could not create income');
          return;
        }
        const recRes = await acctApi.createReconciliation(state.id, incRes.data.id, null);
        if (recRes.error) {
          state.status = 'error';
          state.statusMessage = apiErrorMessage(recRes.error || 'Could not reconcile income');
          return;
        }
      }
      await ensureAutoRule(state);
      state.status = 'success';
      state.statusMessage = 'Saved';
    }

    async function onBankSubmitAll() {
      const selected = bankReviewRows.filter(r => r.include);
      if (!selected.length) {
        showAppToast('Include at least one row (check Include after editing), or nothing will be submitted.', true);
        return;
      }
      const submitBtn = document.getElementById('bank-submit-all-btn');
      if (submitBtn) submitBtn.disabled = true;
      try {
        for (const row of selected) {
          await processBankRow(row);
        }
        const ok = selected.filter(r => r.status === 'success').length;
        const fail = selected.length - ok;
        showAppToast('Processed ' + ok + ' row(s).' + (fail ? ' ' + fail + ' failed.' : ''), fail > 0);
        if (ok > 0) {
          incomeListRender();
          expenseListRender();
          renderDashboard();
          await loadBankReconcile();
        } else {
          renderBankReview();
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    async function onBankIgnoreUnselected() {
      const ids = bankReviewRows.filter(r => !r.include).map(r => r.id);
      if (!ids.length) {
        showAppToast('Every row is checked Include, or there is nothing to remove.', true);
        return;
      }
      const btn = document.getElementById('bank-ignore-unselected-btn');
      const msg =
        'Permanently delete ' + ids.length + ' imported bank line(s) that are not checked Include? ' +
        'This removes them from the Bank queue only (not income/expenses you already posted).';
      showInlineConfirm(btn, msg, async () => {
        if (btn) btn.disabled = true;
        try {
          const { error } = await acctApi.bankDeleteMany(ids);
          if (error) {
            showAppToast(apiErrorMessage(error) || 'Could not delete bank lines', true);
            return;
          }
          showAppToast('Removed ' + ids.length + ' bank import line(s).', false);
          await loadBankReconcile();
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    renderBankReview();
  }

  async function onBankIgnore(id, skipConfirm, triggerEl) {
    const run = async () => {
      const { error } = await acctApi.bankDeleteMany([id]);
      if (error) { showAppToast(apiErrorMessage(error) || 'Could not delete', true); return; }
      loadBankReconcile();
    };
    if (!skipConfirm) {
      const el = triggerEl || document.getElementById('bank-reconcile');
      showInlineConfirm(el, 'Delete this imported bank line from the queue?', () => { void run(); });
      return;
    }
    await run();
  }

  return {
    onBankFileChosen,
    loadBankReconcile,
    onBankIgnore
  };
}
