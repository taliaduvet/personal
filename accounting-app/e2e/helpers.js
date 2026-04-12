import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Boot Ledger with E2E Supabase stub (server swaps CDN → e2e/supabase-stub.js). */
export async function resetLedger(page) {
  await page.addInitScript(() => {
    window.__E2E__ = true;
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_e) {}
  });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-app')).toHaveClass(/visible/, { timeout: 30_000 });
  await expect(page.getByRole('tab', { name: 'Dashboard' })).toBeVisible();
}

export async function openPanel(page, name) {
  await page.getByRole('tab', { name: name, exact: true }).click();
}

/** Upload a bank CSV fixture and click Import (column mapping must succeed). */
export async function importBankCsv(page, fixtureFileName) {
  await openPanel(page, 'Bank');
  const fileInput = page.locator('#bank-file');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', fixtureFileName));
  await page.locator('#bank-import-btn').click();
}
