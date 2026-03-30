import { test as base, expect } from '@playwright/test';
import playwrightConfig from '../playwright.config.js';

function contextOptionsFromConfig() {
  const { use } = playwrightConfig;
  return {
    baseURL: use.baseURL,
    viewport: use.viewport,
    serviceWorkers: use.serviceWorkers,
  };
}

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
