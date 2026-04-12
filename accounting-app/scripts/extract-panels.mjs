/**
 * One-off helper: slices app.js into js/panels/*.js factories.
 * Run from accounting-app: node scripts/extract-panels.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const lines = readFileSync(join(root, 'app.js'), 'utf8').split(/\r?\n/);

function slice(start, end) {
  // 1-based inclusive start, 1-based inclusive end
  return lines.slice(start - 1, end).join('\n');
}

function indent(s, n) {
  const pad = ' '.repeat(n);
  return s
    .split('\n')
    .map((l) => (l.trim() === '' ? l : pad + l))
    .join('\n');
}

const panels = [
  {
    name: 'budget.js',
    start: 175,
    end: 417,
    imports: `import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, INCOME_TYPES, categoryDisplayLabel } from '../ledger-constants.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm, formatDate } from '../ui-helpers.js';
import { plannedAmountInPeriod, toCents, centsToDollars } from '../ledger-pure.js';
`,
    factory: 'createBudgetPanel',
    returns:
      'return {\n    getBudgetPeriod,\n    renderBudgetPanel,\n    buildPlannedTableRow,\n    openPlannedForm,\n    deletePlanned\n  };'
  },
  {
    name: 'dashboard.js',
    start: 419,
    end: 480,
    imports: `import { apiErrorMessage } from '../ledger-api-helpers.js';
import { isBusinessExpense } from '../ledger-constants.js';
import { escapeHtml, formatDate } from '../ui-helpers.js';
import { centsToDollars } from '../ledger-pure.js';
`,
    factory: 'createDashboardPanel',
    returns:
      'return { renderDashboard };'
  },
  {
    name: 'income-expense.js',
    start: 482,
    end: 875,
    imports: `import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, INCOME_TYPES, categoryDisplayLabel } from '../ledger-constants.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, formatDate } from '../ui-helpers.js';
import { toCents, centsToDollars } from '../ledger-pure.js';
`,
    factory: 'createIncomeExpensePanel',
    returns:
      `return {
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
  };`
  },
  {
    name: 'bank.js',
    start: 877,
    end: 1453,
    imports: `import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, INCOME_TYPES, categoryDisplayLabel } from '../ledger-constants.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm } from '../ui-helpers.js';
import { guessVendorFromBankDescription, normalizeDate, suggestFromRules, toCents, centsToDollars } from '../ledger-pure.js';
`,
    factory: 'createBankPanel',
    depsExtra:
      'normalizeIncomeTypeForDb,\n    initCategoryPicker,\n    signedCentsFromBankRow,\n    parseBankCsvMoneyCents,\n    descriptionLooksLikeIncome,\n    guessBankEntryType',
    returns:
      `return {
    onBankFileChosen,
    loadBankReconcile,
    onBankIgnore
  };`
  },
  {
    name: 'reports.js',
    start: 1473,
    end: 1546,
    imports: `import { apiErrorMessage } from '../ledger-api-helpers.js';
import { T2125_CATEGORIES, categoryDisplayLabel, isBusinessExpense } from '../ledger-constants.js';
import { escapeHtml, formatDate } from '../ui-helpers.js';
import { centsToDollars } from '../ledger-pure.js';
`,
    factory: 'createReportsPanel',
    returns: 'return { runReport, initReportDates };'
  },
  {
    name: 'gf.js',
    start: 1548,
    end: 2442,
    imports: `import { apiErrorMessage } from '../ledger-api-helpers.js';
import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm, formatDate } from '../ui-helpers.js';
import { toCents, centsToDollars } from '../ledger-pure.js';
`,
    factory: 'createGfPanel',
    returns:
      `return {
    loadGFPanel,
    initGFPanelListeners,
    gfExportCsv,
    gfPrintSummary,
    gfFetchBCAverage
  };`
  }
];

mkdirSync(join(root, 'js', 'panels'), { recursive: true });

for (const p of panels) {
  const body = indent(slice(p.start, p.end), 2);
  const destructure =
    p.name === 'bank.js'
      ? `const {\n    acctApi,\n    gfApi,\n    ${p.depsExtra},\n    incomeListRender,\n    expenseListRender,\n    renderDashboard\n  } = deps;`
      : p.name === 'gf.js'
        ? 'const { acctApi, gfApi } = deps;'
        : p.name === 'dashboard.js'
          ? 'const { acctApi, incomeLineMeta, expenseLineMeta, getDefaultMonth } = deps;'
          : p.name === 'income-expense.js'
            ? 'const { acctApi, normalizeIncomeTypeForDb, getDefaultMonth, renderDashboard, incomeLineMeta, expenseLineMeta } = deps;'
            : 'const { acctApi } = deps;';

  const out = `${p.imports}
export function ${p.factory}(deps) {
${destructure}
${body}

  ${p.returns}
}
`;
  writeFileSync(join(root, 'js', 'panels', p.name), out, 'utf8');
  console.log('wrote', p.name);
}
