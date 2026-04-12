import { test, expect } from './fixtures.js';
import { resetLedger, importBankCsv } from './helpers.js';

test('imports a bank CSV and shows transactions in reconcile view', async ({ page }) => {
  await resetLedger(page);
  await importBankCsv(page, 'bank-sample.csv');

  await expect(page.locator('#bank-mapping')).toBeVisible();
  await expect(page.locator('#bank-col-date')).toHaveValue('Date');
  await expect(page.locator('#bank-col-desc')).toHaveValue('Description');
  await expect(page.locator('#bank-col-amount')).toHaveValue('Amount');

  await expect(page.locator('.bank-row')).toHaveCount(3);

  const starbucksRow = page.locator('.bank-row').filter({ hasText: 'STARBUCKS' });
  await expect(starbucksRow.locator('.bank-row-entry-type')).toHaveValue('expense');

  const payrollRow = page.locator('.bank-row').filter({ hasText: 'PAYROLL' });
  await expect(payrollRow.locator('.bank-row-entry-type')).toHaveValue('income');
});

test('deduplicates: re-importing the same CSV imports 0 new rows', async ({ page }) => {
  await resetLedger(page);
  await importBankCsv(page, 'bank-sample.csv');
  await expect(page.locator('.bank-row')).toHaveCount(3);

  await importBankCsv(page, 'bank-sample.csv');
  await expect(page.locator('.app-toast')).toContainText('already in your bank list');
});
