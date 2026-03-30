/**
 * Supabase stub seeds acct_income / acct_expense range queries — assert report math surfaces in DOM.
 */
import { test, expect } from './fixtures.js';
import { resetLedger, openPanel } from './helpers.js';

test.describe('Ledger QA — report totals (stubbed seed data)', () => {
  test('Reports Apply shows income and expense totals from stub', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Reports');
    await page.locator('#report-apply').click();
    await expect(page.locator('#report-summary')).toContainText('105.00', { timeout: 10_000 });
    await expect(page.locator('#report-summary')).toContainText('25.00');
    await expect(page.locator('#report-summary')).toContainText('80.00');
  });
});
