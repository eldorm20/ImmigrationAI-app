import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['junit', { outputFile: 'test-results/results.xml' }], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app',
    actionTimeout: 0,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
