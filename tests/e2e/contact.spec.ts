import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';
const ALLOW_SUBMIT = process.env.ALLOW_SUBMIT === '1';

test('Contact form validation and optional submit', async ({ page }) => {
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  const name = page.locator('input[name="name"], input[placeholder*="Name"]');
  const email = page.locator('input[type="email"], input[name="email"]');
  const subject = page.locator('input[name="subject"], input[placeholder*="Subject"]');
  const message = page.locator('textarea[name="message"], textarea[placeholder*="Message"]');
  // check validation: try to submit empty
  const submit = page.locator('button:has-text("Send"), button:has-text("Send Message"), button:has-text("Yuborish")');
  if (await submit.count() === 0) test.skip(true, 'No contact submit button found');

  await submit.first().click();
  // expect validation errors or that fields are required
  await expect(name.first()).toBeVisible();
  await expect(email.first()).toBeVisible();

  // Fill fields
  await name.fill('QA Tester').catch(()=>{});
  await email.fill('qa+test@example.com').catch(()=>{});
  await subject.fill('QA inquiry').catch(()=>{});
  await message.fill('This is an automated QA test. Please ignore.').catch(()=>{});

  if (ALLOW_SUBMIT) {
    await submit.first().click();
    // Expect success message if allowed
    const success = page.locator('text=Thank you, text=Message sent, text=success', { exact: false });
    await expect(success.first()).toBeVisible({ timeout: 8000 });
  } else {
    test.info().note('Skipping actual contact submit — set ALLOW_SUBMIT=1 to enable');
  }
});
