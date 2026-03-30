import { test, expect } from './fixtures.js';
import { resetApp, chooseSolo, openAddModal, openSidebar, clickSidebarNav } from './helpers.js';

test.describe('Parking Lot functional flows', () => {
  test('Column notes accept text and persist', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);

    await page.click('.column-note-btn');
    const textarea = page.locator('.column-note-textarea').first();
    await expect(textarea).toBeVisible();

    const typed = 'Line 1\nLine 2 & symbols < > " \'';
    await textarea.fill(typed);
    await page.waitForTimeout(600);
    await page.click('.column-note-btn');
    await page.click('.column-note-btn');
    await expect(textarea).toHaveValue(typed);
  });

  test('Completing a task removes it from both Columns and Piles views', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);

    const beforeCount = await page.locator('#columns .task-card').count();
    await openAddModal(page);
    await page.fill('#task-input', 'e2e complete flow marker');
    await page.evaluate(() => {
      const btn = document.getElementById('submit-single');
      if (btn) btn.click();
    });
    await page.waitForSelector('#add-modal', { state: 'hidden' });
    await page.waitForTimeout(300);

    const colCards = page.locator('#columns .task-card');
    await expect(colCards).toHaveCount(beforeCount + 1);
    const card = colCards.filter({ hasText: 'e2e complete flow marker' }).first();
    await expect(card).toBeVisible();
    await card.locator('.btn-done-card').click();
    await page.waitForTimeout(200);

    await expect(colCards.filter({ hasText: 'e2e complete flow marker' })).toHaveCount(0);

    await page.click('#view-piles-btn');
    await page.waitForTimeout(200);
    await expect(page.locator('#columns .task-card').filter({ hasText: 'e2e complete flow marker' })).toHaveCount(0);
  });

  test('Natural language fills multiple fields (deadline + priority + category)', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);

    await openAddModal(page);
    await page.fill('#task-input', 'work invoice due mar 15 asap');
    await page.locator('#task-input').dispatchEvent('input');
    await page.locator('#submit-single').click();
    await page.waitForSelector('#add-modal', { state: 'hidden' });
    await page.waitForTimeout(300);

    const card = page.locator('#columns .task-card').filter({ hasText: /invoice/i }).first();
    await expect(card).toBeVisible();
    await expect(page.locator('.column', { hasText: 'Work' })).toBeVisible();
  });

  test('Journal typing supports paragraphs (double-newline) without cursor jump', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);

    await openSidebar(page);
    await clickSidebarNav(page, '#journal-btn');
    await expect(page.locator('#journal-panel')).toBeVisible();

    const input = page.locator('#journal-daily-input');
    await expect(input).toBeVisible();

    const text = 'First paragraph.\n\nSecond paragraph.';
    await input.click();
    await input.fill(text);
    await page.waitForTimeout(100);
    await expect(input).toHaveValue(text);
  });
});
