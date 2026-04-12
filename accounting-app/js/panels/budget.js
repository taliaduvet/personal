import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, INCOME_TYPES, categoryDisplayLabel } from '../ledger-constants.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm, formatDate } from '../ui-helpers.js';
import { plannedAmountInPeriod, toCents, centsToDollars } from '../ledger-pure.js';

export function createBudgetPanel(deps) {
  const { acctApi } = deps;
  function getBudgetPeriod() {
    const period = document.getElementById('budget-period')?.value;
    const now = new Date();
    let from, to;
    if (period === 'custom') {
      from = document.getElementById('budget-from')?.value;
      to = document.getElementById('budget-to')?.value;
      if (!from || !to) {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        from = `${y}-${m}-01`;
        to = new Date().toISOString().slice(0, 10);
      }
    } else {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      from = `${y}-${m}-01`;
      const lastDay = new Date(y, now.getMonth() + 1, 0);
      to = lastDay.toISOString().slice(0, 10);
    }
    return { from, to };
  }


  async function renderBudgetPanel() {
    const { from, to } = getBudgetPeriod();
    const cardEl = document.getElementById('budget-available-card');
    const plannedTbody = document.getElementById('budget-planned-tbody');
    const planVsActualEl = document.getElementById('budget-plan-vs-actual');
    const matchListEl = document.getElementById('budget-match-list');
    const categoryTableEl = document.getElementById('budget-category-table');
    if (!cardEl) return;

    const [plannedRes, incomeRes, expensesRes] = await Promise.all([
      acctApi.plannedList(),
      acctApi.incomeInRange(from, to),
      acctApi.expensesInRange(from, to)
    ]);
    if (plannedRes.error || incomeRes.error || expensesRes.error) {
      const err = plannedRes.error || incomeRes.error || expensesRes.error;
      const msg = 'Could not load budget data. ' + (apiErrorMessage(err) || 'Check your connection and try again.');
      console.error('renderBudgetPanel API error', plannedRes.error, incomeRes.error, expensesRes.error);
      if (cardEl) cardEl.innerHTML = '<p class="report-error" role="alert">' + escapeHtml(msg) + '</p>';
      if (planVsActualEl) planVsActualEl.innerHTML = '';
      if (matchListEl) matchListEl.innerHTML = '';
      if (categoryTableEl) categoryTableEl.innerHTML = '';
      return;
    }
    const planned = (plannedRes.data || []).filter(p => p.type && p.amount_cents != null);
    const income = incomeRes.data || [];
    const expenses = expensesRes.data || [];

    const plannedIncome = planned.filter(p => p.type === 'income');
    const plannedExpenses = planned.filter(p => p.type === 'expense');
    const plannedIncomeTotal = plannedIncome.reduce((s, p) => s + plannedAmountInPeriod(p, from, to), 0);
    const plannedExpenseTotal = plannedExpenses.reduce((s, p) => s + plannedAmountInPeriod(p, from, to), 0);
    const available = plannedIncomeTotal - plannedExpenseTotal;

    if (planned.length === 0) {
      cardEl.innerHTML = '<div class="budget-available-inner"><p class="empty-state">Add expected income and expenses below to see how much you have to spend.</p></div>';
    } else if (available >= 0) {
      cardEl.innerHTML = `<div class="budget-available-inner"><div class="budget-available-label">You have</div><div class="budget-available-value">$${centsToDollars(available)}</div><div class="budget-available-label">to spend this period</div></div>`;
    } else {
      cardEl.innerHTML = `<div class="budget-available-inner budget-available-negative"><div class="budget-available-label">Expected shortfall</div><div class="budget-available-value">$${centsToDollars(Math.abs(available))}</div><div class="budget-available-label">Over budget by $${centsToDollars(Math.abs(available))}</div></div>`;
    }

    if (plannedTbody) {
      plannedTbody.innerHTML = planned.length ? planned.map(p => buildPlannedTableRow(p)).join('') : '';
      if (!plannedTbody._plannedDelegationBound) {
        plannedTbody._plannedDelegationBound = true;
        plannedTbody.addEventListener('change', function (e) {
          if (!e.target.classList.contains('planned-input-type')) return;
          const tr = e.target.closest('tr');
          if (!tr) return;
          tr.dataset.type = e.target.value;
          const cat = tr.querySelector('.planned-input-category');
          const inc = tr.querySelector('.planned-input-income-type');
          if (cat) cat.style.display = e.target.value === 'income' ? 'none' : 'inline';
          if (inc) inc.style.display = e.target.value === 'income' ? 'inline' : 'none';
        });
          plannedTbody.addEventListener('click', function (e) {
            if (!e.target.classList.contains('planned-row-remove')) return;
            const tr = e.target.closest('tr');
            const id = tr?.dataset.id;
            if (id) {
              showInlineConfirm(e.target, 'Remove this planned item?', () => {
                acctApi.plannedDelete(id).then(() => renderBudgetPanel());
              });
            } else tr?.remove();
          });
      }
    }

    const actualIncomeTotal = income.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
    const actualExpenseTotal = expenses.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
    planVsActualEl.innerHTML = `
      <h3>Plan vs actual (${formatDate(from)} – ${formatDate(to)})</h3>
      <p class="hint">Planned amounts don't include GST; actuals do.</p>
      <div class="line"><span>Planned income</span><span>$${centsToDollars(plannedIncomeTotal)}</span></div>
      <div class="line"><span>Actual income</span><span>$${centsToDollars(actualIncomeTotal)}</span></div>
      <div class="line"><span>Planned expenses</span><span>$${centsToDollars(plannedExpenseTotal)}</span></div>
      <div class="line"><span>Actual expenses</span><span>$${centsToDollars(actualExpenseTotal)}</span></div>
      <div class="line total"><span>Planned surplus</span><span>$${centsToDollars(plannedIncomeTotal - plannedExpenseTotal)}</span></div>
      <div class="line total"><span>Actual net</span><span>$${centsToDollars(actualIncomeTotal - actualExpenseTotal)}</span></div>
    `;

    const matchedInPeriod = {};
    income.forEach(r => { if (r.planned_id) matchedInPeriod[r.planned_id] = (matchedInPeriod[r.planned_id] || 0) + 1; });
    expenses.forEach(r => { if (r.planned_id) matchedInPeriod[r.planned_id] = (matchedInPeriod[r.planned_id] || 0) + 1; });
    matchListEl.innerHTML = planned.length ? planned.map(p => {
      const count = matchedInPeriod[p.id] || 0;
      const status = count > 0 ? `Matched ${count > 1 ? '(' + count + ')' : ''}` : 'Not yet';
      return `<div class="budget-match-row"><span class="label">${escapeHtml(p.label)}</span> <span class="amount">${p.type === 'income' ? '+' : '-'}$${centsToDollars(p.amount_cents)}</span> <span class="status">${escapeHtml(status)}</span></div>`;
    }).join('') : '<p class="empty-state">Add planned items above.</p>';

    const byCat = {};
    expenses.forEach(r => {
      const key = r.category;
      if (!byCat[key]) byCat[key] = 0;
      byCat[key] += Number(r.amount_cents) + Number(r.gst_cents || 0);
    });
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    categoryTableEl.innerHTML = sorted.length ? `<table><thead><tr><th>Category</th><th class="amount">Spent</th></tr></thead><tbody>${sorted.map(([catId, amt]) => {
      const cat = T2125_CATEGORIES.find(c => c.id === catId);
      const label = escapeHtml(cat ? categoryDisplayLabel(cat) : catId);
      return `<tr><td>${label}</td><td class="amount">$${centsToDollars(amt)}</td></tr>`;
    }).join('')}</tbody></table>` : '<p class="empty-state">No expenses in this period.</p>';
  }

  function buildPlannedTableRow(p) {
    const isNew = !p || !p.id;
    const id = p?.id ? ` data-id="${p.id}"` : ' data-new="true"';
    const typeVal = p?.type || 'expense';
    const catOpts = T2125_CATEGORIES.map(c => `<option value="${escapeHtmlAttr(c.id)}" ${p?.category === c.id ? 'selected' : ''}>${escapeHtml(categoryDisplayLabel(c))}</option>`).join('');
    const incOpts = INCOME_TYPES.map(t => `<option value="${escapeHtmlAttr(t.id)}" ${p?.income_type === t.id ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
    const freqVal = p?.frequency || 'monthly';
    const freqOpts = ['weekly', 'biweekly', 'monthly', 'yearly'].map(f => `<option value="${f}" ${freqVal === f ? 'selected' : ''}>${f.charAt(0).toUpperCase() + f.slice(1)}</option>`).join('');
    return `<tr${id} data-type="${typeVal}">
      <td><select class="planned-input-type" aria-label="Type"><option value="expense" ${typeVal === 'expense' ? 'selected' : ''}>Expense</option><option value="income" ${typeVal === 'income' ? 'selected' : ''}>Income</option></select></td>
      <td><input type="text" class="planned-input-label" placeholder="e.g. Rent" value="${escapeHtmlAttr(p?.label || '')}" aria-label="Label"></td>
      <td class="amount"><input type="number" step="0.01" min="0" class="planned-input-amount" value="${p ? (Number(p.amount_cents) / 100) : ''}" placeholder="0" aria-label="Amount"></td>
      <td><select class="planned-input-frequency" aria-label="Recurring">${freqOpts}</select></td>
      <td class="planned-cell-category-type">
        <select class="planned-input-category" aria-label="Category" style="display:${typeVal === 'income' ? 'none' : 'inline'}"><option value="">—</option>${catOpts}</select>
        <select class="planned-input-income-type" aria-label="Income type" style="display:${typeVal === 'income' ? 'inline' : 'none'}"><option value="">—</option>${incOpts}</select>
      </td>
      <td class="actions"><button type="button" class="btn btn-secondary btn-sm planned-row-remove" ${isNew ? '' : `data-id="${p.id}"`}>Remove</button></td>
    </tr>`;
  }

  let editingPlannedId = null;
  function openPlannedForm(id) {
    const wrap = document.getElementById('budget-planned-form-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    editingPlannedId = id || null;
    if (id) {
      acctApi.plannedList().then(({ data }) => {
        const p = (data || []).find(x => x.id === id);
        if (p) { wrap.innerHTML = buildPlannedForm(p); bindPlannedForm(); }
      });
    } else {
      wrap.innerHTML = buildPlannedForm(null);
      bindPlannedForm();
    }
  }

  function buildPlannedForm(item) {
    const isEdit = !!item;
    const typeVal = item?.type || 'expense';
    const categoryOptions = T2125_CATEGORIES.map(c => `<option value="${escapeHtmlAttr(c.id)}" ${item?.category === c.id ? 'selected' : ''}>${escapeHtml(categoryDisplayLabel(c))}</option>`).join('');
    const incomeTypeOptions = INCOME_TYPES.map(t => `<option value="${escapeHtmlAttr(t.id)}" ${item?.income_type === t.id ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
    const freqVal = item?.frequency || 'monthly';
    const freqOptions = ['weekly', 'biweekly', 'monthly', 'yearly'].map(f => `<option value="${f}" ${freqVal === f ? 'selected' : ''}>${f.charAt(0).toUpperCase() + f.slice(1)}</option>`).join('');
    return `
      <h4>${isEdit ? 'Edit' : 'Add'} planned item</h4>
      <div class="form-row"><label>Type</label><select id="planned-type"><option value="expense" ${typeVal === 'expense' ? 'selected' : ''}>Expense</option><option value="income" ${typeVal === 'income' ? 'selected' : ''}>Income</option></select></div>
      <div class="form-row"><label>Label</label><input type="text" id="planned-label" placeholder="e.g. Rent, Paycheque" value="${escapeHtmlAttr(item?.label || '')}"></div>
      <div class="form-row"><label>Amount ($)</label><input type="number" step="0.01" min="0" id="planned-amount" value="${item ? (Number(item.amount_cents) / 100) : ''}"></div>
      <div class="form-row"><label>Recurring</label><select id="planned-frequency">${freqOptions}</select></div>
      <div class="form-row" id="planned-category-row"><label>Category (expense)</label><select id="planned-category"><option value="">—</option>${categoryOptions}</select></div>
      <div class="form-row" id="planned-income-type-row" style="display:none"><label>Income type</label><select id="planned-income-type"><option value="">—</option>${incomeTypeOptions}</select></div>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" id="planned-save-btn">${isEdit ? 'Update' : 'Add'}</button>
        <button type="button" class="btn btn-secondary" id="planned-cancel-btn">Cancel</button>
      </div>
    `;
  }

  function bindPlannedForm() {
    const typeSel = document.getElementById('planned-type');
    const categoryRow = document.getElementById('planned-category-row');
    const incomeTypeRow = document.getElementById('planned-income-type-row');
    function toggleType() {
      const isIncome = typeSel?.value === 'income';
      if (categoryRow) categoryRow.style.display = isIncome ? 'none' : '';
      if (incomeTypeRow) incomeTypeRow.style.display = isIncome ? '' : 'none';
    }
    typeSel?.addEventListener('change', toggleType);
    toggleType();

    document.getElementById('planned-save-btn')?.addEventListener('click', () => {
      const type = document.getElementById('planned-type').value;
      const label = document.getElementById('planned-label').value.trim();
      const amount_cents = toCents(document.getElementById('planned-amount').value);
      if (!label || amount_cents < 0) { showAppToast('Label and amount required.', true); return; }
      const frequency = document.getElementById('planned-frequency')?.value || 'monthly';
      const row = { type, label, amount_cents, frequency };
      if (type === 'expense') {
        const category = document.getElementById('planned-category').value;
        if (!category) { showAppToast('Category required for expense.', true); return; }
        row.category = category;
        row.income_type = null;
      } else {
        row.category = null;
        row.income_type = document.getElementById('planned-income-type').value || null;
      }
      if (editingPlannedId) {
        acctApi.plannedUpdate(editingPlannedId, row).then(({ error }) => {
          if (error) showAppToast(error.message || 'Update failed', true);
          else { document.getElementById('budget-planned-form-wrap').style.display = 'none'; editingPlannedId = null; renderBudgetPanel(); }
        });
      } else {
        acctApi.plannedInsert(row).then(({ error }) => {
          if (error) showAppToast(error.message || 'Insert failed', true);
          else { document.getElementById('budget-planned-form-wrap').style.display = 'none'; editingPlannedId = null; renderBudgetPanel(); }
        });
      }
    });
    document.getElementById('planned-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('budget-planned-form-wrap').style.display = 'none';
      editingPlannedId = null;
    });
  }

  function deletePlanned(id, triggerEl) {
    showInlineConfirm(triggerEl, 'Delete this planned item? Actual transactions linked to it will be unlinked.', () => {
      acctApi.plannedDelete(id).then(({ error }) => {
        if (error) showAppToast(error.message || 'Delete failed', true);
        else renderBudgetPanel();
      });
    });
  }

  return {
    getBudgetPeriod,
    renderBudgetPanel,
    buildPlannedTableRow,
    openPlannedForm,
    deletePlanned
  };
}
