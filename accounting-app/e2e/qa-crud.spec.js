import { test, expect } from './fixtures.js';
import { resetLedger, openPanel } from './helpers.js';

test.describe('Income CRUD (stub)', () => {
  test.beforeEach(async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Income');
  });

  test('adds an income entry and sees it in the list', async ({ page }) => {
    await page.locator('#income-add-btn').click();
    await page.locator('#income-amount').fill('1500.00');
    await page.locator('#income-gst').fill('75.00');
    await page.locator('#income-type').selectOption('gig');
    await page.locator('#income-save-btn').click();
    await expect(page.locator('#income-list .entry-row').first()).toContainText('1575.00');
  });

  test('edits an income entry', async ({ page }) => {
    await page.locator('#income-list .edit-btn').first().click();
    await page.locator('#income-amount').fill('2000.00');
    await page.locator('#income-gst').fill('0');
    await page.locator('#income-save-btn').click();
    await expect(page.locator('#income-list .entry-row').first()).toContainText('2000.00');
  });

  test('deletes an income entry with inline confirm', async ({ page }) => {
    const initialCount = await page.locator('#income-list .entry-row').count();
    await page.locator('#income-list .delete-btn').first().click();
    await expect(page.locator('.inline-confirm')).toBeVisible();
    await page.locator('.inline-confirm-yes').click();
    await expect(page.locator('#income-list .entry-row')).toHaveCount(initialCount - 1);
  });

  test('shows error when amount is missing', async ({ page }) => {
    await page.locator('#income-add-btn').click();
    await page.locator('#income-save-btn').click();
    await expect(page.locator('.app-toast')).toContainText('required');
  });
});

test.describe('Expense CRUD (stub)', () => {
  test.beforeEach(async ({ page }) => {
    await resetLedger(page);
    await openPanel(page, 'Expenses');
  });

  test('adds an expense with category and sees it in the list', async ({ page }) => {
    await page.locator('#expense-add-btn').click();
    await page.locator('#expense-amount').fill('42.00');
    const catInput = page.locator('#expense-category-wrap .category-picker-input');
    await catInput.fill('Office');
    await page.locator('#expense-category-wrap .category-picker-list li').first().click();
    await page.locator('#expense-save-btn').click();
    await expect(page.locator('#expense-list .entry-row').first()).toContainText('42.00');
  });

  test('shows error when category is missing', async ({ page }) => {
    await page.locator('#expense-add-btn').click();
    await page.locator('#expense-amount').fill('10.00');
    await page.locator('#expense-save-btn').click();
    await expect(page.locator('.app-toast')).toContainText('required');
  });
});
