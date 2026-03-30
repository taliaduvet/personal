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
});
