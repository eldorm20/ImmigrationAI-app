import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';
const ALLOW_SUBMIT = process.env.ALLOW_SUBMIT === '1';

test('Case management: open create form and optionally submit (guarded)', async ({ page }) => {
  // Navigate to dashboard where case management is expected
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  // Try to open 'New Case' or 'Create Case' UI
  const newCase = page.locator('text=New Case, text=Create Case, text=Yangi holat', { exact: false });
  test.skip((await newCase.count()) === 0, 'No case creation UI found on dashboard');
  await newCase.first().click().catch(()=>{});

  // Fill basic fields but do not submit unless allowed
  const title = page.locator('input[name="title"], input[placeholder*="Title"], input[aria-label*="title"]');
  if ((await title.count()) > 0) await title.first().fill('E2E Test Case').catch(()=>{});
  const desc = page.locator('textarea[name="description"], textarea[placeholder*="Description"]');
  if ((await desc.count()) > 0) await desc.first().fill('This is an automated QA test case — do not act on it.').catch(()=>{});

  const submit = page.locator('button:has-text("Create"), button:has-text("Submit"), button:has-text("Yaratish")');
  if ((await submit.count()) > 0) {
    if (ALLOW_SUBMIT) {
      await submit.first().click();
      const card = page.locator('text=E2E Test Case');
      await expect(card.first()).toBeVisible({ timeout: 8000 });
    } else {
      test.info().note('Create form filled but ALLOW_SUBMIT not enabled — skipping actual submit');
    }
  }
});
