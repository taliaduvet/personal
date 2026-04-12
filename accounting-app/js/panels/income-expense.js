import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, INCOME_TYPES, categoryDisplayLabel } from '../ledger-constants.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm, formatDate } from '../ui-helpers.js';
import { toCents, centsToDollars } from '../ledger-pure.js';

export function createIncomeExpensePanel(deps) {
  const { acctApi, normalizeIncomeTypeForDb, getDefaultMonth, renderDashboard, incomeLineMeta, expenseLineMeta } = deps;
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

  function loadPlannedDropdown(selectId, type, selectedId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    acctApi.plannedList().then(({ data }) => {
      const list = (data || []).filter(p => p.type === type);
      sel.innerHTML = '<option value="">—</option>' + list.map(p => `<option value="${escapeHtmlAttr(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.label)} ($${centsToDollars(p.amount_cents)})</option>`).join('');
    });
  }

  function deleteIncome(id, triggerEl) {
    showInlineConfirm(triggerEl, 'Delete this income entry?', () => {
      acctApi.incomeDelete(id).then(({ error }) => {
        if (error) showAppToast(error.message || 'Delete failed', true);
        else { incomeListRender(); renderDashboard(); }
      });
    });
  }

  function deleteExpense(id, triggerEl) {
    showInlineConfirm(triggerEl, 'Delete this expense entry?', () => {
      acctApi.expensesDelete(id).then(({ error }) => {
        if (error) showAppToast(error.message || 'Delete failed', true);
        else { expenseListRender(); renderDashboard(); }
      });
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
    acctApi.incomeInRange(from, to).then(({ data, error }) => {
      if (error) {
        const msg = 'Could not load income. ' + (apiErrorMessage(error) || 'Check your connection and try again.');
        console.error('incomeListRender API error', error);
        const summaryEl = document.getElementById('income-summary');
        const byTypeEl = document.getElementById('income-by-type');
        const list = document.getElementById('income-list');
        const errHtml = '<p class="report-error" role="alert">' + escapeHtml(msg) + '</p>';
        if (summaryEl) summaryEl.innerHTML = errHtml;
        if (byTypeEl) byTypeEl.innerHTML = '';
        if (list) list.innerHTML = '';
        return;
      }
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
      list.querySelectorAll('.delete-btn').forEach(btn => { btn.addEventListener('click', () => deleteIncome(btn.dataset.id, btn)); });
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
    acctApi.expensesInRange(from, to).then(({ data, error }) => {
      if (error) {
        const msg = 'Could not load expenses. ' + (apiErrorMessage(error) || 'Check your connection and try again.');
        console.error('expenseListRender API error', error);
        const summaryEl = document.getElementById('expense-summary');
        const byCatEl = document.getElementById('expense-by-category');
        const list = document.getElementById('expense-list');
        const errHtml = '<p class="report-error" role="alert">' + escapeHtml(msg) + '</p>';
        if (summaryEl) summaryEl.innerHTML = errHtml;
        if (byCatEl) byCatEl.innerHTML = '';
        if (list) list.innerHTML = '';
        return;
      }
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
        btn.addEventListener('click', () => deleteExpense(btn.dataset.id, btn));
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
      const income_type = (typeEl && typeEl.value) ? normalizeIncomeTypeForDb(typeEl.value) : null;
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

  return {
    initCategoryPicker,
    loadPlannedDropdown,
    buildIncomeForm,
    buildExpenseForm,
    incomeListRender,
    expenseListRender,
    openIncomeForm,
    openExpenseForm,
    bindIncomeForm,
    bindExpenseForm,
    loadExpenseReceipts,
    deleteIncome,
    deleteExpense
  };
}
