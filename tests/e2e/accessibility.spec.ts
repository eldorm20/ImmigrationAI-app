import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';

test('Basic accessibility smoke (main role and headings)', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const main = page.getByRole('main');
  await expect(main).toBeVisible({ timeout: 5000 });
  const h1 = main.locator('h1');
  await expect(h1.first()).toBeVisible({ timeout: 5000 });
  // ensure skip-to-content or landmarks exist
  const landmark = page.locator('[role="main"], [aria-label*="main"], main');
  await expect(landmark.first()).toBeVisible();
});
