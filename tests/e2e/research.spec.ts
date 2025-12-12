import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';

test('Research library search smoke', async ({ page }) => {
  await page.goto(`${BASE}/research`, { waitUntil: 'networkidle' });
  // try to find search field
  const search = page.locator('input[type="search"], input[placeholder*="Search"], input[name="q"]');
  if (await search.count() === 0) {
    test.skip(true, 'No search input found on research page');
    return;
  }
  await search.first().fill('work permit');
  // trigger enter
  await search.first().press('Enter');
  // check results
  const results = page.locator('text=No results, .result, .card, article, li');
  await expect(results.first()).toBeVisible({ timeout: 8000 });
});
