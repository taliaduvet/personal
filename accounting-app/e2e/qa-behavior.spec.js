/**
 * Behavior checks that tie to docs/QA_AUDIT.md (auth validation, report rendering).
 */
import { test, expect } from './fixtures.js';
import { resetLedger, openPanel } from './helpers.js';

test.describe('Ledger QA — behavior (stubbed cloud)', () => {
  test('Sign in with empty fields shows inline error', async ({ page }) => {
    await page.addInitScript(() => {
      window.__E2E__ = true;
      window.__ACCT_E2E_NO_CLIENT__ = true;
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_e) {}
    });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#auth-signin-btn').click();
    await expect(page.locator('#auth-error')).toBeVisible();
    await expect(page.locator('#auth-error')).toContainText(/required/i);
  });

  test('Reports Apply renders summary and GST sections', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Reports');
    await page.locator('#report-apply').click();
    await expect(page.locator('#report-summary')).toContainText(/summary/i, { timeout: 10_000 });
    await expect(page.locator('#report-summary')).toContainText(/total income/i);
    await expect(page.locator('#report-gst')).toContainText(/gst collected/i);
    await expect(page.locator('#report-by-category')).toBeAttached();
  });

  test('Bank CSV review supports bulk submit and remembers vendor mapping', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Bank');

    const csv1 = [
      'Date,Description,Amount',
      '2025-02-01,SPOTIFY P123,-12.99',
    ].join('\n');
    await page.locator('#bank-file').setInputFiles({
      name: 'bank-one.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv1),
    });
    await page.locator('#bank-import-btn').click();
    await page.getByRole('button', { name: 'Submit all selected' }).waitFor({ timeout: 10_000 });

    await page.locator('.bank-row-category-value').first().evaluate((el) => {
      el.value = '8810';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'Submit all selected' }).click();
    await expect(page.locator('.bank-row-status').first()).toContainText(/saved/i);

    const csv2 = [
      'Date,Description,Amount',
      '2025-02-02,SPOTIFY P123,-12.99',
    ].join('\n');
    await page.locator('#bank-file').setInputFiles({
      name: 'bank-two.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv2),
    });
    await page.locator('#bank-import-btn').click();
    await page.getByRole('button', { name: 'Submit all selected' }).waitFor({ timeout: 10_000 });
    await expect(page.locator('.bank-row-category-value').first()).toHaveValue('8810');
  });

  test('GF product prefill keeps remembered regular and GF values editable', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Gluten-free medical');

    await page.locator('#gf-product-new-btn').click();
    await page.locator('#gf-prod-name').fill('GF Bread');
    await page.locator('#gf-prod-baseline').fill('4.50');
    await page.locator('#gf-prod-size-value').fill('500');
    await page.locator('#gf-prod-size-unit').selectOption('g');
    await page.locator('#gf-prod-add-use-btn').click();

    await page.locator('#gf-quantity').fill('1');
    await page.locator('#gf-total-paid').fill('7.80');
    await page.locator('#gf-size-value').fill('400');
    await page.locator('#gf-size-unit').selectOption('g');
    await page.locator('#gf-save-line-btn').click();

    await page.locator('#gf-quantity').fill('1');
    await expect(page.locator('#gf-regular-unit')).toHaveValue('4.50');
    await expect(page.locator('#gf-total-paid')).toHaveValue('7.80');
    await expect(page.locator('#gf-size-value')).toHaveValue('400');
    await expect(page.locator('#gf-regular-size-value')).toHaveValue('500');
  });
});
