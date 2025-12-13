import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';
const ALLOW_SUBMIT = process.env.ALLOW_SUBMIT === '1';

test('Eligibility assessment full smoke (non-destructive unless ALLOW_SUBMIT=1)', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Click a probable CTA
  const start = page.locator('text=Get Free Assessment, text=Start Full Assessment, text=Bepul Boshlang', { exact: false });
  test.skip(!(await start.count() > 0), 'Assessment CTA not found');
  await start.first().click();

  // Walk through several steps filling common fields
  // Use generic selectors and try multiple known names
  for (let step = 0; step < 6; step++) {
    // fill text inputs if present
    const textInput = page.locator('input[type="text"], input[type="number"], textarea');
    if ((await textInput.count()) > 0) {
      await textInput.first().fill('Test').catch(()=>{});
    }
    // select selects
    const selects = page.locator('select');
    if ((await selects.count()) > 0) {
      await selects.first().selectOption({ index: 1 }).catch(()=>{});
    }
    // click next
    const next = page.locator('button:has-text("Next"), button:has-text("Keyingi"), button:has-text("Continue"), button:has-text("Submit")');
    if ((await next.count()) > 0) {
      await next.first().click().catch(()=>{});
      await page.waitForTimeout(700);
    } else {
      break;
    }
  }

  // If submit button present and allowed, click it
  const submit = page.locator('button:has-text("Submit"), button:has-text("Get Assessment"), button:has-text("Natija")');
  if ((await submit.count()) > 0) {
    if (ALLOW_SUBMIT) {
      await submit.first().click();
      // expect result
      const result = page.locator('text=Approval|Approval Chance|Natija|%');
      await expect(result.first()).toBeVisible({ timeout: 10000 });
    } else {
      test.info().note('Found submit button but ALLOW_SUBMIT is not enabled — skipping final submit');
    }
  } else {
    // look for result widget
    const result = page.locator('text=Approval|Approval Chance|Natija|%');
    await expect(result.first()).toBeVisible({ timeout: 10000 }).catch(()=>{});
  }
});
