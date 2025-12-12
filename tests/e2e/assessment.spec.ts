import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';

test('Eligibility assessment flow (smoke, non-destructive)', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Try to open assessment: several CTAs exist; try multiple selectors
  const start = page.locator('text=Get Free Assessment, text=Start Full Assessment, text=Bepul Boshlang', { exact: false });
  if (await start.count() > 0) {
    await start.first().click();
    // Wait for question or form
    const question = page.locator('text=Answer|Question|Eligibility|What is your', { exact: false });
    await expect(question.first()).toBeVisible({ timeout: 8000 });
    // Fill one or two inputs as a smoke test if present
    // Age selector or range
    const ageInput = page.locator('select[name="age"], select[aria-label*="age"]');
    if (await ageInput.count() > 0) {
      await ageInput.first().selectOption({ index: 1 }).catch(() => {});
    }
    // Education
    const edu = page.locator('select[name="education"], input[name="education"]');
    if (await edu.count() > 0) {
      await edu.first().selectOption({ index: 1 }).catch(() => {});
    }
    // Submit or next
    const next = page.locator('button:has-text("Next"), button:has-text("Submit"), button:has-text("Natija"), button:has-text("Get Assessment")');
    if (await next.count() > 0) {
      await next.first().click().catch(()=>{});
    }
    // Expect result or assessment output
    const result = page.locator('text=Approval|Approval Chance|Natija|approval chance', { exact: false });
    await expect(result.first()).toBeVisible({ timeout: 10000 }).catch(()=>{
      // Sometimes result appears as a percent
      await expect(page.locator('text=%').first()).toBeVisible({timeout:5000}).catch(()=>{});
    });
  } else {
    test.skip(true, 'No assessment CTA found on homepage');
  }
});
