/**
 * Maps to docs/QA_FULL_CHECKLIST.md section B (Today bar & suggestions).
 */
import { expect, test } from './fixtures.js';
import { chooseSolo, quickAddLines, resetApp } from './helpers.js';

test.describe('Checklist B — Today bar & suggestions', () => {
  test('B1 Today list empty state', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await expect(page.locator('#today-list .empty-state')).toBeVisible();
  });

  test('B2 Add to Today from board selection', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await quickAddLines(page, 'qa-b2-alpha\nqa-b2-beta');
    await page
      .locator('#columns .task-card')
      .filter({ hasText: 'qa-b2-alpha' })
      .locator('.task-text')
      .click({ force: true });
    await expect(page.locator('#add-to-suggestions-float.visible')).toHaveCount(1);
    await page.locator('#add-to-suggestions-btn').click();
    await expect(page.locator('#today-list .today-item').filter({ hasText: 'qa-b2-alpha' })).toHaveCount(1);
    await expect(page.locator('#columns .task-card').filter({ hasText: 'qa-b2-alpha' })).toHaveCount(1);
  });

  test('B3 Clear selection on float', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await quickAddLines(page, 'qa-b3-lone');
    await page
      .locator('#columns .task-card')
      .filter({ hasText: 'qa-b3-lone' })
      .locator('.task-text')
      .click({ force: true });
    await expect(page.locator('#add-to-suggestions-float.visible')).toHaveCount(1);
    await page.locator('#add-to-suggestions-clear').click();
    await expect(page.locator('#add-to-suggestions-float.visible')).toHaveCount(0);
    await expect(page.locator('#columns .task-card.selected')).toHaveCount(0);
  });

  test('B4 Done on today item archives and clears suggestion', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await quickAddLines(page, 'qa-b4-complete-me');
    await page
      .locator('#columns .task-card')
      .filter({ hasText: 'qa-b4-complete-me' })
      .locator('.task-text')
      .click({ force: true });
    await expect(page.locator('#add-to-suggestions-float.visible')).toHaveCount(1);
    await page.locator('#add-to-suggestions-btn').click();
    await expect(page.locator('#today-list .today-item')).toHaveCount(1);
    await page.locator('#today-list .today-item .btn-done').click();
    await expect(page.locator('#today-list .empty-state')).toBeVisible();
    await expect(page.locator('#completed-tally')).toContainText(/Completed today:\s*[1-9]/);
  });

  test('B6 Reorder today suggestions', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await quickAddLines(page, 'qa-b6-first\nqa-b6-second');
    await page
      .locator('#columns .task-card')
      .filter({ hasText: 'qa-b6-first' })
      .locator('.task-text')
      .click({ force: true });
    await page
      .locator('#columns .task-card')
      .filter({ hasText: 'qa-b6-second' })
      .locator('.task-text')
      .click({ force: true });
    await expect(page.locator('#add-to-suggestions-float.visible')).toHaveCount(1);
    await page.locator('#add-to-suggestions-btn').click();
    await expect
      .poll(async () =>
        page.locator('#today-list .today-item .task-text').evaluateAll((els) => els.map((e) => e.textContent))
      )
      .toEqual(['qa-b6-first', 'qa-b6-second']);

    await page.locator('#today-list .today-item').first().locator('.btn-order[data-action="down"]').click();
    await expect
      .poll(async () =>
        page.locator('#today-list .today-item .task-text').evaluateAll((els) => els.map((e) => e.textContent))
      )
      .toEqual(['qa-b6-second', 'qa-b6-first']);
  });

  test('B7 Clear all suggestions', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await quickAddLines(page, 'qa-b7-one');
    await page
      .locator('#columns .task-card')
      .filter({ hasText: 'qa-b7-one' })
      .locator('.task-text')
      .click({ force: true });
    await expect(page.locator('#add-to-suggestions-float.visible')).toHaveCount(1);
    await page.locator('#add-to-suggestions-btn').click();
    await expect(page.locator('#today-list .today-item')).toHaveCount(1);
    await page.locator('#clear-suggestions').click();
    await expect(page.locator('#today-list .empty-state')).toBeVisible();
  });
});
