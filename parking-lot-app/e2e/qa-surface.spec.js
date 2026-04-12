/**
 * Extra smoke coverage for docs/QA_FULL_CHECKLIST.md.
 * Does not replace manual/cloud checks (Talk about, email triage, push, etc.).
 */
import { test, expect } from './fixtures.js';
import { resetApp, chooseSolo, openSidebar, openAddModal, clickSidebarNav } from './helpers.js';

test.describe('QA matrix — automatable surface smoke', () => {
  test('Fresh storage shows entry screen', async ({ page }) => {
    await page.addInitScript(() => {
      window.__E2E__ = true;
      window.supabase = {
        createClient() {
          const noop = async () => ({ data: null, error: null });
          const chain = () => ({
            insert: () => ({ select: () => ({ single: noop }) }),
            update: () => ({ eq: noop }),
            delete: () => ({ eq: noop }),
            upsert: noop,
            select: () => ({
              eq: () => ({ maybeSingle: noop, order: () => Promise.resolve({ data: [], error: null }) }),
              order: () => Promise.resolve({ data: [], error: null })
            })
          });
          return {
            from: () => chain(),
            channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
            removeChannel: () => {}
          };
        }
      };
      window.chrono = { parseDate() { return null; } };
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#entry-screen')).toBeVisible();
    await expect(page.locator('#entry-solo-btn')).toBeVisible();
  });

  test('Search input filters column cards', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await openAddModal(page);
    await page.fill('#task-input', 'qa-search-unique-xyz');
    await page.locator('#submit-single').click();
    await page.waitForSelector('#add-modal', { state: 'hidden' });
    await expect(page.locator('#columns .task-card').filter({ hasText: 'qa-search-unique-xyz' })).toHaveCount(1);
    await page.fill('#search-input', 'qa-search-unique');
    await page.waitForTimeout(150);
    await expect(page.locator('#columns .task-card').filter({ hasText: 'qa-search-unique-xyz' })).toHaveCount(1);
    await page.fill('#search-input', 'nomatch-zzz');
    await page.waitForTimeout(150);
    await expect(page.locator('#columns .task-card')).toHaveCount(0);
  });

  test('Quick add tab creates multiple tasks', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    const before = await page.locator('#columns .task-card').count();
    await openAddModal(page);
    await page.locator('#tab-quick').click();
    await page.locator('#quick-input').fill('qa quick one\nqa quick two');
    await page.locator('#submit-quick').click();
    await page.waitForSelector('#add-modal', { state: 'hidden' });
    await page.waitForTimeout(300);
    await expect(page.locator('#columns .task-card')).toHaveCount(before + 2);
  });

  test('Sidebar opens Settings; display name persists after Save', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await openSidebar(page);
    await clickSidebarNav(page, '#settings-btn');
    await expect(page.locator('#settings-modal')).toBeVisible();
    await page.locator('#settings-display-name').fill('QA Display');
    await page.locator('#save-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();
    const storedName = await page.evaluate(() => {
      const raw = localStorage.getItem('parkingLot_data');
      return raw ? JSON.parse(raw).displayName : null;
    });
    expect(storedName).toBe('QA Display');
  });

  test('Archive modal lists completed task', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await openAddModal(page);
    await page.fill('#task-input', 'qa archive marker');
    await page.locator('#submit-single').click();
    await page.waitForSelector('#add-modal', { state: 'hidden' });
    const card = page.locator('#columns .task-card').filter({ hasText: 'qa archive marker' }).first();
    await card.locator('.btn-done-card').click();
    await page.waitForTimeout(200);
    await openSidebar(page);
    await clickSidebarNav(page, '#archive-btn');
    await expect(page.locator('#archive-modal')).toBeVisible();
    await expect(page.locator('#archive-list')).toContainText('qa archive marker');
    await page.locator('#close-archive').click();
  });

  test('Analytics panel shows summary text', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await openSidebar(page);
    await clickSidebarNav(page, '#analytics-btn');
    await expect(page.locator('#analytics-panel')).toBeVisible();
    await expect(page.locator('#analytics-text')).not.toHaveText('');
    await page.locator('#close-analytics').click();
    await expect(page.locator('#analytics-panel')).toBeHidden();
  });

  test('Consistency and Relationships panels open', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await openSidebar(page);
    await clickSidebarNav(page, '#consistency-btn');
    await expect(page.locator('#consistency-panel')).toBeVisible();
    await page.locator('#close-consistency').click();
    await expect(page.locator('#consistency-panel')).toBeHidden();
    await page.waitForTimeout(200);
    await openSidebar(page);
    await clickSidebarNav(page, '#relationships-btn');
    await expect(page.locator('#relationships-panel')).toBeVisible();
    await page.locator('#close-relationships').click();
  });

  test('Seed render modal opens and closes', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await page.locator('#seed-fab').click({ force: true });
    await expect(page.locator('#seed-render-modal')).toBeVisible();
    await page.locator('#close-seed-render').click();
    await expect(page.locator('#seed-render-modal')).toBeHidden();
  });

  test('Focus mode toggles overview visibility', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await expect(page.locator('#focus-mode')).toBeHidden();
    await page.locator('#focus-btn').click({ force: true });
    await expect(page.locator('#focus-mode')).toBeVisible();
    await expect(page.locator('#overview')).toBeHidden();
    await page.locator('#focus-btn').click({ force: true });
    await expect(page.locator('#focus-mode')).toBeHidden();
    await expect(page.locator('#overview')).toBeVisible();
  });

  test('Export backup triggers a JSON download', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await openSidebar(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      clickSidebarNav(page, '#export-btn')
    ]);
    expect(download.suggestedFilename()).toMatch(/parking-lot-backup-.*\.json$/);
  });

  test('Keyboard ? opens shortcuts overlay', async ({ page }) => {
    await resetApp(page);
    await chooseSolo(page);
    await page.locator('#main-content').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('?');
    await expect(page.locator('#shortcuts-overlay')).toBeVisible();
    await page.locator('#close-shortcuts').click();
    await expect(page.locator('#shortcuts-overlay')).toBeHidden();
  });
});
