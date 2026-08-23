import { defineConfig } from '@playwright/test';

import { env } from './config/env';

// Pure API testing: no browser projects are configured, so `playwright install`
// is not required — Playwright's APIRequestContext does not launch a browser.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: env.API_TIMEOUT_MS,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: env.BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
    trace: 'on-first-retry',
  },
});
