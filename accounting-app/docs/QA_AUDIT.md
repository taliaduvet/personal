# Ledger — Full QA audit (issues & improvements)

**Scope:** Static review of `app.js`, `api.js`, `index.html`, SQL schema, plus what automated `npm run qa:full` does and does not cover.  
**Date:** 2026-03-30

### Remediation status (follow-up implementation)

| Audit topic | Status |
|-------------|--------|
| Duplicate T2125 `8760` | Second row uses internal id **`8760-licenses`**; first remains **`8760`** (business taxes). |
| `runReport` / dashboard silent API errors | **`runReport`** and **`renderDashboard`** show inline **`.report-error`** when `ir.error` / `er.error`. |
| Naive CSV | **`js/parse-csv.js`** (RFC 4180–style) + Vitest; **`index.html`** loads it before `app.js`; deploy workflows copy `js/parse-csv.js`. |
| XSS / `innerHTML` | Central **`escapeHtml` / `escapeHtmlAttr`** on list, report, bank, budget, GF, receipts, forms. |
| `alert()` | Replaced with **`showAppToast`** (see `.app-toast` in `styles.css`). |
| Tab accessibility | **`role="tab"`** / **`tabpanel`**, **`aria-controls`**, **`aria-selected`** updated in **`setPanel`**. |
| Category picker | **`aria-hidden`** toggles when the suggestion list opens/closes. |
| Budget partial save | Toast reports **count** of failed rows + first error message. |
| Bank invalid dates | Import **blocked** if any row fails **`isValidIsoDate`**; reconcile rows show **`.bank-row-warn`**. |
| Tests | **`e2e/qa-report-totals.spec.js`** (stub-seeded totals); **`js/ledger-pure.js`** + Vitest; **`docs/INCOME_TYPES.md`**. |

---

## Executive summary

| Severity | Count | Theme |
|----------|------:|--------|
| **P1 — Fix before trusting money/tax outputs** | 3 | Category collisions, silent API errors, CSV parsing |
| **P2 — Security / integrity** | 2 | XSS via `innerHTML`, receipt filenames |
| **P3 — UX / reliability** | 6 | `alert()` noise, accessibility, date edge cases |
| **Improvements (product + engineering)** | 8 | Tests, dedupe logic, error surfaces |

Automated **Playwright** tests today prove **shell + navigation + stubbed auth**. They do **not** prove correct totals, GST, GF math, RLS, or Storage.

---

## P1 — Correctness & tax-adjacent behavior

### 1. Duplicate T2125 line codes in `T2125_CATEGORIES`

```4:8:accounting-app/app.js
  const T2125_CATEGORIES = [
    { id: '8521', label: 'Advertising' },
    { id: '8590', label: 'Bad debts' },
    { id: '8760', label: 'Business taxes and fees' },
    { id: '8760', label: 'Licenses / Subscriptions' },
```

**Issue:** Two different labels share **`8760`**. Reporting uses `T2125_CATEGORIES.find(c => c.id === catId)`, which returns the **first** match only. Expenses labeled “Licenses / Subscriptions” can display as “Business taxes and fees” in breakdowns.

**Improvement:** Use unique internal keys (e.g. `8760-licenses`) mapped to CRA line notes in export, or a single 8760 row with merged label text—**but** don’t rely on duplicate `id` in an array keyed by `.find()`.

---

### 2. `runReport` ignores `error` from Supabase

```1098:1142:accounting-app/app.js
    Promise.all([
      acctApi.incomeInRange(from, to),
      acctApi.expensesInRange(from, to)
    ]).then(([ir, er]) => {
      const income = ir.data || [];
      const expenses = er.data || [];
```

**Issue:** If `ir.error` / `er.error` is set (network, RLS, outage), the UI still renders a report from **empty arrays**, implying **$0** activity instead of “could not load.”

**Improvement:** Branch on `ir.error || er.error`; show an inline error state and skip the summary tables.

---

### 3. Bank CSV `parseCsv` is naive

```806:816:accounting-app/app.js
  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    ...
      const cols = line.split(',');
```

**Issue:** Commas inside **quoted** fields (common in bank CSVs), multiline fields, and some encodings will mis-parse and shift columns.

**Improvement:** Use a small RFC-4180-aware parser or a battle-tested library; add fixture tests with quoted amounts and `Description,"1,000.00"`-style rows.

---

## P2 — Security

### 4. Unescaped user / server text in `innerHTML`

Vendor, client, notes, descriptions, receipt **file names**, and GF product names are composed into strings later assigned to **`innerHTML`** (e.g. income/expense rows, receipt list, bank mapping options).

**Issue:** Stored XSS risk if any field contains HTML/script (malicious file name from upload metadata, pasted note, compromised sync).

**Improvement:** Central `escapeHtml()` for all dynamic text in templates, or build rows with `createElement` / `textContent`. High-traffic spots: `incomeLineMeta` / `expenseLineMeta` in list rows, `renderReceiptsList` file names, `showBankMapping` header names.

---

### 5. `document.write` for GF print window

Used for print preview. Less critical than main DOM, but still injects strings; keep any user-derived content escaped there too.

---

## P3 — UX & polish

### 6. Heavy use of `alert()` for errors

Blocks the thread, poor on mobile, not screen-reader friendly.

**Improvement:** Inline error regions or a small toast pattern (reuse `.error` styles from auth).

---

### 7. Keyboard / accessibility gaps

- Category picker (`aria-hidden="true"` on list while focusable) may not match focus behavior.
- Many icon-only controls lack consistent `aria-label` (stack varies by panel).
- Tab buttons are real `<button>`s (good); ensure panel regions use `role="tabpanel"` + `aria-labelledby` if you want full WCAG tab parity.

---

### 8. `normalizeDate` heuristic limits

**Issue:** Unusual date strings or locale-specific exports may not normalize; failed parses can flow to confusing states.

**Improvement:** Show “unparseable date” per row on bank import; allow user override before insert.

---

### 9. GF / StatsCan CORS

Already documented in README. Improvement: Edge Function proxy as optional first-class deploy path.

---

### 10. Budget “Save” partial failures

`Promise.all` on planned rows; first error triggers `alert` but table may be half-saved.

**Improvement:** Per-row error state or transactional UX copy.

---

### 11. Income `income_type` vs schema

Schema check constraint lists specific values; app `INCOME_TYPES` should stay in lockstep with migrations (lint or shared constant file).

---

## Test coverage gaps (automation)

| Area | Current automated signal | Gap |
|------|--------------------------|-----|
| Auth | Sign-in empty / stub paths | Real Supabase, email confirmation, redirect URLs |
| CRUD income/expense | Not E2E’d | Stub could be extended with in-memory fake |
| Reports math | Not asserted | Golden-file tests for `runReport` output given fixtures |
| Bank import | Not E2E’d | CSV parse + dedup key unit tests |
| GF incremental cost | Not asserted | Pure-function tests for size/unit math |
| Receipts / Storage | Not E2E’d | Needs test bucket or signed URL mocks |

**Improvement roadmap (like Parking Lot’s `QA_COVERAGE_ROADMAP.md`):**

1. Extract **pure** helpers (`parseCsv`, `normalizeDate`, `suggestFromRules`, GF unit conversion) into `js/ledger-pure.js` + Vitest.
2. Extend Playwright: Reports **Apply** with stub returning fixed rows → assert totals text.
3. Optional: staging Supabase project + masked run in CI for RLS smoke.

---

## Positive findings

- **RLS** on core tables and user scoping in `api.js` align with multi-user design.
- **Separation** of `acctApi` vs `gfApi` keeps GF concerns isolated.
- **Period defaults** (month to date) are consistent across income/expenses/dashboard.
- **E2E harness** (stub Supabase, `4174` server) is a solid base to grow real scenarios.

---

## Suggested priority order

1. Fix **report error handling** + **T2125 duplicate id** display logic.  
2. Add **escapeHtml** (or DOM APIs) for list/report rendering.  
3. Harden **CSV** or document “supported bank formats” explicitly.  
4. Grow **Vitest** on pure functions + **Playwright** on report totals with stub data.

When you close a row here, update this doc or link the PR so the audit stays honest.
