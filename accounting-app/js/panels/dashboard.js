import { apiErrorMessage } from '../ledger-api-helpers.js';
import { isBusinessExpense } from '../ledger-constants.js';
import { escapeHtml, formatDate } from '../ui-helpers.js';
import { centsToDollars } from '../ledger-pure.js';

export function createDashboardPanel(deps) {
  const { acctApi, incomeLineMeta, expenseLineMeta, getDefaultMonth } = deps;
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

  return { renderDashboard };
}
