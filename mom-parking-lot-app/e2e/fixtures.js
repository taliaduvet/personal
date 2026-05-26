import { test as base, expect } from '@playwright/test';
import playwrightConfig from '../playwright.config.js';

/** Mirrors `use` keys that belong on `browser.newContext()`. */
function contextOptionsFromConfig() {
  const { use } = playwrightConfig;
  return {
    baseURL: use.baseURL,
    viewport: use.viewport,
    serviceWorkers: use.serviceWorkers,
  };
}

/**
 * One BrowserContext per worker → one headed Chrome window when you use `--workers=1`.
 * Playwright’s default is a fresh context per test (isolation); each new context tends to
 * spawn a new window, which looks like Chrome flashing open/close between tests.
 *
 * The built-in `context` fixture cannot be re-registered as worker-scoped; we keep a worker
 * fixture and expose the same instance through test-scoped `context`.
 */
export const test = base.extend({
  workerContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext(contextOptionsFromConfig());
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],
  context: async ({ workerContext }, use) => {
    await use(workerContext);
  },
});

export { expect };
