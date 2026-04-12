import { expect } from '@playwright/test';

/** Same boot path as app.spec — solo + stubbed cloud + __E2E__. */
export async function resetApp(page) {
  await page.addInitScript(() => {
    try {
      window.supabase = {
        createClient() {
          const noop = async () => ({ data: null, error: null });
          const chain = () => ({
            insert: () => ({ select: () => ({ single: noop }) }),
            update: () => ({ eq: noop }),
            delete: () => ({ eq: noop }),
            upsert: noop,
            select: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: noop }),
                maybeSingle: noop,
                order: () => Promise.resolve({ data: [], error: null })
              }),
              order: () => Promise.resolve({ data: [], error: null })
            }),
            eq: () => chain(),
            order: () => Promise.resolve({ data: [], error: null })
          });
          return {
            from: () => chain(),
            channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
            removeChannel: () => {}
          };
        }
      };
      window.chrono = {
        parseDate(s) {
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
      };
      window.__E2E__ = true;
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('parkingLot_hasChosenSolo', 'true');
      localStorage.setItem('parkingLot_deviceSyncId', 'e2e' + Date.now().toString(36).slice(-6));
    } catch { /* ignore */ }
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

export async function chooseSolo(page) {
  await page.waitForSelector('.column-add-btn', { state: 'visible', timeout: 60_000 });
}

export async function openSidebar(page) {
  await expect(page.locator('#main-app')).toBeVisible({ timeout: 30_000 });
  const menu = page.getByRole('button', { name: 'Open menu' });
  await menu.scrollIntoViewIfNeeded();
  await menu.click({ force: true });
  await expect(page.locator('#sidebar.open')).toBeVisible({ timeout: 20_000 });
}

/**
 * Sidebar uses transform + fixed positioning; scope clicks inside `#sidebar.open`
 * and wait for the drawer so items are not "off to the side" of the viewport.
 */
export async function clickSidebarNav(page, selector) {
  await expect(page.locator('#sidebar.open')).toBeVisible({ timeout: 15_000 });
  const sel = String(selector).trim();
  const inner = sel.startsWith('#') ? sel : `#${sel}`;
  const loc = page.locator('#sidebar.open').locator(inner);
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ force: true });
}

export async function openAddModal(page) {
  const colAdd = page.locator('.column-add-btn').first();
  await colAdd.waitFor({ state: 'visible' });
  await colAdd.click();
  await page.waitForSelector('#add-modal', { state: 'visible' });
  await expect(page.locator('#category-select')).toBeVisible();
}

/** Quick-add tab: multiple lines → Add all; modal closes. */
export async function quickAddLines(page, multilineText) {
  await openAddModal(page);
  await page.locator('#tab-quick').click();
  await page.locator('#quick-input').fill(multilineText);
  await page.locator('#submit-quick').click();
  await page.waitForSelector('#add-modal', { state: 'hidden' });
  await expect(page.locator('#columns .task-card').first()).toBeVisible({ timeout: 15_000 });
}
