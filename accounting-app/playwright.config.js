import { defineConfig } from '@playwright/test';

const slowMoMs =
  process.env.PW_SLOW_MO != null && String(process.env.PW_SLOW_MO).length > 0
    ? Number(process.env.PW_SLOW_MO)
    : process.env.PW_HEADED_SLOW === '1'
      ? 400
      : 0;

const launchOptions =
  slowMoMs > 0
    ? {
        slowMo: slowMoMs,
        args: ['--window-size=1000,720', '--window-position=48,40'],
      }
    : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    channel: 'chrome',
    headless: true,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 720 },
    launchOptions,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/server.mjs',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 60_000,
  },
});
