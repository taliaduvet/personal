(function () {
  'use strict';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeHtmlAttr(s) {
    return escapeHtml(s).replace(/`/g, '&#96;');
  }

  function apiErrorMessage(err) {
    if (err == null) return 'Unknown error';
    if (typeof err === 'string') return err;
    return err.message || err.error_description || String(err);
  }

  function showAppToast(message, isError) {
    const el = document.createElement('div');
    el.className = 'app-toast' + (isError ? ' app-toast-error' : '');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 4500);
  }

  const T2125_CATEGORIES = [
    { id: '8521', label: 'Advertising' },
    { id: '8590', label: 'Bad debts' },
    { id: '8760', label: 'Business taxes and fees' },
    { id: '8760-licenses', label: 'Licenses / Subscriptions (CRA line 8760)' },
    { id: '8360', label: 'Sub-contractors' },
    { id: '8690', label: 'Insurance' },
    { id: '8710', label: 'Interest' },
    { id: '8860', label: 'Legal and professional services' },
    { id: '8871', label: 'Management and admin fees' },
    { id: '8960', label: 'Maintenance and repairs' },
    { id: '8910', label: 'Rent' },
    { id: '8810', label: 'Office expenses' },
    { id: '8811', label: 'Supplies' },
    { id: '8523', label: 'Meals and entertainment' },
    { id: '9060', label: 'Salaries and wages' },
    { id: '9224', label: 'Fuel (non-auto)' },
    { id: '9275', label: 'Delivery and freight' },
    { id: '9281', label: 'Motor vehicle expenses' },
    { id: '9200', label: 'Travel' },
    { id: '9220', label: 'Phone/Utilities/Internet/Rent' },
    { id: '9936', label: 'Capital cost allowance (CCA)' },
    { id: '9270', label: 'Other' },
    { id: 'personal', label: 'Personal (non-business)' },
    { id: 'medical', label: 'Medical (personal)' }
  ];

  function categoryDisplayLabel(cat) {
    return cat ? cat.label + ' (' + cat.id + ')' : '';
  }

  /** Best-effort vendor from bank description (e.g. text before *). */
  function guessVendorFromBankDescription(desc) {
    if (!desc || !String(desc).trim()) return null;
    const s = String(desc).trim();
    const star = s.indexOf('*');
    if (star > 0) {
      const v = s.slice(0, star).trim();
      return v || null;
    }
    return s.length > 55 ? s.slice(0, 55).trim() : s;
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

  function isBusinessExpense(category) {
    return category !== 'personal' && category !== 'medical';
  }

  const INCOME_TYPES = [
    { id: 'gig', label: 'Gigs / performance' },
    { id: 'royalties', label: 'Royalties' },
    { id: 'streaming', label: 'Streaming' },
    { id: 'sync', label: 'Sync / licensing' },
    { id: 'teaching', label: 'Teaching' },
    { id: 'merch', label: 'Merch' },
    { id: 'contract', label: 'Contract work' },
    { id: 'other', label: 'Other' }
  ];

  function centsToDollars(c) {
    if (c == null) return '0.00';
    return (Number(c) / 100).toFixed(2);
  }

  function formatDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function show(el, show) {
    if (!el) return;
    el.classList.toggle('visible', !!show);
    if (el.style) el.style.display = show ? '' : 'none';
  }

  function setPanel(name) {
    document.querySelectorAll('.panel').forEach(p => { p.classList.remove('visible'); });
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

  /** Default period: first day of current month through today (or last day of month). */
  function getDefaultMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const from = `${y}-${m}-01`;
    const to = now.toISOString().slice(0, 10);
    return { from, to };
  }

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

  /** Planned amount in period based on frequency (weekly, biweekly, monthly, yearly). Uses proportional counts so e.g. bi-weekly in a 31-day month ≈ 2.2 paychecks, not 3. */
  function plannedAmountInPeriod(p, from, to) {
    const fromD = new Date(from + 'T00:00:00');
    const toD = new Date(to + 'T00:00:00');
    const days = Math.max(0, Math.round((toD - fromD) / (24 * 60 * 60 * 1000))) + 1;
    const months = (toD.getFullYear() - fromD.getFullYear()) * 12 + (toD.getMonth() - fromD.getMonth()) + 1;
    const freq = (p.frequency || 'monthly');
    let count = 1;
    if (freq === 'weekly') count = days / 7;
    else if (freq === 'biweekly') count = days / 14;
    else if (freq === 'monthly') count = Math.max(1, months);
    else if (freq === 'yearly') count = months / 12;
    return Math.round(Number(p.amount_cents) * count);
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
          if (id && !confirm('Remove this planned item?')) return;
          if (id) acctApi.plannedDelete(id).then(() => renderBudgetPanel());
          else tr?.remove();
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

  function deletePlanned(id) {
    if (!confirm('Delete this planned item? Actual transactions linked to it will be unlinked.')) return;
    acctApi.plannedDelete(id).then(({ error }) => {
      if (error) showAppToast(error.message || 'Delete failed', true);
      else renderBudgetPanel();
    });
  }

  function renderDashboard() {
    const fromEl = document.getElementById('dash-period-from');
    const toEl = document.getElementById('dash-period-to');
    let from = fromEl?.value;
    let to = toEl?.value;
    if (!from || !to) {
      const def = getDefaultMonth();
      from = def.from;
      to = def.to;
      if (fromEl) fromEl.value = from;
      if (toEl) toEl.value = to;
    }
    Promise.all([acctApi.incomeInRange(from, to), acctApi.expensesInRange(from, to)]).then(([ir, er]) => {
      if (ir.error || er.error) {
        const msg = 'Could not load dashboard. ' + (apiErrorMessage(ir.error || er.error) || 'Check your connection and try again.');
        console.error('renderDashboard API error', ir.error, er.error);
        const recent = document.getElementById('dash-recent');
        const cards = document.getElementById('dash-cards');
        if (cards) cards.innerHTML = '<p class="report-error" role="alert">' + escapeHtml(msg) + '</p>';
        if (recent) recent.innerHTML = '';
        return;
      }
      const income = ir.data || [];
      const expenses = er.data || [];
      const businessExpenses = expenses.filter(r => isBusinessExpense(r.category));
      const totalIncome = income.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
      const totalExpense = businessExpenses.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
      const gstCollected = income.reduce((s, r) => s + Number(r.gst_cents || 0), 0);
      const gstPaid = businessExpenses.reduce((s, r) => s + Number(r.gst_cents || 0), 0);

      const cards = document.getElementById('dash-cards');
      cards.innerHTML = `
        <div class="dash-card income"><div class="label">Income</div><div class="value">$${centsToDollars(totalIncome)}</div><div class="dash-period">${formatDate(from)} – ${formatDate(to)}</div></div>
        <div class="dash-card expense"><div class="label">Expenses</div><div class="value">$${centsToDollars(totalExpense)}</div><div class="dash-period">${formatDate(from)} – ${formatDate(to)}</div></div>
        <div class="dash-card"><div class="label">Net</div><div class="value">$${centsToDollars(totalIncome - totalExpense)}</div><div class="dash-period">${formatDate(from)} – ${formatDate(to)}</div></div>
        <div class="dash-card"><div class="label">GST collected</div><div class="value">$${centsToDollars(gstCollected)}</div></div>
        <div class="dash-card"><div class="label">GST paid (ITC)</div><div class="value">$${centsToDollars(gstPaid)}</div></div>
      `;

      const combined = [
        ...income.map(r => ({ ...r, _type: 'income' })),
        ...expenses.map(r => ({ ...r, _type: 'expense' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

      const recent = document.getElementById('dash-recent');
      if (combined.length === 0) {
        recent.innerHTML = '<p class="empty-state">No entries yet. Add income or expenses from the tabs.</p>';
        return;
      }
      recent.innerHTML = combined.map(r => {
        const amt = Number(r.amount_cents) + Number(r.gst_cents || 0);
        const totalPay = r._type === 'expense' && r.total_payment_cents != null ? Number(r.total_payment_cents) : null;
        const amtStr = r._type === 'income' ? '+$' + centsToDollars(amt) : (totalPay ? `-$${centsToDollars(amt)} of $${centsToDollars(totalPay)}` : '-$' + centsToDollars(amt));
        const label = escapeHtml(r._type === 'income' ? incomeLineMeta(r) : expenseLineMeta(r));
        return `<div class="entry-row ${r._type}">
          <span class="date">${formatDate(r.date)}</span>
          <span class="meta">${label}</span>
          <span class="amount">${amtStr}</span>
        </div>`;
      }).join('');
    });
  }

  function buildIncomeForm(editRow) {
    const isEdit = !!editRow;
    return `
      <div class="form-row"><label>Date</label><input type="date" id="income-date" value="${editRow ? editRow.date : new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-row"><label>Amount ($)</label><input type="number" step="0.01" min="0" id="income-amount" placeholder="0.00" value="${editRow ? (Number(editRow.amount_cents) / 100) : ''}"></div>
      <div class="form-row"><label>GST ($)</label><input type="number" step="0.01" min="0" id="income-gst" placeholder="0.00" value="${editRow ? (Number(editRow.gst_cents) / 100) : '0'}"></div>
      <div class="form-row"><label>Vendor</label><input type="text" id="income-vendor" placeholder="Who paid you (optional)" value="${escapeHtmlAttr(editRow?.vendor || '')}"></div>
      <div class="form-row"><label>Client / project</label><input type="text" id="income-client" placeholder="Optional" value="${escapeHtmlAttr(editRow?.client_or_project || '')}"></div>
      <div class="form-row"><label>Type</label><select id="income-type"><option value="">—</option>${INCOME_TYPES.map(t => `<option value="${escapeHtmlAttr(t.id)}" ${editRow?.income_type === t.id ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Match to planned</label><select id="income-planned"><option value="">—</option></select></div>
      <div class="form-row"><label>Note</label><textarea id="income-note" placeholder="Optional">${escapeHtml(editRow?.note || '')}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" id="income-save-btn">${isEdit ? 'Update' : 'Add'}</button>
        <button type="button" class="btn btn-secondary" id="income-cancel-btn">Cancel</button>
      </div>
    `;
  }

  function buildExpenseForm(editRow) {
    const isEdit = !!editRow;
    return `
      <div class="form-row"><label>Date</label><input type="date" id="expense-date" value="${editRow ? editRow.date : new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-row"><label>Amount ($)</label><input type="number" step="0.01" min="0" id="expense-amount" placeholder="0.00" value="${editRow ? (Number(editRow.amount_cents) / 100) : ''}"></div>
      <div class="form-row"><label>Total payment ($) <span class="hint">Optional — use when the full amount left your account but you’re only claiming your portion (e.g. shared rent; someone e-transfers you their half).</span></label><input type="number" step="0.01" min="0" id="expense-total-payment" placeholder="Leave blank if same as amount" value="${editRow && editRow.total_payment_cents != null ? (Number(editRow.total_payment_cents) / 100) : ''}"></div>
      <div class="form-row"><label>GST ($)</label><input type="number" step="0.01" min="0" id="expense-gst" placeholder="0.00" value="${editRow ? (Number(editRow.gst_cents) / 100) : '0'}"></div>
      <div class="form-row"><label>Vendor</label><input type="text" id="expense-vendor" placeholder="Who you paid (optional)" value="${escapeHtmlAttr(editRow?.vendor || '')}"></div>
      <div class="form-row"><label>Category (T2125)</label><div id="expense-category-wrap" class="category-picker-wrap"><input type="hidden" id="expense-category" value="${escapeHtmlAttr(editRow?.category || '')}"><input type="text" class="category-picker-input" placeholder="Search categories..." value="${editRow?.category ? escapeHtmlAttr(categoryDisplayLabel(T2125_CATEGORIES.find(c => c.id === editRow.category))) : ''}" autocomplete="off"><ul class="category-picker-list" aria-hidden="true"></ul></div></div>
      <div class="form-row"><label>Match to planned</label><select id="expense-planned"><option value="">—</option></select></div>
      <div class="form-row"><label>Receipt (image or PDF)<br><span class="hint">Optional; you can add more later when editing.</span></label><input type="file" id="expense-receipt" accept="image/*,application/pdf" multiple></div>
      <div class="form-row"><label>Note</label><textarea id="expense-note" placeholder="Optional">${escapeHtml(editRow?.note || '')}</textarea></div>
      <div class="form-row" id="expense-receipts-list-wrap" style="display:${isEdit ? '' : 'none'}"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" id="expense-save-btn">${isEdit ? 'Update' : 'Add'}</button>
        <button type="button" class="btn btn-secondary" id="expense-cancel-btn">Cancel</button>
      </div>
    `;
  }

  function initCategoryPicker(wrapElOrSelector) {
    const wrap = typeof wrapElOrSelector === 'string' ? document.querySelector(wrapElOrSelector) : wrapElOrSelector;
    if (!wrap) return;
    const hidden = wrap.querySelector('input[type="hidden"]');
    const input = wrap.querySelector('.category-picker-input');
    const list = wrap.querySelector('.category-picker-list');
    if (!hidden || !input || !list) return;
    const options = T2125_CATEGORIES.map(c => ({ id: c.id, display: categoryDisplayLabel(c) }));
    function renderList(filter) {
      const q = (filter || '').toLowerCase().trim();
      const filtered = q ? options.filter(o => o.display.toLowerCase().includes(q) || String(o.id).toLowerCase().includes(q)) : options;
      list.innerHTML = filtered.map(o => `<li data-id="${escapeHtmlAttr(o.id)}" data-display="${escapeHtmlAttr(o.display)}">${escapeHtml(o.display)}</li>`).join('');
      list.style.display = filtered.length ? 'block' : 'none';
      list.setAttribute('aria-hidden', filtered.length ? 'false' : 'true');
      list.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
          hidden.value = li.dataset.id;
          input.value = li.dataset.display;
          list.style.display = 'none';
        });
      });
    }
    function syncHiddenFromVisible() {
      const v = (input.value || '').trim();
      if (!v) return;
      const match = options.find(o => o.display === v);
      if (match) hidden.value = match.id;
    }
    renderList();
    list.style.display = 'none';
    list.setAttribute('aria-hidden', 'true');
    input.addEventListener('input', () => {
      renderList(input.value);
      const n = list.querySelectorAll('li').length;
      list.style.display = n ? 'block' : 'none';
      list.setAttribute('aria-hidden', n ? 'false' : 'true');
    });
    input.addEventListener('focus', () => {
      renderList(input.value);
      const n = list.querySelectorAll('li').length;
      list.style.display = n ? 'block' : 'none';
      list.setAttribute('aria-hidden', n ? 'false' : 'true');
    });
    input.addEventListener('blur', () => {
      syncHiddenFromVisible();
      setTimeout(() => {
        list.style.display = 'none';
        list.setAttribute('aria-hidden', 'true');
      }, 150);
    });
  }

  function toCents(val) {
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }

  function loadPlannedDropdown(selectId, type, selectedId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    acctApi.plannedList().then(({ data }) => {
      const list = (data || []).filter(p => p.type === type);
      sel.innerHTML = '<option value="">—</option>' + list.map(p => `<option value="${escapeHtmlAttr(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.label)} ($${centsToDollars(p.amount_cents)})</option>`).join('');
    });
  }

  function incomeListRender() {
    const fromEl = document.getElementById('income-period-from');
    const toEl = document.getElementById('income-period-to');
    let from = fromEl?.value;
    let to = toEl?.value;
    if (!from || !to) {
      const def = getDefaultMonth();
      from = def.from;
      to = def.to;
      if (fromEl) fromEl.value = from;
      if (toEl) toEl.value = to;
    }
    acctApi.incomeInRange(from, to).then(({ data }) => {
      const income = data || [];
      const total = income.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
      const byType = {};
      income.forEach(r => {
        const key = r.income_type || '—';
        if (!byType[key]) byType[key] = 0;
        byType[key] += Number(r.amount_cents) + Number(r.gst_cents || 0);
      });
      const summaryEl = document.getElementById('income-summary');
      const byTypeEl = document.getElementById('income-by-type');
      const list = document.getElementById('income-list');
      if (summaryEl) summaryEl.innerHTML = `<div class="panel-summary-inner"><strong>Total income</strong> <span class="amount">+$${centsToDollars(total)}</span> <span class="muted">(${formatDate(from)} – ${formatDate(to)})</span></div>`;
      const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
      if (byTypeEl) byTypeEl.innerHTML = sortedTypes.length ? `<h4>By type</h4><table class="panel-breakdown-table"><thead><tr><th>Type</th><th class="amount">Amount</th></tr></thead><tbody>${sortedTypes.map(([key, amt]) => {
        const label = INCOME_TYPES.find(t => t.id === key)?.label || key;
        return `<tr><td>${escapeHtml(label)}</td><td class="amount">+$${centsToDollars(amt)}</td></tr>`;
      }).join('')}</tbody></table>` : '';
      if (!list) return;
      if (income.length === 0) {
        list.innerHTML = '<p class="empty-state">No income in this period. Change the dates or click Add income.</p>';
        return;
      }
      list.innerHTML = income.map(r => {
        const amt = Number(r.amount_cents) + Number(r.gst_cents || 0);
        return `<div class="entry-row income" data-id="${r.id}">
          <div><span class="date">${formatDate(r.date)}</span> <span class="meta">${escapeHtml(incomeLineMeta(r))}</span></div>
          <div class="amount">+$${centsToDollars(amt)}</div>
          <div class="actions">
            <button type="button" class="edit-btn" data-id="${r.id}">Edit</button>
            <button type="button" class="delete-btn delete" data-id="${r.id}">Delete</button>
          </div>
        </div>`;
      }).join('');
      list.querySelectorAll('.edit-btn').forEach(btn => { btn.addEventListener('click', () => openIncomeForm(btn.dataset.id)); });
      list.querySelectorAll('.delete-btn').forEach(btn => { btn.addEventListener('click', () => deleteIncome(btn.dataset.id)); });
    });
  }

  function expenseListRender() {
    const fromEl = document.getElementById('expense-period-from');
    const toEl = document.getElementById('expense-period-to');
    let from = fromEl?.value;
    let to = toEl?.value;
    if (!from || !to) {
      const def = getDefaultMonth();
      from = def.from;
      to = def.to;
      if (fromEl) fromEl.value = from;
      if (toEl) toEl.value = to;
    }
    acctApi.expensesInRange(from, to).then(({ data }) => {
      const expenses = data || [];
      const total = expenses.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
      const byCat = {};
      expenses.forEach(r => {
        const key = r.category || '—';
        if (!byCat[key]) byCat[key] = 0;
        byCat[key] += Number(r.amount_cents) + Number(r.gst_cents || 0);
      });
      const summaryEl = document.getElementById('expense-summary');
      const byCatEl = document.getElementById('expense-by-category');
      const list = document.getElementById('expense-list');
      if (summaryEl) summaryEl.innerHTML = `<div class="panel-summary-inner"><strong>Total expenses</strong> <span class="amount">-$${centsToDollars(total)}</span> <span class="muted">(${formatDate(from)} – ${formatDate(to)})</span></div>`;
      const sortedCat = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      if (byCatEl) byCatEl.innerHTML = sortedCat.length ? `<h4>By category</h4><table class="panel-breakdown-table"><thead><tr><th>Category</th><th class="amount">Amount</th></tr></thead><tbody>${sortedCat.map(([catId, amt]) => {
        const cat = T2125_CATEGORIES.find(c => c.id === catId);
        return `<tr><td>${escapeHtml(cat ? categoryDisplayLabel(cat) : catId)}</td><td class="amount">-$${centsToDollars(amt)}</td></tr>`;
      }).join('')}</tbody></table>` : '';
      if (!list) return;
      if (expenses.length === 0) {
        list.innerHTML = '<p class="empty-state">No expenses in this period. Change the dates or click Add expense.</p>';
        return;
      }
      list.innerHTML = expenses.map(r => {
        const amt = Number(r.amount_cents) + Number(r.gst_cents || 0);
        const totalPay = r.total_payment_cents != null ? Number(r.total_payment_cents) : null;
        const amtDisplay = totalPay != null && totalPay > 0 ? `-$${centsToDollars(amt)} of $${centsToDollars(totalPay)}` : `-$${centsToDollars(amt)}`;
        return `<div class="entry-row expense" data-id="${r.id}">
          <div><span class="date">${formatDate(r.date)}</span> <span class="meta">${escapeHtml(expenseLineMeta(r))}</span></div>
          <div class="amount">${amtDisplay}</div>
          <div class="actions">
            <button type="button" class="edit-btn" data-id="${r.id}">Edit</button>
            <button type="button" class="delete-btn delete" data-id="${r.id}">Delete</button>
          </div>
        </div>`;
      }).join('');
      list.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openExpenseForm(btn.dataset.id));
      });
      list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteExpense(btn.dataset.id));
      });
    });
  }

  let editingIncomeId = null;
  let editingExpenseId = null;

  function openIncomeForm(id) {
    const wrap = document.getElementById('income-form-wrap');
    wrap.style.display = 'block';
    editingIncomeId = id || null;
    if (id) {
      acctApi.incomeList().then(({ data }) => {
        const row = data.find(r => r.id === id);
        if (row) { wrap.innerHTML = buildIncomeForm(row); bindIncomeForm(); loadPlannedDropdown('income-planned', 'income', row.planned_id); }
      });
    } else {
      wrap.innerHTML = buildIncomeForm(null);
      bindIncomeForm();
      loadPlannedDropdown('income-planned', 'income', null);
    }
  }

  function openExpenseForm(id) {
    const wrap = document.getElementById('expense-form-wrap');
    wrap.style.display = 'block';
    editingExpenseId = id || null;
    if (id) {
      acctApi.expensesList().then(({ data }) => {
        const row = data.find(r => r.id === id);
        if (row) {
          wrap.innerHTML = buildExpenseForm(row);
          bindExpenseForm();
          initCategoryPicker(document.getElementById('expense-category-wrap'));
          loadPlannedDropdown('expense-planned', 'expense', row.planned_id);
          loadExpenseReceipts(id);
        }
      });
    } else {
      wrap.innerHTML = buildExpenseForm(null);
      bindExpenseForm();
      initCategoryPicker(document.getElementById('expense-category-wrap'));
      loadPlannedDropdown('expense-planned', 'expense', null);
    }
  }

  function bindIncomeForm() {
    document.getElementById('income-save-btn')?.addEventListener('click', () => {
      const date = document.getElementById('income-date').value;
      const amount_cents = toCents(document.getElementById('income-amount').value);
      const gst_cents = toCents(document.getElementById('income-gst').value);
      const client_or_project = document.getElementById('income-client').value.trim() || null;
      const vendor = document.getElementById('income-vendor').value.trim() || null;
      const typeEl = document.getElementById('income-type');
      const income_type = (typeEl && typeEl.value) ? typeEl.value : null;
      const note = document.getElementById('income-note').value.trim() || null;
      if (!date || amount_cents < 0) { showAppToast('Date and amount required.', true); return; }
      const planned_id = document.getElementById('income-planned')?.value || null;
      const row = { date, amount_cents, gst_cents, vendor, client_or_project, income_type, note, planned_id: planned_id || null };
      if (editingIncomeId) {
        acctApi.incomeUpdate(editingIncomeId, row).then(({ error }) => {
          if (error) showAppToast(error.message || 'Update failed', true);
          else { document.getElementById('income-form-wrap').style.display = 'none'; editingIncomeId = null; incomeListRender(); renderDashboard(); }
        });
      } else {
        acctApi.incomeInsert(row).then(({ error }) => {
          if (error) showAppToast(error.message || 'Insert failed', true);
          else { document.getElementById('income-form-wrap').style.display = 'none'; incomeListRender(); renderDashboard(); }
        });
      }
    });
    document.getElementById('income-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('income-form-wrap').style.display = 'none';
      editingIncomeId = null;
    });
  }

  function bindExpenseForm() {
    document.getElementById('expense-save-btn')?.addEventListener('click', () => {
      const date = document.getElementById('expense-date').value;
      const amount_cents = toCents(document.getElementById('expense-amount').value);
      const totalPaymentVal = document.getElementById('expense-total-payment')?.value.trim();
      const total_payment_cents = totalPaymentVal ? toCents(totalPaymentVal) : null;
      const gst_cents = toCents(document.getElementById('expense-gst').value);
      const formWrap = document.getElementById('expense-form-wrap');
      const categoryWrap = formWrap?.querySelector('.category-picker-wrap');
      const categoryHidden = categoryWrap?.querySelector('input[type="hidden"]');
      const categoryInput = categoryWrap?.querySelector('.category-picker-input');
      // Sync visible → hidden so we don't depend on blur firing before Save
      if (categoryWrap && categoryHidden && categoryInput) {
        const visibleVal = categoryInput.value.trim();
        if (visibleVal) {
          const match = T2125_CATEGORIES.find(c => categoryDisplayLabel(c) === visibleVal);
          if (match) categoryHidden.value = match.id;
        }
      }
      let category = (categoryHidden?.value || '').trim();
      if (!category && categoryInput?.value) {
        const visibleVal = categoryInput.value.trim();
        const match = T2125_CATEGORIES.find(c => categoryDisplayLabel(c) === visibleVal);
        if (match) category = match.id;
      }
      if (!category) category = (document.getElementById('expense-category')?.value || '').trim();
      const note = document.getElementById('expense-note').value.trim() || null;
      const files = document.getElementById('expense-receipt')?.files || [];
      if (!date || amount_cents < 0 || !category) { showAppToast('Date, amount, and category required.', true); return; }
      if (total_payment_cents != null && total_payment_cents > 0 && amount_cents > total_payment_cents) { showAppToast('Your amount cannot be more than the total payment.', true); return; }
      const planned_id = document.getElementById('expense-planned')?.value || null;
      const vendor = document.getElementById('expense-vendor').value.trim() || null;
      const row = { date, amount_cents, gst_cents, category, vendor, note, planned_id: planned_id || null };
      row.total_payment_cents = (total_payment_cents != null && total_payment_cents > 0) ? total_payment_cents : null;
      if (editingExpenseId) {
        acctApi.expensesUpdate(editingExpenseId, row).then(async ({ error }) => {
          if (error) { showAppToast(error.message || 'Update failed', true); return; }
          if (files.length) {
            for (const f of files) {
              const { error: upErr } = await acctApi.uploadReceipt(editingExpenseId, f);
              if (upErr) { console.error('Receipt upload failed', upErr); }
            }
          }
          document.getElementById('expense-form-wrap').style.display = 'none';
          editingExpenseId = null;
          expenseListRender();
          renderDashboard();
        });
      } else {
        acctApi.expensesInsert(row).then(async ({ data, error }) => {
          if (error) { showAppToast(error.message || 'Insert failed', true); return; }
          const newId = data?.id;
          if (newId && files.length) {
            for (const f of files) {
              const { error: upErr } = await acctApi.uploadReceipt(newId, f);
              if (upErr) { console.error('Receipt upload failed', upErr); }
            }
          }
          document.getElementById('expense-form-wrap').style.display = 'none';
          expenseListRender();
          renderDashboard();
        });
      }
    });
    document.getElementById('expense-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('expense-form-wrap').style.display = 'none';
      editingExpenseId = null;
    });
  }

  async function loadExpenseReceipts(expenseId) {
    const wrap = document.getElementById('expense-receipts-list-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    wrap.innerHTML = '<label>Existing receipts</label><p class="empty-state">Loading…</p>';
    const { data, error } = await acctApi.listReceipts(expenseId);
    if (error) { wrap.innerHTML = '<label>Existing receipts</label><p class="empty-state">Could not load receipts.</p>'; return; }
    if (!data.length) { wrap.innerHTML = '<label>Existing receipts</label><p class="empty-state">No receipts yet.</p>'; return; }
    wrap.innerHTML = '<label>Existing receipts</label><ul id="expense-receipts-list"></ul>';
    const ul = document.getElementById('expense-receipts-list');
    ul.innerHTML = data.map(r => `<li data-path="${escapeHtmlAttr(r.file_path)}"><button type="button" class="btn btn-secondary btn-sm" data-path="${escapeHtmlAttr(r.file_path)}">${escapeHtml(r.file_name)}</button></li>`).join('');
    ul.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const path = btn.getAttribute('data-path');
        const { url, error: urlErr } = await acctApi.getReceiptUrl(path);
        if (urlErr || !url) { showAppToast('Could not open receipt', true); return; }
        window.open(url, '_blank');
      });
    });
  }

  // --- Bank CSV import & reconciliation ---

  let bankParsedRows = [];
  let bankHeaders = [];
  let bankRules = [];
  let bankReviewRows = [];

  function suggestFromRules(description, rules) {
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
      bankHeaders = headers;
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

  function normalizeDate(str) {
    if (!str) return '';
    const s = String(str).trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(s)) return s;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    const [a, b, c] = s.split(/[/-]/).map(Number);
    if (a > 31 && b <= 12 && c <= 31) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    if (c > 31 && a <= 12 && b <= 31) return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    if (a <= 31 && b <= 12) return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    return s;
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
        <div><span style="font-size:0.85rem;color:var(--muted);">Amount column</span><br>
          <select id="bank-col-amount">
            <option value="">-- choose --</option>${optionsHtml}
          </select>
        </div>
        <div style="align-self:flex-end;">
          <button type="button" class="btn btn-primary" id="bank-import-btn">Import</button>
        </div>
      </div>
    `;
    if (dateGuess) document.getElementById('bank-col-date').value = dateGuess;
    if (descGuess) document.getElementById('bank-col-desc').value = descGuess;
    if (amountGuess) document.getElementById('bank-col-amount').value = amountGuess;
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
    if (!dateCol || !descCol || !amountCol) {
      showAppToast('Please choose date, description, and amount columns.', true);
      return;
    }
    const source = document.getElementById('bank-file')?.files[0];
    const sourceName = source ? source.name : null;
    const rows = bankParsedRows.map(r => {
      const rawAmt = r[amountCol] || '0';
      const n = parseFloat(String(rawAmt).replace(/[^0-9.-]/g, '')) || 0;
      const amount_cents = Math.round(n * 100);
      const dateNorm = normalizeDate(r[dateCol]);
      return {
        date: dateNorm,
        description: r[descCol],
        amount_cents,
        source_file_name: sourceName
      };
    }).filter(r => r.date && r.description && r.amount_cents !== 0);
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
      showAppToast('All ' + rows.length + ' rows from the CSV already exist. No new transactions imported.', true);
      document.getElementById('bank-mapping').style.display = 'none';
      document.getElementById('bank-file').value = '';
      bankParsedRows = [];
      bankHeaders = [];
      loadBankReconcile();
      return;
    }
    const { error } = await acctApi.bankInsertMany(toInsert);
    if (error) { showAppToast(error.message || 'Import failed', true); return; }
    document.getElementById('bank-mapping').style.display = 'none';
    document.getElementById('bank-file').value = '';
    bankParsedRows = [];
    bankHeaders = [];
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
        entryType: sug.entryType || (amt < 0 ? 'expense' : 'income'),
        categoryId: sug.categoryId || '9270',
        incomeType: sug.incomeType || 'other',
        plannedExpenseId: '',
        plannedIncomeId: '',
        include: true,
        status: 'pending',
        statusMessage: '',
        receiptFile: null
      };
    });

    function renderBankReview() {
      const rowsHtml = bankReviewRows.map(function (r) {
        const dateBad = !isValidIsoDate(r.date);
        const statusCls = r.status === 'success' ? ' bank-row-success' : (r.status === 'error' ? ' bank-row-error' : '');
        const rowClass = 'bank-row' + (dateBad ? ' bank-row-invalid' : '') + statusCls;
        const incomeTypeOptions = INCOME_TYPES.map(t => `<option value="${escapeHtmlAttr(t.id)}" ${t.id === r.incomeType ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
        const statusLine = r.statusMessage ? `<div class="bank-row-status">${escapeHtml(r.statusMessage)}</div>` : '';
        return `<div class="${rowClass}" data-id="${escapeHtmlAttr(r.id)}">
          <div class="bank-row-main">
            <label class="bank-include-toggle"><input type="checkbox" class="bank-row-include" ${r.include ? 'checked' : ''}> Include</label>
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
            <label class="bank-field-expense ${r.entryType === 'expense' ? '' : 'hidden'}">Receipt (optional)
              <input type="file" class="bank-row-receipt" accept="image/*,application/pdf">
            </label>
          </div>
          ${dateBad ? '<div class="bank-row-warn" role="status">Date is invalid. Fix before submit.</div>' : ''}
          ${statusLine}
        </div>`;
      }).join('');
      wrap.innerHTML = `
        <div class="bank-bulk-actions">
          <button type="button" id="bank-submit-all-btn" class="btn btn-primary">Submit all selected</button>
          <button type="button" id="bank-ignore-unselected-btn" class="btn btn-secondary">Ignore unselected</button>
        </div>
        ${rowsHtml}
      `;
      wrap.querySelectorAll('.bank-row-category-wrap').forEach(w => initCategoryPicker(w));
      wrap.querySelectorAll('.bank-row').forEach(function (rowEl) {
        const id = rowEl.getAttribute('data-id');
        const state = bankReviewRows.find(r => r.id === id);
        if (!state) return;
        const includeEl = rowEl.querySelector('.bank-row-include');
        const entryEl = rowEl.querySelector('.bank-row-entry-type');
        const dateEl = rowEl.querySelector('.bank-row-date');
        const amountEl = rowEl.querySelector('.bank-row-amount-record');
        const catEl = rowEl.querySelector('.bank-row-category-value');
        const typeEl = rowEl.querySelector('.bank-row-income-type');
        const pExpEl = rowEl.querySelector('.bank-row-planned-expense');
        const pIncEl = rowEl.querySelector('.bank-row-planned-income');
        const receiptEl = rowEl.querySelector('.bank-row-receipt');
        if (includeEl) includeEl.addEventListener('change', function () { state.include = !!includeEl.checked; });
        if (entryEl) entryEl.addEventListener('change', function () {
          state.entryType = entryEl.value === 'expense' ? 'expense' : 'income';
          renderBankReview();
        });
        if (dateEl) dateEl.addEventListener('change', function () { state.date = dateEl.value || ''; });
        if (amountEl) amountEl.addEventListener('change', function () { state.amountCents = Math.max(0, parseBankMoneyToCents(amountEl.value)); });
        if (catEl) catEl.addEventListener('change', function () { state.categoryId = catEl.value || '9270'; });
        if (typeEl) typeEl.addEventListener('change', function () { state.incomeType = typeEl.value || 'other'; });
        if (pExpEl) pExpEl.addEventListener('change', function () { state.plannedExpenseId = pExpEl.value || ''; });
        if (pIncEl) pIncEl.addEventListener('change', function () { state.plannedIncomeId = pIncEl.value || ''; });
        if (receiptEl) receiptEl.addEventListener('change', function () { state.receiptFile = receiptEl.files && receiptEl.files[0] ? receiptEl.files[0] : null; });
      });
      document.getElementById('bank-submit-all-btn')?.addEventListener('click', onBankSubmitAll);
      document.getElementById('bank-ignore-unselected-btn')?.addEventListener('click', onBankIgnoreUnselected);
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
        : { pattern_type: 'contains', pattern, entry_type: 'income', income_type: state.incomeType || 'other' };
      const res = await acctApi.rulesInsert(payload);
      if (!res.error) bankRules.unshift(res.data || payload);
    }

    async function processBankRow(state) {
      state.status = 'pending';
      state.statusMessage = '';
      if (!state.include) return;
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
          income_type: state.incomeType || 'other',
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
        showAppToast('Select at least one row to submit.', true);
        return;
      }
      for (const row of selected) {
        await processBankRow(row);
      }
      const ok = selected.filter(r => r.status === 'success').length;
      const fail = selected.length - ok;
      showAppToast('Processed ' + ok + ' row(s).' + (fail ? ' ' + fail + ' failed.' : ''), fail > 0);
      renderBankReview();
      if (ok > 0) {
        incomeListRender();
        expenseListRender();
        renderDashboard();
      }
    }

    async function onBankIgnoreUnselected() {
      const ids = bankReviewRows.filter(r => !r.include).map(r => r.id);
      if (!ids.length) {
        showAppToast('No unselected rows to ignore.', true);
        return;
      }
      for (const id of ids) {
        await onBankIgnore(id, true);
      }
      loadBankReconcile();
    }

    renderBankReview();
  }

  async function onBankIgnore(id, skipConfirm) {
    if (!skipConfirm && !confirm('Ignore this transaction?')) return;
    const { error } = await acctApi.bankMarkIgnored(id);
    if (error) { showAppToast(error.message || 'Could not ignore', true); return; }
  }

  function deleteIncome(id) {
    if (!confirm('Delete this income entry?')) return;
    acctApi.incomeDelete(id).then(({ error }) => {
      if (error) showAppToast(error.message || 'Delete failed', true);
      else { incomeListRender(); renderDashboard(); }
    });
  }

  function deleteExpense(id) {
    if (!confirm('Delete this expense entry?')) return;
    acctApi.expensesDelete(id).then(({ error }) => {
      if (error) showAppToast(error.message || 'Delete failed', true);
      else { expenseListRender(); renderDashboard(); }
    });
  }

  function runReport() {
    const fromEl = document.getElementById('report-from');
    const toEl = document.getElementById('report-to');
    if (!fromEl || !toEl) return;
    const from = fromEl.value;
    const to = toEl.value;
    if (!from || !to) return;
    Promise.all([
      acctApi.incomeInRange(from, to),
      acctApi.expensesInRange(from, to)
    ]).then(([ir, er]) => {
      if (ir.error || er.error) {
        const msg = 'Could not load report data. ' + (apiErrorMessage(ir.error || er.error) || 'Check your connection and try again.');
        console.error('runReport API error', ir.error, er.error);
        const errHtml = '<p class="report-error" role="alert">' + escapeHtml(msg) + '</p>';
        const rs = document.getElementById('report-summary');
        const rg = document.getElementById('report-gst');
        const rbc = document.getElementById('report-by-category');
        if (rs) rs.innerHTML = errHtml;
        if (rg) rg.innerHTML = '';
        if (rbc) rbc.innerHTML = '';
        return;
      }
      const income = ir.data || [];
      const expenses = er.data || [];
      const businessExpenses = expenses.filter(r => isBusinessExpense(r.category));
      const totalIncome = income.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
      const totalExpense = businessExpenses.reduce((s, r) => s + Number(r.amount_cents) + Number(r.gst_cents || 0), 0);
      const gstCollected = income.reduce((s, r) => s + Number(r.gst_cents || 0), 0);
      const gstPaid = businessExpenses.reduce((s, r) => s + Number(r.gst_cents || 0), 0);

      const byCat = {};
      businessExpenses.forEach(r => {
        const key = r.category;
        if (!byCat[key]) byCat[key] = { amount_cents: 0, gst_cents: 0 };
        byCat[key].amount_cents += Number(r.amount_cents);
        byCat[key].gst_cents += Number(r.gst_cents || 0);
      });

      document.getElementById('report-summary').innerHTML = `
        <h3>Summary (${formatDate(from)} – ${formatDate(to)})</h3>
        <div class="line"><span>Total income</span><span>$${centsToDollars(totalIncome)}</span></div>
        <div class="line"><span>Total expenses</span><span>$${centsToDollars(totalExpense)}</span></div>
        <div class="line total"><span>Net</span><span>$${centsToDollars(totalIncome - totalExpense)}</span></div>
      `;

      document.getElementById('report-gst').innerHTML = `
        <h3>GST (for your return)</h3>
        <div class="line"><span>GST collected</span><span>$${centsToDollars(gstCollected)}</span></div>
        <div class="line"><span>GST paid (input tax credits)</span><span>$${centsToDollars(gstPaid)}</span></div>
        <div class="line total"><span>Net GST remittance</span><span>$${centsToDollars(gstCollected - gstPaid)}</span></div>
      `;

      const sorted = Object.entries(byCat).sort((a, b) => b[1].amount_cents - a[1].amount_cents);
      document.getElementById('report-by-category').innerHTML = sorted.length ? `
        <h3>Expenses by T2125 category</h3>
        <table><thead><tr><th>Category</th><th class="amount">Amount</th><th class="amount">GST</th></tr></thead><tbody>
          ${sorted.map(([catId, o]) => {
            const cat = T2125_CATEGORIES.find(c => c.id === catId);
            const label = escapeHtml(cat ? categoryDisplayLabel(cat) : catId);
            return `<tr><td>${label}</td><td class="amount">$${centsToDollars(o.amount_cents)}</td><td class="amount">$${centsToDollars(o.gst_cents)}</td></tr>`;
          }).join('')}
        </tbody></table>
      ` : '<p class="empty-state">No expenses in this range.</p>';
    });
  }

  function initReportDates() {
    const y = new Date().getFullYear();
    const from = document.getElementById('report-from');
    const to = document.getElementById('report-to');
    if (from) from.value = y + '-01-01';
    if (to) to.value = new Date().toISOString().slice(0, 10);
  }

  // --- Gluten-free medical expense panel
  let gfEditingPurchaseId = null;
  let gfEditingProductName = null;
  let gfEditingReceiptId = null;
  /** Set when CRA Summary Apply succeeds: purchases, aggregated rows, totals, date range (for CSV + ZIP export). */
  let gfLastSummaryContext = null;
  const GF_CURRENT_RECEIPT_KEY = 'gf_current_receipt_id';
  const GF_CURRENT_RECEIPT_NAME_KEY = 'gf_current_receipt_name';
  const GF_CURRENT_RECEIPT_DATE_KEY = 'gf_current_receipt_date';
  const GF_PRODUCT_PREFS_KEY = 'gf_product_prefs_v1';
  let gfProductsById = {};

  function parseUnitDescription(unitDescription) {
    const m = String(unitDescription || '').match(/per\s+([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/i);
    if (!m) return null;
    return { value: Number(m[1]), unit: String(m[2]).toLowerCase() };
  }

  function loadGfProductPrefs() {
    try {
      const raw = localStorage.getItem(GF_PRODUCT_PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveGfProductPrefs(prefs) {
    try {
      localStorage.setItem(GF_PRODUCT_PREFS_KEY, JSON.stringify(prefs || {}));
    } catch (e) {}
  }

  function setGfProductPref(productId, pref) {
    if (!productId) return;
    const all = loadGfProductPrefs();
    all[productId] = pref;
    saveGfProductPrefs(all);
  }

  function getGfProductPref(productId) {
    if (!productId) return null;
    const all = loadGfProductPrefs();
    return all[productId] || null;
  }

  function applyGfProductPrefill(productId) {
    if (!productId) return;
    const product = gfProductsById[productId] || null;
    const pref = getGfProductPref(productId);
    const regPriceEl = document.getElementById('gf-regular-unit');
    const gfTotalEl = document.getElementById('gf-total-paid');
    const gfSizeValEl = document.getElementById('gf-size-value');
    const gfSizeUnitEl = document.getElementById('gf-size-unit');
    const regSizeValEl = document.getElementById('gf-regular-size-value');
    const regSizeUnitEl = document.getElementById('gf-regular-size-unit');
    if (regPriceEl) {
      if (pref && pref.regularUnitPriceCents != null) regPriceEl.value = centsToDollars(pref.regularUnitPriceCents);
      else if (product && product.baseline_regular_unit_price_cents != null) regPriceEl.value = centsToDollars(product.baseline_regular_unit_price_cents);
    }
    if (product && product.unit_description && (!pref || pref.regularSizeValue == null)) {
      const parsed = parseUnitDescription(product.unit_description);
      if (parsed) {
        if (regSizeValEl) regSizeValEl.value = parsed.value;
        if (regSizeUnitEl) regSizeUnitEl.value = parsed.unit;
      }
    }
    if (pref) {
      if (gfTotalEl && pref.gfTotalCents != null) gfTotalEl.value = centsToDollars(pref.gfTotalCents);
      if (gfSizeValEl) gfSizeValEl.value = pref.gfSizeValue != null ? String(pref.gfSizeValue) : '';
      if (gfSizeUnitEl) gfSizeUnitEl.value = pref.gfSizeUnit || '';
      if (regSizeValEl && pref.regularSizeValue != null) regSizeValEl.value = String(pref.regularSizeValue);
      if (regSizeUnitEl) regSizeUnitEl.value = pref.regularSizeUnit || regSizeUnitEl.value || '';
    }
    gfLiveCalc();
  }

  function getCurrentGfReceipt() {
    try {
      var id = sessionStorage.getItem(GF_CURRENT_RECEIPT_KEY);
      var name = sessionStorage.getItem(GF_CURRENT_RECEIPT_NAME_KEY);
      var date = sessionStorage.getItem(GF_CURRENT_RECEIPT_DATE_KEY);
      return id ? { id: id, name: name || 'Receipt', date: date || null } : null;
    } catch (e) { return null; }
  }
  function setCurrentGfReceipt(receipt) {
    try {
      if (receipt) {
        sessionStorage.setItem(GF_CURRENT_RECEIPT_KEY, receipt.id);
        sessionStorage.setItem(GF_CURRENT_RECEIPT_NAME_KEY, receipt.name || 'Receipt');
        sessionStorage.setItem(GF_CURRENT_RECEIPT_DATE_KEY, receipt.date || '');
      } else {
        sessionStorage.removeItem(GF_CURRENT_RECEIPT_KEY);
        sessionStorage.removeItem(GF_CURRENT_RECEIPT_NAME_KEY);
        sessionStorage.removeItem(GF_CURRENT_RECEIPT_DATE_KEY);
      }
    } catch (e) {}
  }
  function renderGFReceiptState() {
    var noBlock = document.getElementById('gf-receipt-state');
    var hasBlock = document.getElementById('gf-receipt-has-current');
    var nameEl = document.getElementById('gf-receipt-current-name');
    var current = getCurrentGfReceipt();
    if (noBlock) noBlock.style.display = current ? 'none' : 'flex';
    if (hasBlock) hasBlock.style.display = current ? 'flex' : 'none';
    if (nameEl && current) nameEl.textContent = 'Current receipt: ' + current.name + (current.date ? ' (' + current.date + ')' : '') + ' — ';
  }

  function gfDollarsToCents(val) {
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }

  var GF_SIZE_UNITS = {
    g: { base: 1, kind: 'weight' },
    kg: { base: 1000, kind: 'weight' },
    oz: { base: 28.3495, kind: 'weight' },
    lb: { base: 453.592, kind: 'weight' },
    ml: { base: 1, kind: 'volume' },
    l: { base: 1000, kind: 'volume' }
  };

  function gfSizeToBase(value, unit) {
    if (value == null || value <= 0 || !unit) return null;
    var u = GF_SIZE_UNITS[unit.toLowerCase()];
    return u ? { base: value * u.base, kind: u.kind } : null;
  }

  function gfGetSizeRatio(gfVal, gfUnit, regVal, regUnit) {
    var gf = gfSizeToBase(gfVal, gfUnit);
    var reg = gfSizeToBase(regVal, regUnit);
    if (!gf || !reg || gf.kind !== reg.kind) return null;
    return gf.base / reg.base;
  }

  function gfGetSizeRatioFromRow(r) {
    if (r.gf_size_value != null && r.regular_size_value != null && r.gf_size_unit && r.regular_size_unit)
      return gfGetSizeRatio(Number(r.gf_size_value), r.gf_size_unit, Number(r.regular_size_value), r.regular_size_unit);
    if (r.gf_size_grams != null && r.regular_size_grams != null && r.regular_size_grams > 0)
      return Number(r.gf_size_grams) / Number(r.regular_size_grams);
    return null;
  }

  function gfIncrementalCents(gfTotalCents, quantity, regularUnitCents, sizeRatio) {
    if (!quantity || quantity <= 0) return 0;
    if (sizeRatio != null && sizeRatio > 0) {
      var effectiveRegularTotalCents = quantity * regularUnitCents * sizeRatio;
      return Math.max(0, Math.round(gfTotalCents - effectiveRegularTotalCents));
    }
    var gfUnitCents = Math.round(gfTotalCents / quantity);
    var incPerUnit = Math.max(0, gfUnitCents - regularUnitCents);
    return Math.round(incPerUnit * quantity);
  }

  function gfIncrementalCentsForRow(r) {
    var ratio = gfGetSizeRatioFromRow(r);
    return gfIncrementalCents(
      Number(r.gf_total_cents),
      Number(r.quantity),
      Number(r.regular_unit_price_cents),
      ratio
    );
  }

  async function gfRefreshProductsDropdown() {
    const sel = document.getElementById('gf-product-select');
    if (!sel) return;
    const { data } = await gfApi.productsList();
    gfProductsById = {};
    (data || []).forEach(function (p) { gfProductsById[p.id] = p; });
    const opts = ['<option value="">— Select or add product —</option>'].concat((data || []).map(p => `<option value="${p.id}" data-cents="${p.baseline_regular_unit_price_cents ?? ''}">${p.name}${p.unit_description ? ' (' + p.unit_description + ')' : ''}</option>`));
    sel.innerHTML = opts.join('');
  }

  async function gfMarkReceiptDone() {
    var current = getCurrentGfReceipt();
    if (!current) return;
    var result = await gfApi.gfReceiptUpdate(current.id, { done_at: new Date().toISOString() });
    if (result.error) { showAppToast(result.error.message || 'Could not mark receipt done.', true); return; }
    setCurrentGfReceipt(null);
    renderGFReceiptState();
    gfReceiptsListRender();
    var dateEl = document.getElementById('gf-purchase-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  }

  function gfLiveCalc() {
    const q = parseFloat(document.getElementById('gf-quantity')?.value) || 0;
    const gfInputCents = gfDollarsToCents(document.getElementById('gf-total-paid')?.value);
    const totalIsPerUnit = document.getElementById('gf-total-is-per-unit')?.checked;
    const gfTotalCents = totalIsPerUnit && q > 0 ? Math.round(gfInputCents * q) : gfInputCents;
    const regCents = gfDollarsToCents(document.getElementById('gf-regular-unit')?.value);
    var gfVal = parseFloat(document.getElementById('gf-size-value')?.value) || null;
    var gfUnit = document.getElementById('gf-size-unit')?.value || null;
    var regVal = parseFloat(document.getElementById('gf-regular-size-value')?.value) || null;
    var regUnit = document.getElementById('gf-regular-size-unit')?.value || null;
    var sizeRatio = gfGetSizeRatio(gfVal, gfUnit, regVal, regUnit);
    const unitPrice = document.getElementById('gf-unit-price-out');
    const incUnit = document.getElementById('gf-inc-unit-out');
    const incTotal = document.getElementById('gf-inc-total-out');
    if (!unitPrice || !incUnit || !incTotal) return;
    if (!q || q <= 0) {
      unitPrice.textContent = '—';
      incUnit.textContent = '—';
      incTotal.textContent = '—';
      return;
    }
    const gfUnitCents = Math.round(gfTotalCents / q);
    const useSize = sizeRatio != null && sizeRatio > 0;
    var incPerUnitCents, totalInc;
    if (useSize) {
      totalInc = gfIncrementalCents(gfTotalCents, q, regCents, sizeRatio);
      incPerUnitCents = q ? Math.round(totalInc / q) : 0;
    } else {
      incPerUnitCents = Math.max(0, gfUnitCents - regCents);
      totalInc = Math.round(incPerUnitCents * q);
    }
    unitPrice.textContent = '$' + centsToDollars(gfUnitCents);
    incUnit.textContent = '$' + centsToDollars(incPerUnitCents) + (useSize ? ' (size-adj.)' : '');
    incTotal.textContent = '$' + centsToDollars(totalInc) + (useSize ? ' (size-adj.)' : '');
    var mismatchHint = document.getElementById('gf-size-mismatch-hint');
    if (mismatchHint) {
      if (gfVal && gfUnit && regVal && regUnit && !useSize) {
        var gfB = gfSizeToBase(gfVal, gfUnit), regB = gfSizeToBase(regVal, regUnit);
        if (gfB && regB && gfB.kind !== regB.kind) {
          mismatchHint.textContent = 'One size is weight and the other is volume — size adjustment not applied.';
          mismatchHint.style.display = 'inline';
        } else { mismatchHint.textContent = ''; mismatchHint.style.display = 'none'; }
      } else { mismatchHint.textContent = ''; mismatchHint.style.display = 'none'; }
    }
  }

  function loadGFPanel() {
    const dateEl = document.getElementById('gf-purchase-date');
    var current = getCurrentGfReceipt();
    if (dateEl && !dateEl.value) dateEl.value = (current && current.date) ? current.date : new Date().toISOString().slice(0, 10);
    gfRefreshProductsDropdown();
    renderGFReceiptState();
    gfPurchasesListRender();
    gfReceiptsListRender();
    gfSummaryYearOptions();
    var newProductInline = document.getElementById('gf-new-product-inline');
    if (newProductInline) newProductInline.style.display = 'none';
    const cancelBtn = document.getElementById('gf-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    gfEditingPurchaseId = null;
    gfEditingReceiptId = null;
    var newProductBtn = document.getElementById('gf-product-new-btn');
    if (newProductBtn && !newProductBtn.getAttribute('data-gf-bound')) {
      newProductBtn.setAttribute('data-gf-bound', 'true');
      newProductBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (newProductInline) { newProductInline.style.display = 'block'; document.getElementById('gf-prod-name')?.focus(); }
      });
    }
    var addUseBtn = document.getElementById('gf-prod-add-use-btn');
    var prodCancelBtn = document.getElementById('gf-prod-cancel-btn');
    var prodBcBtn = document.getElementById('gf-prod-bc-avg-btn');
    if (addUseBtn && !addUseBtn.getAttribute('data-gf-bound')) { addUseBtn.setAttribute('data-gf-bound', 'true'); addUseBtn.addEventListener('click', gfAddAndUseProduct); }
    if (prodCancelBtn && !prodCancelBtn.getAttribute('data-gf-bound')) { prodCancelBtn.setAttribute('data-gf-bound', 'true'); prodCancelBtn.addEventListener('click', function () { if (newProductInline) newProductInline.style.display = 'none'; }); }
    if (prodBcBtn && !prodBcBtn.getAttribute('data-gf-bound')) { prodBcBtn.setAttribute('data-gf-bound', 'true'); prodBcBtn.addEventListener('click', function () { gfFetchBCAverage(); }); }
    var doneBtn = document.getElementById('gf-receipt-done-btn');
    if (doneBtn && !doneBtn.getAttribute('data-gf-bound')) {
      doneBtn.setAttribute('data-gf-bound', 'true');
      doneBtn.addEventListener('click', function () { gfMarkReceiptDone(); });
    }
  }

  function gfSummaryYearOptions() {
    const sel = document.getElementById('gf-summary-year');
    if (!sel) return;
    const y = new Date().getFullYear();
    sel.innerHTML = ['<option value="">Custom range below</option>'].concat([y, y - 1, y - 2].map(yr => `<option value="${yr}">${yr} (Jan 1 – Dec 31)</option>`)).join('');
  }

  async function gfPurchasesListRender() {
    const list = document.getElementById('gf-purchases-list');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    const { data, error } = await gfApi.purchasesList({});
    if (error) { list.innerHTML = '<p class="empty-state">Could not load.</p>'; return; }
    const rows = (data || []).slice(0, 50);
    if (rows.length === 0) {
      list.innerHTML = '<p class="empty-state">No GF lines yet. Upload a receipt, pick a product, and save a line.</p>';
      return;
    }
    list.innerHTML = rows.map(r => {
      const incCents = gfIncrementalCentsForRow(r);
      return `<div class="entry-row" data-id="${escapeHtmlAttr(r.id)}">
        <span class="date">${formatDate(r.purchase_date)}</span>
        <span class="meta">${escapeHtml(r.product_name)} × ${Number(r.quantity)}</span>
        <span class="amount">GF $${centsToDollars(r.gf_total_cents)} → +$${centsToDollars(incCents)}</span>
        <div class="actions">
          <button type="button" class="edit-btn" data-id="${r.id}">Edit</button>
          <button type="button" class="delete-btn" data-id="${r.id}">Delete</button>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => gfEditPurchase(btn.dataset.id)));
    list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => gfDeletePurchase(btn.dataset.id)));
  }

  async function gfReceiptsListRender() {
    var list = document.getElementById('gf-receipts-list');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    var result = await gfApi.gfReceiptsList();
    if (result.error) { list.innerHTML = '<p class="empty-state">Could not load receipts.</p>'; return; }
    var receipts = result.data || [];
    if (receipts.length === 0) {
      list.innerHTML = '<p class="empty-state">No receipts yet. Upload a receipt above to start.</p>';
      return;
    }
    list.innerHTML = receipts.map(function (r) {
      var dateLabel = r.receipt_date ? formatDate(r.receipt_date) : (r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
      var doneLabel = r.done_at ? ' <span class="gf-receipt-done">Done</span>' : '';
      return '<div class="entry-row gf-receipt-row" data-path="' + escapeHtmlAttr(r.file_path || '') + '">' +
        '<span class="date">' + escapeHtml(dateLabel) + '</span>' +
        '<span class="meta">' + escapeHtml(r.file_name || 'Receipt') + doneLabel + '</span>' +
        '<div class="actions"><button type="button" class="view-receipt-btn">View</button></div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('.view-receipt-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.gf-receipt-row');
        var path = row && row.getAttribute('data-path');
        if (!path) return;
        gfApi.getGfReceiptUrl(path).then(function (res) {
          if (res.error) { showAppToast(res.error.message || 'Could not open receipt.', true); return; }
          if (res.url) window.open(res.url, '_blank');
        });
      });
    });
  }

  async function gfSaveLine() {
    const productSelect = document.getElementById('gf-product-select');
    const productId = productSelect?.value || null;
    let productName = (productSelect?.selectedOptions?.[0]?.textContent?.replace(/\s*\([^)]*\)\s*$/, '').trim()) || '';
    if ((!productName || productName.startsWith('—')) && gfEditingPurchaseId && gfEditingProductName) productName = gfEditingProductName;
    const dateEl = document.getElementById('gf-purchase-date');
    const quantity = parseFloat(document.getElementById('gf-quantity')?.value);
    const gfTotalCents = gfDollarsToCents(document.getElementById('gf-total-paid')?.value);
    const regularUnitCents = gfDollarsToCents(document.getElementById('gf-regular-unit')?.value);
    var currentReceipt = getCurrentGfReceipt();
    const receiptId = gfEditingPurchaseId ? (gfEditingReceiptId || null) : (currentReceipt ? currentReceipt.id : null);
    if (!dateEl?.value) { showAppToast('Please set date.', true); return; }
    if (!quantity || quantity <= 0) { showAppToast('Please enter a quantity greater than 0.', true); return; }
    if (!productName || productName.startsWith('—')) { showAppToast('Please select or add a product.', true); return; }
    const totalIsPerUnit = document.getElementById('gf-total-is-per-unit')?.checked;
    const effectiveGfTotalCents = totalIsPerUnit ? Math.round(gfDollarsToCents(document.getElementById('gf-total-paid')?.value) * quantity) : gfTotalCents;
    if (effectiveGfTotalCents < 0) { showAppToast('Please enter GF total paid (0 or more).', true); return; }
    if (regularUnitCents < 0) { showAppToast('Please enter regular price per unit (0 or more).', true); return; }
    var gfVal = parseFloat(document.getElementById('gf-size-value')?.value) || null;
    var gfUnit = document.getElementById('gf-size-unit')?.value || null;
    var regVal = parseFloat(document.getElementById('gf-regular-size-value')?.value) || null;
    var regUnit = document.getElementById('gf-regular-size-unit')?.value || null;
    var sizeRatio = gfGetSizeRatio(gfVal, gfUnit, regVal, regUnit);
    const incCents = gfIncrementalCents(effectiveGfTotalCents, quantity, regularUnitCents, sizeRatio);
    if (incCents === 0) {
      if (!confirm('Incremental cost is $0. Save anyway?')) return;
    }
    const payload = {
      purchase_date: dateEl.value,
      receipt_id: receiptId || null,
      product_id: productId || null,
      product_name: productName,
      quantity,
      gf_total_cents: effectiveGfTotalCents,
      regular_unit_price_cents: regularUnitCents,
      gf_size_value: gfVal,
      gf_size_unit: gfUnit || null,
      regular_size_value: regVal,
      regular_size_unit: regUnit || null,
      includes_only_you: true
    };
    if (gfEditingPurchaseId) {
      const { error } = await gfApi.purchaseUpdate(gfEditingPurchaseId, payload);
      if (error) { showAppToast(error.message || 'Update failed', true); return; }
      gfEditingPurchaseId = null;
      document.getElementById('gf-cancel-edit-btn').style.display = 'none';
    } else {
      const { error } = await gfApi.purchaseInsert(payload);
      if (error) { showAppToast(error.message || 'Insert failed', true); return; }
    }

    if (productId) {
      setGfProductPref(productId, {
        regularUnitPriceCents: regularUnitCents,
        gfTotalCents: effectiveGfTotalCents,
        gfSizeValue: gfVal,
        gfSizeUnit: gfUnit || '',
        regularSizeValue: regVal,
        regularSizeUnit: regUnit || ''
      });
      const unitDescription = (regVal != null && regVal > 0 && regUnit) ? ('per ' + regVal + ' ' + regUnit) : null;
      await gfApi.productUpsert({
        id: productId,
        name: productName,
        baseline_regular_unit_price_cents: regularUnitCents,
        unit_description: unitDescription
      });
    }

    gfPurchasesListRender();
    document.getElementById('gf-quantity').value = '';
    var perUnitChk = document.getElementById('gf-total-is-per-unit');
    if (perUnitChk) perUnitChk.checked = false;
    if (productId) {
      applyGfProductPrefill(productId);
    } else {
      document.getElementById('gf-total-paid').value = '';
      document.getElementById('gf-regular-unit').value = '';
      var sv = document.getElementById('gf-size-value'), su = document.getElementById('gf-size-unit');
      var rv = document.getElementById('gf-regular-size-value'), ru = document.getElementById('gf-regular-size-unit');
      if (sv) sv.value = ''; if (su) su.value = ''; if (rv) rv.value = ''; if (ru) ru.value = '';
    }
    gfLiveCalc();
  }

  async function gfEditPurchase(id) {
    const { data, error } = await gfApi.purchasesList({});
    if (error || !data) return;
    const r = data.find(x => x.id === id);
    if (!r) return;
    gfEditingPurchaseId = id;
    gfEditingProductName = r.product_name || null;
    document.getElementById('gf-purchase-date').value = r.purchase_date;
    document.getElementById('gf-product-select').value = r.product_id || '';
    document.getElementById('gf-quantity').value = r.quantity;
    document.getElementById('gf-total-paid').value = centsToDollars(r.gf_total_cents);
    document.getElementById('gf-regular-unit').value = centsToDollars(r.regular_unit_price_cents);
    var sv = document.getElementById('gf-size-value'), su = document.getElementById('gf-size-unit');
    var rv = document.getElementById('gf-regular-size-value'), ru = document.getElementById('gf-regular-size-unit');
    if (sv) sv.value = r.gf_size_value != null ? r.gf_size_value : (r.gf_size_grams != null ? r.gf_size_grams : '');
    if (su) su.value = r.gf_size_unit || (r.gf_size_grams != null ? 'g' : '');
    if (rv) rv.value = r.regular_size_value != null ? r.regular_size_value : (r.regular_size_grams != null ? r.regular_size_grams : '');
    if (ru) ru.value = r.regular_size_unit || (r.regular_size_grams != null ? 'g' : '');
    gfEditingReceiptId = r.receipt_id || null;
    document.getElementById('gf-cancel-edit-btn').style.display = 'inline-block';
    gfLiveCalc();
  }

  function gfDeletePurchase(id) {
    if (!confirm('Delete this GF line?')) return;
    gfApi.purchaseDelete(id).then(({ error }) => {
      if (error) showAppToast(error.message || 'Delete failed', true);
      else { gfPurchasesListRender(); if (gfEditingPurchaseId === id) { gfEditingPurchaseId = null; document.getElementById('gf-cancel-edit-btn').style.display = 'none'; } }
    });
  }

  function gfAggregateSummary(purchases) {
    const byName = {};
    purchases.forEach(r => {
      const key = r.product_name;
      if (!byName[key]) byName[key] = { total_quantity: 0, sum_regular: 0, sum_gf: 0, incremental_total_cents: 0, count: 0 };
      const q = Number(r.quantity);
      byName[key].total_quantity += q;
      byName[key].sum_regular += Number(r.regular_unit_price_cents) * q;
      byName[key].sum_gf += Number(r.gf_total_cents);
      byName[key].incremental_total_cents += gfIncrementalCentsForRow(r);
      byName[key].count += 1;
    });
    return Object.entries(byName).map(([product_name, o]) => {
      const avgRegular = o.total_quantity ? Math.round(o.sum_regular / o.total_quantity) : 0;
      const avgGf = o.total_quantity ? Math.round(o.sum_gf / o.total_quantity) : 0;
      const incremental_total_cents = Math.round(o.incremental_total_cents);
      const incPerUnit = o.total_quantity ? Math.round(incremental_total_cents / o.total_quantity) : 0;
      return {
        product_name,
        total_quantity: o.total_quantity,
        avg_regular_unit_price_cents: avgRegular,
        avg_gf_unit_price_cents: avgGf,
        incremental_per_unit_cents: incPerUnit,
        incremental_total_cents: incremental_total_cents
      };
    });
  }

  function gfBuildSummaryCsvFromContext(ctx) {
    if (!ctx || !ctx.rows || ctx.rows.length === 0) return '';
    const lines = [];
    lines.push('"Product","# bought","Avg regular/unit","Avg GF/unit","Incremental/unit","Amount to claim"');
    ctx.rows.forEach(r => {
      lines.push([
        '"' + String(r.product_name).replace(/"/g, '""') + '"',
        String(r.total_quantity),
        '"$' + centsToDollars(r.avg_regular_unit_price_cents) + '"',
        '"$' + centsToDollars(r.avg_gf_unit_price_cents) + '"',
        '"$' + centsToDollars(r.incremental_per_unit_cents) + '"',
        '"$' + centsToDollars(r.incremental_total_cents) + '"'
      ].join(','));
    });
    lines.push('');
    lines.push('"Total incremental gluten-free cost for this period: $' + centsToDollars(ctx.totalCents) + ' (use as medical expense on lines 33099/33199)."');
    if (ctx.from && ctx.to) lines.push('', '"Period: ' + String(ctx.from) + ' to ' + String(ctx.to).replace(/"/g, '""') + '"');
    return lines.join('\n');
  }

  async function gfSummaryApply() {
    const yearSel = document.getElementById('gf-summary-year');
    const fromEl = document.getElementById('gf-summary-from');
    const toEl = document.getElementById('gf-summary-to');
    let from, to;
    if (yearSel?.value) {
      const y = parseInt(yearSel.value, 10);
      from = y + '-01-01';
      to = y + '-12-31';
    } else {
      from = fromEl?.value;
      to = toEl?.value;
    }
    if (!from || !to) { showAppToast('Choose a year or enter from/to dates.', true); return; }
    const { data, error } = await gfApi.purchasesList({ from, to });
    if (error) {
      gfLastSummaryContext = null;
      document.getElementById('gf-summary-table-wrap').innerHTML = '<p class="empty-state">Could not load.</p>';
      return;
    }
    const purchases = data || [];
    const rows = gfAggregateSummary(purchases);
    const totalCents = rows.reduce((s, r) => s + r.incremental_total_cents, 0);
    gfLastSummaryContext = { purchases, rows, totalCents, from, to };
    const tableWrap = document.getElementById('gf-summary-table-wrap');
    const totalLine = document.getElementById('gf-summary-total');
    if (rows.length === 0) {
      tableWrap.innerHTML = '<p class="empty-state">No GF purchases in this period.</p>';
      totalLine.textContent = '';
      return;
    }
    tableWrap.innerHTML = `
      <table class="report-table"><thead><tr>
        <th>Product</th><th># bought</th><th>Avg regular/unit</th><th>Avg GF/unit</th><th>Incremental/unit</th><th>Amount to claim</th>
      </tr></thead><tbody>
        ${rows.map(r => `<tr>
          <td>${escapeHtml(r.product_name)}</td>
          <td>${r.total_quantity}</td>
          <td class="amount">$${centsToDollars(r.avg_regular_unit_price_cents)}</td>
          <td class="amount">$${centsToDollars(r.avg_gf_unit_price_cents)}</td>
          <td class="amount">$${centsToDollars(r.incremental_per_unit_cents)}</td>
          <td class="amount">$${centsToDollars(r.incremental_total_cents)}</td>
        </tr>`).join('')}
      </tbody></table>
    `;
    totalLine.innerHTML = '<strong>Total incremental gluten-free cost for this period: $' + centsToDollars(totalCents) + '</strong> (use as medical expense on lines 33099/33199).';
  }

  function gfExportCsv() {
    const ctx = gfLastSummaryContext;
    if (ctx && ctx.rows && ctx.rows.length > 0) {
      const csv = gfBuildSummaryCsvFromContext(ctx);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gf-medical-summary.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    const tableWrap = document.getElementById('gf-summary-table-wrap');
    const table = tableWrap?.querySelector('table');
    if (!table) { showAppToast('Run the summary first (choose period and click Apply).', true); return; }
    const rows = table.querySelectorAll('tr');
    const lines = [];
    rows.forEach(tr => {
      const cells = tr.querySelectorAll('th, td');
      lines.push(Array.from(cells).map(c => '"' + c.textContent.trim().replace(/"/g, '""') + '"').join(','));
    });
    const totalLine = document.getElementById('gf-summary-total')?.textContent || '';
    if (totalLine) lines.push('', totalLine);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gf-medical-summary.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function gfExportReportWithReceiptsZip() {
    const ctx = gfLastSummaryContext;
    if (!ctx || !ctx.purchases || ctx.purchases.length === 0) {
      showAppToast('Run the summary first (choose period and click Apply).', true);
      return;
    }
    if (!ctx.rows || ctx.rows.length === 0) {
      showAppToast('No GF purchases in this period — nothing to put in the report.', true);
      return;
    }
    if (typeof JSZip === 'undefined') {
      showAppToast('ZIP helper did not load. Refresh the page and try again.', true);
      return;
    }
    const btn = document.getElementById('gf-export-zip-btn');
    var prevText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Building ZIP…'; }
    try {
      const zip = new JSZip();
      zip.file('gf-medical-summary.csv', gfBuildSummaryCsvFromContext(ctx));
      zip.file('READ_ME.txt', [
        'Gluten-free medical expense report pack',
        '',
        'Period: ' + ctx.from + ' to ' + ctx.to,
        '',
        'gf-medical-summary.csv — incremental GF amounts by product (CRA-style summary).',
        'receipts/ — files linked to GF line items in this period (for your records).',
        '',
        'Use the summary total as part of medical expenses (lines 33099/33199) when filing.'
      ].join('\n'));

      const receiptIdSet = new Set();
      ctx.purchases.forEach(function (p) {
        if (p.receipt_id) receiptIdSet.add(p.receipt_id);
      });
      const ids = Array.from(receiptIdSet);
      const receiptsFolder = zip.folder('receipts');
      const missing = [];
      const fetchFailed = [];
      const usedNames = {};

      if (ids.length) {
        const { data: recRows, error: recErr } = await gfApi.gfReceiptsByIds(ids);
        if (recErr) {
          showAppToast(recErr.message || String(recErr) || 'Could not load receipt list.', true);
          return;
        }
        const byId = {};
        (recRows || []).forEach(function (r) { byId[r.id] = r; });
        for (var i = 0; i < ids.length; i++) {
          var rid = ids[i];
          var rec = byId[rid];
          if (!rec) {
            missing.push(rid);
            continue;
          }
          var urlRes = await gfApi.getGfReceiptUrl(rec.file_path);
          if (urlRes.error || !urlRes.url) {
            fetchFailed.push(rec.file_name || rid);
            continue;
          }
          try {
            var res = await fetch(urlRes.url);
            if (!res.ok) {
              fetchFailed.push(rec.file_name || rid);
              continue;
            }
            var fileBlob = await res.blob();
            var baseName = (rec.file_name || 'receipt').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            if (!baseName.trim()) baseName = 'receipt';
            var safeName = rid.slice(0, 8) + '_' + baseName;
            if (usedNames[safeName]) {
              usedNames[safeName] += 1;
              var dot = safeName.lastIndexOf('.');
              if (dot > 0) {
                safeName = safeName.slice(0, dot) + '_' + usedNames[safeName] + safeName.slice(dot);
              } else {
                safeName = safeName + '_' + usedNames[safeName];
              }
            } else {
              usedNames[safeName] = 1;
            }
            receiptsFolder.file(safeName, fileBlob);
          } catch (e) {
            fetchFailed.push(rec.file_name || rid);
          }
        }
      }

      var notes = [];
      if (ids.length === 0) notes.push('No receipt files were linked to GF line items in this period.');
      if (missing.length) notes.push('Missing receipt records in database: ' + missing.join(', '));
      if (fetchFailed.length) notes.push('Could not download file: ' + fetchFailed.join(', '));
      if (notes.length) receiptsFolder.file('_notes.txt', notes.join('\n'));

      var outBlob = await zip.generateAsync({ type: 'blob' });
      var nameSafe = ('gf-medical-report_' + ctx.from + '_' + ctx.to).replace(/[^a-zA-Z0-9._-]/g, '-');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(outBlob);
      a.download = nameSafe + '.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText || 'Download report + receipts (ZIP)';
      }
    }
  }

  async function gfAddAndUseProduct() {
    const name = document.getElementById('gf-prod-name')?.value?.trim();
    if (!name) { showAppToast('Enter product name.', true); return; }
    const baseline = document.getElementById('gf-prod-baseline')?.value;
    const baselineCents = baseline !== '' && baseline !== undefined ? gfDollarsToCents(baseline) : null;
    const sizeVal = document.getElementById('gf-prod-size-value')?.value;
    const sizeUnit = document.getElementById('gf-prod-size-unit')?.value || null;
    const sizeNum = sizeVal !== '' && sizeVal != null ? parseFloat(sizeVal) : null;
    var unitDescription = null;
    if (sizeNum != null && sizeNum > 0 && sizeUnit) unitDescription = 'per ' + sizeNum + ' ' + sizeUnit;
    const row = { name, baseline_regular_unit_price_cents: baselineCents, unit_description: unitDescription };
    const { data, error } = await gfApi.productUpsert(row);
    if (error) { showAppToast(error.message || 'Save failed', true); return; }
    var inline = document.getElementById('gf-new-product-inline');
    if (inline) inline.style.display = 'none';
    await gfRefreshProductsDropdown();
    var sel = document.getElementById('gf-product-select');
    if (sel && data && data.id) sel.value = data.id;
    if (baseline !== '' && baseline !== undefined) document.getElementById('gf-regular-unit').value = baseline;
    if (sizeNum != null && sizeNum > 0 && sizeUnit) {
      document.getElementById('gf-regular-size-value').value = sizeNum;
      document.getElementById('gf-regular-size-unit').value = sizeUnit;
    }
    document.getElementById('gf-prod-name').value = '';
    document.getElementById('gf-prod-baseline').value = '';
    document.getElementById('gf-prod-size-value').value = '';
    document.getElementById('gf-prod-size-unit').value = '';
    var h = document.getElementById('gf-prod-bc-hint');
    if (h) h.textContent = '';
    gfLiveCalc();
  }

  const STATCAN_PID_FOOD = 18100245;
  const GF_STATCAN_PRODUCT_MAP = {
    bread: ['bread', 'Bread'],
    pasta: ['pasta', 'spaghetti', 'Spaghetti'],
    flour: ['flour', 'Flour'],
    crackers: ['crackers', 'Crackers'],
    cookies: ['cookies', 'Cookies'],
    'baking mix': ['baking', 'mix'],
    cereal: ['cereal', 'Cereal'],
    rice: ['rice', 'Rice']
  };

  async function statcanFetchBCPrice(productName) {
    if (!productName || typeof productName !== 'string') return { error: 'Enter a product name.' };
    const key = productName.toLowerCase().trim();
    let productMatch = null;
    for (const [mapKey, keywords] of Object.entries(GF_STATCAN_PRODUCT_MAP)) {
      if (keywords.some(kw => key.includes(kw) || mapKey.includes(key))) {
        productMatch = mapKey;
        break;
      }
    }
    if (!productMatch) return { error: 'Product not in lookup list. Try: bread, pasta, flour, crackers, cookies, cereal, rice, or add price manually.' };

    try {
      const metaRes = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ productId: STATCAN_PID_FOOD }])
      });
      if (!metaRes.ok) return { error: 'Could not load price data (StatsCan metadata).' };
      const metaJson = await metaRes.json();
      const meta = Array.isArray(metaJson) ? metaJson[0] : metaJson;
      if (!meta?.object?.dimension) return { error: 'Unexpected StatsCan response.' };

      const dimensions = meta.object.dimension;
      let geoMemberId = null;
      let productMemberId = null;
      const coordParts = [];

      for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i];
        const nameEn = (dim.dimensionNameEn || '').toLowerCase();
        const members = dim.member || [];
        if (nameEn.includes('geograph')) {
          const bc = members.find(m => (m.memberNameEn || '').toLowerCase().includes('british columbia'));
          geoMemberId = bc ? bc.memberId : (members[0]?.memberId);
          coordParts.push(geoMemberId != null ? geoMemberId : 0);
        } else if (nameEn.includes('product') || nameEn.includes('item')) {
          const match = members.find(m => {
            const en = (m.memberNameEn || '').toLowerCase();
            return GF_STATCAN_PRODUCT_MAP[productMatch].some(kw => en.includes(kw));
          });
          productMemberId = match ? match.memberId : (members[0]?.memberId);
          coordParts.push(productMemberId != null ? productMemberId : 0);
        } else {
          coordParts.push(members[0]?.memberId != null ? members[0].memberId : 0);
        }
      }
      while (coordParts.length < 10) coordParts.push(0);
      const coordinate = coordParts.slice(0, 10).join('.');

      const dataRes = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ productId: STATCAN_PID_FOOD, coordinate, latestN: 1 }])
      });
      if (!dataRes.ok) return { error: 'Could not load price value.' };
      const dataJson = await dataRes.json();
      const dataObj = Array.isArray(dataJson) ? dataJson[0] : dataJson;
      const points = dataObj?.object?.vectorDataPoint;
      if (!points || points.length === 0) return { error: 'No recent price for this product in BC.' };

      const pt = points[0];
      let value = parseFloat(pt.value);
      if (Number.isNaN(value)) return { error: 'Invalid price value.' };
      const decimals = pt.decimals != null ? pt.decimals : 2;
      if (decimals > 0 && value > 0 && value < 100) value = Math.round(value * 100) / 100;
      const refPer = pt.refPer || pt.refPerRaw || '';
      const periodLabel = refPer ? (refPer.slice(0, 7).replace('-', ' ') + ' (BC)') : 'BC average';

      return { priceDollars: value, label: periodLabel };
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) return { error: 'Network or CORS: use the Supabase Edge Function for BC lookup (see README).' };
      return { error: (err.message || 'Lookup failed.') };
    }
  }

  async function fetchBCAverageForProduct(productName) {
    if (!productName) return { error: 'Enter a product name first.' };
    return await statcanFetchBCPrice(productName);
  }

  function gfFetchBCAverage() {
    document.getElementById('gf-prod-bc-hint').textContent = 'Loading…';
    fetchBCAverageForProduct(document.getElementById('gf-prod-name')?.value?.trim()).then(result => {
      const hint = document.getElementById('gf-prod-bc-hint');
      if (result.error) { hint.textContent = result.error; return; }
      document.getElementById('gf-prod-baseline').value = result.priceDollars != null ? result.priceDollars.toFixed(2) : '';
      hint.textContent = result.label || 'BC average applied.';
    });
  }

  function initGFPanelListeners() {
    document.getElementById('gf-product-select')?.addEventListener('change', () => {
      const sel = document.getElementById('gf-product-select');
      const opt = sel?.selectedOptions?.[0];
      const cents = opt?.dataset?.cents;
      if (cents !== undefined && cents !== '') document.getElementById('gf-regular-unit').value = (parseInt(cents, 10) / 100).toFixed(2);
      applyGfProductPrefill(sel?.value || null);
      gfLiveCalc();
    });
    ['gf-quantity', 'gf-total-paid', 'gf-regular-unit', 'gf-size-value', 'gf-regular-size-value', 'gf-size-unit', 'gf-regular-size-unit', 'gf-total-is-per-unit'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', gfLiveCalc);
      document.getElementById(id)?.addEventListener('change', gfLiveCalc);
    });
    document.getElementById('gf-save-line-btn')?.addEventListener('click', gfSaveLine);
    document.getElementById('gf-cancel-edit-btn')?.addEventListener('click', () => {
      gfEditingPurchaseId = null;
      gfEditingProductName = null;
      document.getElementById('gf-cancel-edit-btn').style.display = 'none';
    });
    document.getElementById('gf-receipt-upload-btn')?.addEventListener('click', () => document.getElementById('gf-receipt-file').click());
    document.getElementById('gf-receipt-file')?.addEventListener('change', async (e) => {
      var file = e.target.files[0];
      if (!file) return;
      var dateEl = document.getElementById('gf-purchase-date');
      var result = await gfApi.gfReceiptUpload(file, dateEl && dateEl.value ? dateEl.value : null);
      e.target.value = '';
      if (result.error) { showAppToast(result.error.message || 'Upload failed', true); return; }
      var data = result.data;
      if (data && data.id) {
        setCurrentGfReceipt({
          id: data.id,
          name: data.file_name || file.name,
          date: data.receipt_date || (dateEl && dateEl.value ? dateEl.value : null)
        });
        if (data.receipt_date && dateEl) dateEl.value = data.receipt_date;
        renderGFReceiptState();
        gfReceiptsListRender();
      }
    });
    document.getElementById('gf-summary-apply')?.addEventListener('click', gfSummaryApply);
    document.getElementById('gf-export-btn')?.addEventListener('click', gfExportCsv);
    document.getElementById('gf-export-zip-btn')?.addEventListener('click', function () { gfExportReportWithReceiptsZip(); });
    document.getElementById('gf-print-btn')?.addEventListener('click', gfPrintSummary);
  }

  function gfPrintSummary() {
    const tableWrap = document.getElementById('gf-summary-table-wrap');
    const totalLine = document.getElementById('gf-summary-total');
    const table = tableWrap?.querySelector('table');
    if (!table || !totalLine?.textContent) {
      showAppToast('Run the summary first (choose period and click Apply).', true);
      return;
    }
    const win = window.open('', '_blank');
    const totalText = totalLine.textContent || totalLine.innerText || '';
    win.document.write(
      '<!DOCTYPE html><html><head><title>GF Medical Summary</title>' +
      '<style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:800px;margin:0 auto} table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:0.5rem;border-bottom:1px solid #ddd} td.amount{text-align:right} .total{margin-top:1rem;font-weight:bold}</style></head><body>' +
      '<h1>Gluten-free medical expense summary</h1><p>Use as part of your medical expenses (lines 33099/33199).</p>' +
      table.outerHTML + '<p class="total">' + escapeHtml(totalText) + '</p>' +
      '</body></html>'
    );
    win.document.close();
  }

  function initAuth() {
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    const userEmail = document.getElementById('user-email');

    function setLoggedIn(user) {
      if (user) {
        authScreen.style.display = 'none';
        mainApp.classList.add('visible');
        if (userEmail) userEmail.textContent = user.email;
        initReportDates();
        setPanel('dashboard');
      } else {
        authScreen.style.display = 'flex';
        mainApp.classList.remove('visible');
      }
    }

    const sb = acctApi.getClient();
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => setLoggedIn(session?.user));
      acctApi.onAuthChange((event, session) => setLoggedIn(session?.user));
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

  initAuth();
})();
