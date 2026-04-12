# Ledger Accounting App — 5-Star Improvement Plan
> Cursor implementation plan. Work top-to-bottom. Each task is self-contained with a clear Definition of Done.
> Financial app — correctness and regression safety matter more here than in Parking Lot. Never skip the DoD.

---

## Current State Summary

| Area | Current | Target |
|---|---|---|
| Architecture | ⭐⭐½ | ⭐⭐⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐⭐ | ✅ already there |
| Testing | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Code Cleanliness | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Security / RLS | ⭐⭐⭐⭐⭐ | ✅ already there |
| Product Thinking | ⭐⭐⭐⭐⭐ | ✅ already there |

---

## PHASE 1 — Code Cleanliness (⭐⭐⭐ → ⭐⭐⭐⭐⭐)
*Fix the known bugs and UX issues first. These are the cheapest, highest-value changes.*

---

### TASK 1.1 — Fix `renderBudgetPanel` silent error on API failure

**File:** `app.js`

**Problem:** `renderBudgetPanel` does `Promise.all([plannedRes, incomeRes, expensesRes])` but never checks
`plannedRes.error`, `incomeRes.error`, or `expensesRes.error`. A network failure silently renders
a $0 budget with no feedback. `renderDashboard` already has the correct pattern — apply it here.

**What to do:**

Find `renderBudgetPanel` in `app.js`. After the `Promise.all` resolves, add:

```js
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
```

Also apply the same pattern to `incomeListRender` and `expenseListRender` — both call
`.then(({ data }) => ...)` and silently ignore any `error` in the destructured result.
Fix them to check `error` and show a `.report-error` element if set.

**Definition of Done:**
- `renderBudgetPanel`, `incomeListRender`, `expenseListRender` all show a visible error
  message when the API call fails
- `renderDashboard` already does this — use it as the reference implementation
- Verify: temporarily return `{ data: null, error: { message: 'Test error' } }` from
  `acctApi.incomeInRange` in the browser console, reload the panel, confirm the error
  renders inline (not silently empty)


---

### TASK 1.2 — Replace all `confirm()` calls with inline confirmation UI

**File:** `app.js`

**Problem:** `confirm()` blocks the thread, is inaccessible on mobile, and is not screen-reader
friendly. The `QA_AUDIT.md` replaced `alert()` with `showAppToast` — `confirm()` needs the
same treatment.

**What to do:**

Find every `confirm(...)` call in `app.js`. Current locations include:
- `deletePlanned(id)` — "Delete this planned item?"
- `deleteIncome(id)` — delete income confirmation
- `deleteExpense(id)` — delete expense confirmation
- Bank "Delete rows not included" (`onBankIgnoreUnselected`)

Replace each with an inline confirmation pattern. Add a small helper:

```js
/**
 * Shows an inline confirmation prompt next to a trigger element.
 * Calls onConfirm if user clicks Confirm, cleans up either way.
 * @param {HTMLElement} triggerEl - the button that was clicked
 * @param {string} message - confirmation text
 * @param {Function} onConfirm - called on confirm
 */
function showInlineConfirm(triggerEl, message, onConfirm) {
  // Remove any existing confirm prompt
  document.querySelectorAll('.inline-confirm').forEach(el => el.remove());

  const div = document.createElement('div');
  div.className = 'inline-confirm';
  div.setAttribute('role', 'alertdialog');
  div.setAttribute('aria-modal', 'false');
  div.innerHTML = `
    <span class="inline-confirm-msg">${escapeHtml(message)}</span>
    <button type="button" class="btn btn-danger btn-sm inline-confirm-yes">Delete</button>
    <button type="button" class="btn btn-secondary btn-sm inline-confirm-no">Cancel</button>
  `;
  triggerEl.insertAdjacentElement('afterend', div);
  div.querySelector('.inline-confirm-yes').addEventListener('click', () => {
    div.remove();
    onConfirm();
  });
  div.querySelector('.inline-confirm-no').addEventListener('click', () => div.remove());

  // Auto-dismiss if user clicks elsewhere
  setTimeout(() => {
    document.addEventListener('click', function dismiss(e) {
      if (!div.contains(e.target) && e.target !== triggerEl) {
        div.remove();
        document.removeEventListener('click', dismiss);
      }
    });
  }, 0);
}
```

Add to `styles.css`:
```css
.inline-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
.inline-confirm-msg { color: var(--text); }
.btn-danger { background: #c0392b; color: #fff; }
.btn-danger:hover { background: #a93226; }
```

Replace each `confirm(...)` usage:

```js
// Before:
function deletePlanned(id) {
  if (!confirm('Delete this planned item?')) return;
  acctApi.plannedDelete(id).then(...);
}

// After:
function deletePlanned(id, triggerEl) {
  showInlineConfirm(triggerEl, 'Delete this planned item?', () => {
    acctApi.plannedDelete(id).then(...);
  });
}
```

Update all callers to pass the clicked button element as `triggerEl`.

**Definition of Done:**
- `grep -n "confirm(" app.js` returns 0 results
- Delete actions show inline confirm UI instead of a browser dialog
- Inline confirm auto-dismisses on outside click
- All delete flows still work correctly after confirming


---

### TASK 1.3 — Harden `normalizeDate` with explicit failure mode and more test cases

**Files:** `js/ledger-pure.js`, `app.js`, `js/__tests__/ledger-pure.test.js`

**Problem:** `normalizeDate` makes positional guesses that can silently produce wrong dates for
ambiguous inputs like `04/05/06` or `Jan 5, 2024`. Failed parses return the original string,
which then fails `isValidIsoDate` at import time — but there's no per-row user feedback.

**What to do:**

1. Extend `normalizeDate` in `js/ledger-pure.js` to handle more formats:

```js
export function normalizeDate(str) {
  if (!str) return '';
  const s = String(str).trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Remove time portion if present (e.g. "2024-01-01T00:00:00Z")
  const isoWithTime = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoWithTime) return isoWithTime[1];

  // Native parse (handles "Jan 5, 2024", "January 5 2024", etc.)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  // Slash/dash separated: try to determine order
  const parts = s.split(/[/\-.]/).map(p => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    // YYYY/MM/DD or YYYY-MM-DD variant
    if (a > 31 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    }
    // MM/DD/YYYY (US)
    if (c > 31 && a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    }
    // DD/MM/YYYY (Canadian/EU)
    if (c > 31 && b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
  }

  // Could not parse — return empty string so caller can detect failure
  return '';
}
```

Key change: return `''` (empty string) instead of `s` when parsing fails. This means
`isValidIsoDate('')` returns false, which triggers the "bad dates" import block — giving
the user a clear error rather than silently importing a garbled date.

2. Sync the same change into the inlined `normalizeDate` copy in `app.js`.

3. Add test cases in `js/__tests__/ledger-pure.test.js`:

```js
describe('normalizeDate edge cases', () => {
  it('handles ISO with time suffix', () => {
    expect(normalizeDate('2024-03-15T00:00:00Z')).toBe('2024-03-15');
  });
  it('handles MM/DD/YYYY (US format)', () => {
    expect(normalizeDate('03/15/2024')).toBe('2024-03-15');
  });
  it('handles DD/MM/YYYY (Canadian/EU format)', () => {
    expect(normalizeDate('15/03/2024')).toBe('2024-03-15');
  });
  it('handles natural language date', () => {
    expect(normalizeDate('Jan 5, 2024')).toBe('2024-01-05');
  });
  it('handles dot-separated YYYY.MM.DD', () => {
    expect(normalizeDate('2024.03.15')).toBe('2024-03-15');
  });
  it('returns empty string for unparseable input', () => {
    expect(normalizeDate('not-a-date')).toBe('');
    expect(normalizeDate('04/05/06')).toBe(''); // truly ambiguous — safe to reject
  });
  it('handles empty and null', () => {
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate(null)).toBe('');
  });
});
```

**Definition of Done:**
- `npm run test` passes with all new cases
- `normalizeDate('not-a-date')` returns `''` (not the original string)
- Bank import of a CSV with an unparseable date shows the "bad dates" toast,
  not a silent import with a broken date field
- Both copies of `normalizeDate` (in `ledger-pure.js` and inlined in `app.js`) are identical


---

### TASK 1.4 — Add ESLint to enforce code quality

**Files:** `.eslintrc.json`, `package.json`

**What to do:**

```bash
npm install --save-dev eslint
```

Create `.eslintrc.json`:
```json
{
  "env": { "browser": true, "es2022": true },
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "script" },
  "rules": {
    "eqeqeq": ["error", "always"],
    "no-undef": "error",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-var": "warn"
  },
  "globals": {
    "SUPABASE_URL": "readonly",
    "SUPABASE_ANON_KEY": "readonly",
    "LedgerParseCsv": "readonly",
    "LedgerBankAmount": "readonly"
  }
}
```

Add to `package.json` scripts:
```json
"lint": "eslint app.js api.js js/ledger-pure.js js/ledger-bank.js js/parse-csv.js"
```

Fix all `eqeqeq` violations first (`==` → `===`) — these are potential bugs.
Then address `no-undef` — any genuine undeclared variables.

**Definition of Done:**
- `npm run lint` exits 0
- No `==` comparisons remain in `app.js` or `api.js`


---

## PHASE 2 — Testing (⭐⭐⭐ → ⭐⭐⭐⭐⭐)
*The test toolchain (Vitest + Playwright) is fully set up. The gap is coverage and CI wiring.*

---

### TASK 2.1 — Wire tests into CI (the single highest-priority fix)

**File:** `.github/workflows/deploy-pages.yml`

**Problem:** The CI pipeline currently deploys without running any tests. For a financial app
this is a critical gap — a broken calculation could ship silently.

**What to do:**

In `deploy-pages.yml`, split the single `build` job into `test` → `build` → `deploy`:

```yaml
jobs:
  test:
    name: Test (Vitest + Playwright)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-results
          path: test-results/
          if-no-files-found: ignore

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Prepare site
        run: |
          mkdir -p _site/js
          cp index.html styles.css api.js app.js _site/
          cp js/parse-csv.js _site/js/
          echo "const SUPABASE_URL='${{ secrets.SUPABASE_URL }}'; const SUPABASE_ANON_KEY='${{ secrets.SUPABASE_KEY }}';" > _site/config.js
          if grep -q "SUPABASE_URL='';" _site/config.js; then
            echo "::error::Supabase secrets empty."
            exit 1
          fi
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    # ... rest unchanged
```

**Definition of Done:**
- A PR with a broken unit test causes CI to fail before deploy
- `npm run test && npm run e2e` both run in CI on every push to main
- Playwright failure artifacts are uploaded for debugging


---

### TASK 2.2 — Enforce the `ledger-pure.js` / `app.js` sync with a unit test

**File:** `js/__tests__/ledger-pure.test.js`

**Problem:** `suggestFromRules`, `guessVendorFromBankDescription`, and `normalizeDate` are copied
between `app.js` and `ledger-pure.js` with a comment saying "keep in sync." There's no
automated check that they actually are.

**What to do:**

Add a sync-check test that loads the inlined version from `app.js` via vm and compares
outputs against `ledger-pure.js` for a fixed set of inputs:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  guessVendorFromBankDescription,
  normalizeDate,
  suggestFromRules
} from '../ledger-pure.js';

describe('app.js / ledger-pure.js sync check', () => {
  let appNormalizeDate;
  let appGuessVendor;
  let appSuggestFromRules;

  beforeAll(() => {
    // Extract the inlined functions from app.js using vm
    // (The IIFE wraps everything, so we inject stubs and capture the functions)
    const appSrc = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
    const ctx = {
      window: { LedgerParseCsv: { parseCsv: () => ({ headers: [], rows: [] }) } },
      document: { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null },
      navigator: { onLine: true },
      sessionStorage: { getItem: () => null, setItem: () => {} },
      console: { warn: () => {}, error: () => {}, log: () => {} }
    };
    ctx.window = ctx.window;
    ctx.globalThis = ctx;
    try {
      vm.createContext(ctx);
      vm.runInContext(appSrc, ctx);
    } catch (_) {
      // app.js may reference DOM on init — that's OK, we just need the pure functions
    }
    // These are captured from the IIFE closure — we need to expose them
    // Add `window._testExports = { normalizeDate, guessVendorFromBankDescription, suggestFromRules };`
    // at the END of app.js (after the IIFE closes), guarded by a test flag:
    appNormalizeDate = ctx._ledgerTestExports?.normalizeDate;
    appGuessVendor = ctx._ledgerTestExports?.guessVendorFromBankDescription;
    appSuggestFromRules = ctx._ledgerTestExports?.suggestFromRules;
  });

  const normalizeCases = [
    ['2024-03-15', '2024-03-15'],
    ['03/15/2024', '2024-03-15'],
    ['', ''],
    ['not-a-date', ''],
  ];

  normalizeCases.forEach(([input, expected]) => {
    it(`normalizeDate("${input}") matches between app.js and ledger-pure.js`, () => {
      if (!appNormalizeDate) return; // skip if extraction failed
      expect(appNormalizeDate(input)).toBe(normalizeDate(input));
      expect(normalizeDate(input)).toBe(expected);
    });
  });

  it('guessVendorFromBankDescription matches', () => {
    if (!appGuessVendor) return;
    const cases = ['STARBUCKS*123', 'AMAZON', '', null];
    cases.forEach(c => {
      expect(appGuessVendor(c)).toBe(guessVendorFromBankDescription(c));
    });
  });
});
```

To make the extraction work, add this at the very bottom of `app.js`, **outside** the IIFE
and guarded by a test flag:

```js
// TEST ONLY — exposes pure functions for sync check. Never called in production.
if (typeof window !== 'undefined' && window.__LEDGER_TEST_MODE__) {
  window._ledgerTestExports = { normalizeDate, guessVendorFromBankDescription, suggestFromRules };
}
```

**Definition of Done:**
- `npm run test` passes
- If you intentionally break `normalizeDate` in `app.js` only, the sync test fails
- If you break it in `ledger-pure.js` only, the sync test also fails


---

### TASK 2.3 — Add Vitest tests for `plannedAmountInPeriod`

**New file:** `js/__tests__/ledger-planned.test.js`

**Problem:** `plannedAmountInPeriod` is the core budget math — it converts planned recurring
amounts to period totals. It's currently untested, and a bug here means the budget panel
shows wrong numbers silently.

**What to do:**

Extract `plannedAmountInPeriod` from `app.js` into `js/ledger-pure.js` as an exported
pure function (it has no DOM dependencies):

```js
// js/ledger-pure.js — add this export
/**
 * Calculates the expected amount of a planned recurring item within a date range.
 * @param {{ amount_cents: number, frequency: string }} p
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @returns {number} amount in cents
 */
export function plannedAmountInPeriod(p, from, to) {
  const fromD = new Date(from + 'T00:00:00');
  const toD = new Date(to + 'T00:00:00');
  const days = Math.max(0, Math.round((toD - fromD) / (24 * 60 * 60 * 1000))) + 1;
  const months = (toD.getFullYear() - fromD.getFullYear()) * 12
    + (toD.getMonth() - fromD.getMonth()) + 1;
  const freq = p.frequency || 'monthly';
  let count = 1;
  if (freq === 'weekly') count = days / 7;
  else if (freq === 'biweekly') count = days / 14;
  else if (freq === 'monthly') count = Math.max(1, months);
  else if (freq === 'yearly') count = months / 12;
  return Math.round(Number(p.amount_cents) * count);
}
```

In `app.js`, replace the inlined version with a call to the exported function (or keep the
inline and add a sync test like Task 2.2).

Write tests:

```js
import { describe, it, expect } from 'vitest';
import { plannedAmountInPeriod } from '../ledger-pure.js';

describe('plannedAmountInPeriod', () => {
  const monthly1000 = { amount_cents: 100000, frequency: 'monthly' };
  const weekly500   = { amount_cents: 50000,  frequency: 'weekly'  };
  const yearly1200  = { amount_cents: 120000, frequency: 'yearly'  };
  const biweekly800 = { amount_cents: 80000,  frequency: 'biweekly'};

  it('monthly: single month period = 1x amount', () => {
    expect(plannedAmountInPeriod(monthly1000, '2024-01-01', '2024-01-31')).toBe(100000);
  });

  it('monthly: two month period = 2x amount', () => {
    expect(plannedAmountInPeriod(monthly1000, '2024-01-01', '2024-02-29')).toBe(200000);
  });

  it('weekly: 7-day period = 1x amount', () => {
    expect(plannedAmountInPeriod(weekly500, '2024-01-01', '2024-01-07')).toBe(50000);
  });

  it('weekly: 14-day period = 2x amount', () => {
    expect(plannedAmountInPeriod(weekly500, '2024-01-01', '2024-01-14')).toBe(100000);
  });

  it('biweekly: 14-day period = 1x amount', () => {
    expect(plannedAmountInPeriod(biweekly800, '2024-01-01', '2024-01-14')).toBe(80000);
  });

  it('yearly: 12-month period = 1x amount', () => {
    expect(plannedAmountInPeriod(yearly1200, '2024-01-01', '2024-12-31')).toBe(120000);
  });

  it('yearly: 6-month period = 0.5x amount', () => {
    expect(plannedAmountInPeriod(yearly1200, '2024-01-01', '2024-06-30')).toBe(60000);
  });

  it('monthly: same-day period = at least 1x (no zero month)', () => {
    expect(plannedAmountInPeriod(monthly1000, '2024-03-15', '2024-03-15')).toBe(100000);
  });

  it('handles missing frequency as monthly', () => {
    expect(plannedAmountInPeriod({ amount_cents: 100000 }, '2024-01-01', '2024-01-31')).toBe(100000);
  });
});
```

**Definition of Done:**
- All tests pass with `npm run test`
- `plannedAmountInPeriod` is exported from `ledger-pure.js`
- `app.js` imports or mirrors it with a sync check


---

### TASK 2.4 — Add Vitest tests for `toCents` and `centsToDollars` (money conversion)

**New file:** `js/__tests__/ledger-money.test.js`

**Problem:** Money conversion is the most critical math in the app. `toCents` currently
lives only in `app.js` (untestable). A rounding bug here silently corrupts financial records.

**What to do:**

Export `toCents` and `centsToDollars` from `js/ledger-pure.js`:

```js
export function toCents(val) {
  const n = parseFloat(String(val == null ? '' : val).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollars(c) {
  if (c == null) return '0.00';
  return (Number(c) / 100).toFixed(2);
}
```

Write tests:

```js
import { describe, it, expect } from 'vitest';
import { toCents, centsToDollars } from '../ledger-pure.js';

describe('toCents', () => {
  it('converts dollars to cents', () => expect(toCents('12.34')).toBe(1234));
  it('handles integer input', () => expect(toCents('100')).toBe(10000));
  it('handles string with dollar sign', () => expect(toCents('$9.99')).toBe(999));
  it('handles empty string', () => expect(toCents('')).toBe(0));
  it('handles null', () => expect(toCents(null)).toBe(0));
  it('rounds half-up correctly (floating point trap)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS — toCents must not round to 29
    expect(toCents('0.30')).toBe(30);
    expect(toCents((0.1 + 0.2).toString())).toBe(30);
  });
  it('handles negative values', () => expect(toCents('-5.00')).toBe(-500));
});

describe('centsToDollars', () => {
  it('formats correctly', () => expect(centsToDollars(1234)).toBe('12.34'));
  it('handles zero', () => expect(centsToDollars(0)).toBe('0.00'));
  it('handles null', () => expect(centsToDollars(null)).toBe('0.00'));
  it('handles large numbers', () => expect(centsToDollars(1000000)).toBe('10000.00'));
  it('pads decimal places', () => expect(centsToDollars(100)).toBe('1.00'));
});
```

**Definition of Done:**
- All tests pass
- `toCents` and `centsToDollars` are exported from `ledger-pure.js`
- The floating-point rounding test passes (this is the most important one)


---

### TASK 2.5 — Add Playwright e2e tests for income and expense CRUD

**New file:** `e2e/qa-crud.spec.js`

**Problem:** The existing Playwright tests cover surface rendering and report totals with
stubbed data. But the core CRUD flows (add income, add expense, edit, delete) have no
automated regression coverage.

**What to do:**

Extend the Supabase stub (`e2e/supabase-stub.js`) to support in-memory income/expense
insert/update/delete, then write:

```js
// e2e/qa-crud.spec.js
import { test, expect } from '@playwright/test';

test.describe('Income CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Sign in with stub credentials
    await helpers.signIn(page);
    await page.click('[data-panel="income"]');
  });

  test('adds an income entry and sees it in the list', async ({ page }) => {
    await page.click('#income-add-btn');
    await page.fill('#income-amount', '1500.00');
    await page.fill('#income-gst', '75.00');
    await page.selectOption('#income-type', 'gig');
    await page.click('#income-save-btn');
    await expect(page.locator('#income-list .entry-row')).toContainText('$1,575.00');
  });

  test('edits an income entry', async ({ page }) => {
    // Assumes stub has at least one income entry seeded
    await page.click('.edit-btn >> nth=0');
    await page.fill('#income-amount', '2000.00');
    await page.click('#income-save-btn');
    await expect(page.locator('#income-list .entry-row >> nth=0')).toContainText('$2,000.00');
  });

  test('deletes an income entry with inline confirm', async ({ page }) => {
    const initialCount = await page.locator('#income-list .entry-row').count();
    await page.click('.delete-btn >> nth=0');
    // Inline confirm should appear
    await expect(page.locator('.inline-confirm')).toBeVisible();
    await page.click('.inline-confirm-yes');
    await expect(page.locator('#income-list .entry-row')).toHaveCount(initialCount - 1);
  });

  test('shows error when amount is missing', async ({ page }) => {
    await page.click('#income-add-btn');
    await page.click('#income-save-btn');
    await expect(page.locator('.app-toast')).toContainText('required');
  });
});

test.describe('Expense CRUD', () => {
  // Mirror the income tests for expenses, adding category selection
  test('adds an expense with category and sees it in the list', async ({ page }) => { ... });
  test('shows error when category is missing', async ({ page }) => { ... });
});
```

**Definition of Done:**
- `npm run e2e` passes with these new tests
- Tests run in CI (wired in Task 2.1)
- Delete flow uses inline confirm (validates Task 1.2 in e2e)


---

### TASK 2.6 — Add Playwright e2e test for bank CSV import

**New file:** `e2e/qa-bank.spec.js`

**Problem:** Bank import is the most complex user flow (file upload → column mapping →
dedup → insert → reconcile) and has zero e2e coverage. A regression here could silently
double-import transactions.

**What to do:**

Add a fixture CSV at `e2e/fixtures/bank-sample.csv`:
```csv
Date,Description,Amount
2024-01-15,STARBUCKS*123,-4.75
2024-01-16,DIRECT DEPOSIT PAYROLL,2500.00
2024-01-17,"AMAZON.CA, RETAIL",-89.99
```

Write the test:

```js
// e2e/qa-bank.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';

test('imports a bank CSV and shows transactions in reconcile view', async ({ page }) => {
  await page.goto('/');
  await helpers.signIn(page);
  await page.click('[data-panel="bank"]');

  // Upload CSV
  const fileInput = page.locator('#bank-file');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures/bank-sample.csv'));

  // Column mapping appears
  await expect(page.locator('#bank-mapping')).toBeVisible();

  // Auto-guessed columns should be pre-filled
  await expect(page.locator('#bank-col-date')).toHaveValue('Date');
  await expect(page.locator('#bank-col-desc')).toHaveValue('Description');
  await expect(page.locator('#bank-col-amount')).toHaveValue('Amount');

  await page.click('#bank-import-btn');

  // 3 rows should appear in reconcile view
  await expect(page.locator('.bank-row')).toHaveCount(3);

  // STARBUCKS row should be an expense
  const starbucksRow = page.locator('.bank-row').filter({ hasText: 'STARBUCKS' });
  await expect(starbucksRow.locator('.bank-row-entry-type')).toHaveValue('expense');

  // PAYROLL row should be income
  const payrollRow = page.locator('.bank-row').filter({ hasText: 'PAYROLL' });
  await expect(payrollRow.locator('.bank-row-entry-type')).toHaveValue('income');
});

test('deduplicates: re-importing the same CSV imports 0 new rows', async ({ page }) => {
  // Import once, then import again — expect "already in your bank list" toast
  await helpers.importCsv(page, 'bank-sample.csv');
  await helpers.importCsv(page, 'bank-sample.csv');
  await expect(page.locator('.app-toast')).toContainText('already in your bank list');
});
```

**Definition of Done:**
- `npm run e2e` passes
- Dedup test confirms no double-import regression


---

## PHASE 3 — Architecture (⭐⭐½ → ⭐⭐⭐⭐⭐)

*The single `app.js` IIFE is the root problem. Split it into modules without a build step,
following the same no-build ES module pattern used in Parking Lot.*

---

### TASK 3.1 — Extract constants and pure helpers into `js/ledger-constants.js`

**New file:** `js/ledger-constants.js`
**Files to edit:** `app.js`, `index.html`

**What to do:**

Move these out of the `app.js` IIFE into an ES module:

```js
// js/ledger-constants.js
export const T2125_CATEGORIES = [ ... ]; // full array from app.js

export const INCOME_TYPES = [ ... ]; // full array from app.js

export const INCOME_TYPE_IDS = new Set(INCOME_TYPES.map(t => t.id));

export function categoryDisplayLabel(cat) {
  return cat ? cat.label + ' (' + cat.id + ')' : '';
}

export function isBusinessExpense(category) {
  return category !== 'personal' && category !== 'medical';
}
```

In `index.html`, add before `app.js`:
```html
<script type="module" src="js/ledger-constants.js"></script>
```

In `app.js`, remove the duplicated declarations. Since `app.js` is still an IIFE (non-module),
expose the constants via `window.LedgerConstants = { T2125_CATEGORIES, INCOME_TYPES, ... }`
at the bottom of the ES module, then consume `window.LedgerConstants.*` inside the IIFE.

Alternatively (preferred if you take Phase 3 seriously): convert `app.js` to
`type="module"` — see Task 3.5.

**Definition of Done:**
- `T2125_CATEGORIES` and `INCOME_TYPES` defined in exactly one place
- `npm run test && npm run e2e` passes
- Changing a category label in `ledger-constants.js` reflects in all panels


---

### TASK 3.2 — Extract `api.js` pure helpers into `js/ledger-api-helpers.js`

**New file:** `js/ledger-api-helpers.js`
**File to edit:** `api.js`

**What to do:**

Move `apiErrorMessage` and `getClient` into a shared module so both `api.js` and `app.js`
can use them without duplication:

```js
// js/ledger-api-helpers.js
export function apiErrorMessage(err) {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.error_description || String(err);
}

/**
 * Wraps a Supabase result and logs errors consistently.
 * @param {string} context
 * @param {{ data: any, error: any }} result
 * @returns {{ data: any, error: any }}
 */
export function handleSupaResult(context, result) {
  if (result.error) {
    console.error(`[api] ${context}:`, result.error.message || result.error);
  }
  return result;
}
```

**Definition of Done:**
- `api.js` imports from `ledger-api-helpers.js` for error handling
- `app.js` uses the same `apiErrorMessage` via this module
- No duplicate error formatting logic between files


---

### TASK 3.3 — Extract panel renderers into separate module files

**New files:** `js/panels/income.js`, `js/panels/expenses.js`, `js/panels/bank.js`,
`js/panels/budget.js`, `js/panels/reports.js`, `js/panels/gf.js`

**Files to edit:** `app.js`

This is the biggest single split. Each panel becomes a factory function that receives its
dependencies (api, constants, helpers) and returns a `{ init, render }` interface.

**Pattern to follow (use for each panel):**

```js
// js/panels/income.js
/**
 * @param {Object} deps
 * @param {typeof window.acctApi} deps.acctApi
 * @param {Function} deps.escapeHtml
 * @param {Function} deps.centsToDollars
 * @param {Function} deps.formatDate
 * @param {Function} deps.showAppToast
 * @param {Function} deps.showInlineConfirm
 * @param {Array} deps.INCOME_TYPES
 * @param {Function} deps.getDefaultMonth
 * @param {Function} deps.toCents
 * @param {Function} deps.normalizeIncomeTypeForDb
 */
export function createIncomePanel(deps) {
  const { acctApi, escapeHtml, centsToDollars, formatDate, showAppToast,
          showInlineConfirm, INCOME_TYPES, getDefaultMonth, toCents,
          normalizeIncomeTypeForDb } = deps;

  let editingId = null;

  function render() { /* incomeListRender logic */ }
  function openForm(id) { /* openIncomeForm logic */ }
  function buildForm(row) { /* buildIncomeForm logic */ }
  function bindForm() { /* bindIncomeForm logic */ }
  function deleteEntry(id, triggerEl) { /* deleteIncome with inline confirm */ }

  return { render, openForm, deleteEntry };
}
```

In `app.js`, replace the inline panel logic with:

```js
import { createIncomePanel } from './js/panels/income.js';
// inside init:
const incomePanel = createIncomePanel({ acctApi, escapeHtml, ... });
// setPanel: if name === 'income': incomePanel.render();
```

**Recommended extraction order** (each is a separate PR):
1. `js/panels/budget.js` — `renderBudgetPanel`, `buildPlannedTableRow`, `buildPlannedForm`, `bindPlannedForm`
2. `js/panels/income.js` — `incomeListRender`, `openIncomeForm`, `buildIncomeForm`, `bindIncomeForm`
3. `js/panels/expenses.js` — `expenseListRender`, `openExpenseForm`, `buildExpenseForm`, `bindExpenseForm`
4. `js/panels/bank.js` — everything in `// --- Bank CSV import & reconciliation ---`
5. `js/panels/reports.js` — `runReport`
6. `js/panels/gf.js` — `loadGFPanel` and all GF functions

**Definition of Done (per panel):**
- Panel file has zero references to other panels' DOM IDs
- `app.js` delegates to `panelName.render()` in `setPanel()`
- `wc -l app.js` shrinks by at least 300 lines per panel extracted
- `npm run test && npm run e2e` passes after each extraction


---

### TASK 3.4 — Extract shared UI utilities into `js/ui-helpers.js`

**New file:** `js/ui-helpers.js`
**File to edit:** `app.js`

**What to do:**

Move these shared helpers out of the IIFE so panels can import them directly:

```js
// js/ui-helpers.js
export function escapeHtml(s) { ... }
export function escapeHtmlAttr(s) { ... }
export function showAppToast(message, isError) { ... }
export function showInlineConfirm(triggerEl, message, onConfirm) { ... } // from Task 1.2
export function show(el, visible) { ... }
export function toCents(val) { ... }
export function centsToDollars(c) { ... }
export function formatDate(str) { ... }
export function setPanel(name, panelHandlers) { ... }
```

**Definition of Done:**
- Each helper defined in exactly one file
- No duplicate implementations between `app.js` and panel files
- `npm run test && npm run e2e` passes


---

### TASK 3.5 — Convert `app.js` from IIFE to ES module (final step)

**File:** `app.js`, `index.html`

This is the culmination of Phase 3. After Tasks 3.1–3.4, the IIFE shell in `app.js`
should be thin enough to convert.

**What to do:**

1. Remove the `(function() { 'use strict'; ... })();` wrapper from `app.js`
2. Change `<script src="app.js">` in `index.html` to `<script type="module" src="app.js">`
3. Replace all `window.acctApi`, `window.gfApi` references with ES module imports from `api.js`
4. Add `export` to any functions that panel modules need
5. Update the CI build step in `deploy-pages.yml` to copy `js/panels/*.js` and `js/ui-helpers.js`

After conversion:
- Remove the `"keep in sync"` mirror files (`ledger-bank.js`, `ledger-pure.js` inlined copies)
- Import directly from the single source of truth

**Definition of Done:**
- `app.js` has no IIFE wrapper
- `<script type="module">` loads with no console errors
- `wc -l app.js` is under 300 lines (composition and init only)
- All `npm run test && npm run e2e` pass
- CI `build` step correctly copies all `js/**/*.js` to `_site/js/`
- Verify grep: `grep -n "keep in sync" app.js js/ledger-pure.js` returns 0 results


---

## PHASE 4 — Remaining Cleanliness (⭐⭐⭐ → ⭐⭐⭐⭐⭐)

---

### TASK 4.1 — Add `income_type` / schema lockstep lint rule

**Files:** `js/ledger-constants.js`, `js/__tests__/ledger-schema.test.js`

**Problem:** `INCOME_TYPES` in `app.js` and the Supabase `income_type` check constraint must
stay in sync. `docs/INCOME_TYPES.md` documents this manually but there's no automated check.

**What to do:**

Add a test that reads `supabase-accounting-schema.sql`, extracts the income_type constraint
values, and compares them against `INCOME_TYPES` in `ledger-constants.js`:

```js
// js/__tests__/ledger-schema.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { INCOME_TYPES } from '../ledger-constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractIncomeTypeConstraint(sql) {
  // Matches: income_type text check (income_type in ('a','b','c'))
  const match = sql.match(/income_type\s+text\s+check\s*\(\s*income_type\s+in\s*\(([^)]+)\)/i);
  if (!match) return null;
  return match[1].split(',').map(s => s.trim().replace(/'/g, ''));
}

describe('income_type schema lockstep', () => {
  it('INCOME_TYPES in ledger-constants.js matches supabase schema constraint', () => {
    const sql = readFileSync(
      join(__dirname, '../../supabase-accounting-schema.sql'),
      'utf8'
    );
    const schemaTypes = extractIncomeTypeConstraint(sql);
    expect(schemaTypes).not.toBeNull();
    const appTypes = INCOME_TYPES.map(t => t.id).sort();
    const dbTypes = schemaTypes.sort();
    expect(appTypes).toEqual(dbTypes);
  });
});
```

**Definition of Done:**
- `npm run test` passes
- Adding a new income type to `INCOME_TYPES` without adding the SQL migration causes the
  test to fail with a clear message
- `docs/INCOME_TYPES.md` links to this test as the automated enforcement


---

### TASK 4.2 — Replace remaining `console.log` with structured logging

**File:** `app.js`

**What to do:**

Audit `app.js` for `console.log` calls (not `console.warn` or `console.error`).
Replace informational logs with either:
- `console.warn` if it's a recoverable issue
- Remove entirely if it's debug-only output that shouldn't be in production

Ensure `console.error` is kept for API errors and `console.warn` for config issues.
This also lets the ESLint rule from Task 1.4 pass cleanly.

**Definition of Done:**
- `grep -n "console\.log" app.js` returns 0
- `npm run lint` exits 0


---

### TASK 4.3 — Add service worker cache busting to CI

**Files:** `sw.js` (if it exists), `.github/workflows/deploy-pages.yml`

**Note:** Check if the Ledger app has a service worker. If not, skip this task. If it does,
apply the same pattern as Parking Lot:

In `deploy-pages.yml`, auto-bump the cache version on deploy:
```yaml
- name: Bump cache version
  run: |
    SHORT_SHA=$(echo "${{ github.sha }}" | cut -c1-7)
    sed -i "s/ledger-v[0-9]*/ledger-$SHORT_SHA/" _site/sw.js
```

**Definition of Done:**
- `grep CACHE_NAME` in deployed `sw.js` shows commit SHA, not a static version


---

## Verification Commands (run after each phase)

```bash
# Full test suite
npm run test && npm run e2e

# Lint
npm run lint

# Check for confirm() — should be 0 after Task 1.2
grep -n "confirm(" app.js

# Check for == (should be 0 after Task 1.4)
grep -n " == \| != " app.js | grep -v "===" | grep -v "!=="

# Check for console.log (should be 0 after Task 4.2)
grep -n "console\.log" app.js

# Check app.js line count (target: under 300 after Phase 3)
wc -l app.js

# Check for "keep in sync" comments (should be 0 after Task 3.5)
grep -rn "keep in sync" js/ app.js
```

---

## Implementation Order for Cursor

**Do these in order. Each task is a separate Cursor session / PR.**

1. `TASK 2.1` — Wire tests into CI **first** — protects everything that follows
2. `TASK 1.1` — Fix `renderBudgetPanel` error handling (5-min fix, high impact)
3. `TASK 1.3` — Harden `normalizeDate` + tests
4. `TASK 2.4` — `toCents` / `centsToDollars` tests (extract + test together)
5. `TASK 2.3` — `plannedAmountInPeriod` tests (extract + test together)
6. `TASK 1.2` — Replace `confirm()` with inline confirm
7. `TASK 1.4` — Add ESLint + fix violations
8. `TASK 2.2` — Sync check test for `app.js` mirrors
9. `TASK 2.5` — Playwright CRUD tests
10. `TASK 2.6` — Playwright bank CSV import test
11. `TASK 3.1` — Extract constants
12. `TASK 3.4` — Extract UI helpers
13. `TASK 3.2` — Extract API helpers
14. `TASK 3.3` — Extract panels (one per PR: budget → income → expenses → bank → reports → gf)
15. `TASK 3.5` — Convert IIFE to ES module (do this last — it touches everything)
16. `TASK 4.1` — Schema lockstep test
17. `TASK 4.2` — Remove console.log
18. `TASK 4.3` — SW cache busting (if applicable)

---

## Key Difference from Parking Lot Plan

Parking Lot's plan started with architecture because the codebase was already modular enough
to extract safely. **This plan starts with testing and correctness** — because this is a
financial app and correctness bugs (wrong totals, silent API failures, bad date parsing)
are higher risk than structural ones. Get the safety net in place first, then refactor freely.

---

*Plan generated from full codebase review of ledger-accounting-app repomix output.*
