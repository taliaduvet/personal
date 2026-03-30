/**
 * Automatable smoke tests for Ledger (accounting-app).
 * Real Supabase / RLS / uploads → manual or staging; see README “Test the whole system”.
 */
import { test, expect } from './fixtures.js';
import { resetLedger, openPanel } from './helpers.js';

test.describe('Ledger QA — surface smoke (stubbed cloud)', () => {
  test('Boot: main app visible with Dashboard tab', async ({ page }) => {
    await resetLedger(page);
    await expect(page.locator('#panel-dashboard')).toHaveClass(/visible/);
    await expect(page.locator('#dash-apply')).toBeVisible();
    await expect(page.locator('#dash-cards')).toBeAttached();
  });

  test('Auth screen shows when not logged in (no Supabase client)', async ({ page }) => {
    await page.addInitScript(() => {
      window.__E2E__ = true;
      window.__ACCT_E2E_NO_CLIENT__ = true;
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_e) {}
    });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#auth-signin-btn')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Need an account? Sign up' })).toBeVisible();
  });

  test('Tab strip: Income, Expenses, Reports, Bank, Budget, Gluten-free medical', async ({
    page,
  }) => {
    await resetLedger(page);
    for (const label of [
      'Income',
      'Expenses',
      'Reports',
      'Bank',
      'Budget',
      'Gluten-free medical',
    ]) {
      await openPanel(page, label);
      await expect(page.getByRole('tab', { name: label, exact: true })).toHaveClass(/active/);
    }
    await openPanel(page, 'Dashboard');
  });

  test('Income: Add income opens form', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Income');
    await page.locator('#income-add-btn').click();
    await expect(page.locator('#income-form-wrap')).toBeVisible();
  });

  test('Expenses: Add expense opens form', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Expenses');
    await page.locator('#expense-add-btn').click();
    await expect(page.locator('#expense-form-wrap')).toBeVisible();
  });

  test('Reports: controls and Apply present', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Reports');
    await expect(page.locator('#report-from')).toBeVisible();
    await expect(page.locator('#report-to')).toBeVisible();
    await expect(page.locator('#report-apply')).toBeVisible();
  });

  test('Bank: CSV file input present', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Bank');
    await expect(page.locator('#bank-file')).toBeAttached();
  });

  test('Budget: Apply and planned table', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Budget');
    await expect(page.locator('#panel-budget.panel.visible')).toBeVisible();
    await expect(page.locator('#budget-apply')).toBeVisible();
    await expect(page.locator('#budget-planned-tbody')).toBeAttached();
  });

  test('Gluten-free: upload control and CRA summary section', async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Gluten-free medical');
    await expect(page.locator('#gf-receipt-upload-btn')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CRA Summary' })).toBeVisible();
    await expect(page.locator('#gf-summary-apply')).toBeVisible();
  });

  test('Sign out returns to auth screen', async ({ page }) => {
    await resetLedger(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.locator('#auth-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main-app')).not.toHaveClass(/visible/);
  });
});
