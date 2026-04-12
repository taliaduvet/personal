import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, categoryDisplayLabel, isBusinessExpense } from '../ledger-constants.js';
import { escapeHtml, formatDate } from '../ui-helpers.js';
import { centsToDollars } from '../ledger-pure.js';

export function createReportsPanel(deps) {
  const { acctApi } = deps;
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

  return { runReport, initReportDates };
}
