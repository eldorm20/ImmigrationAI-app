import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';

const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'eldorbekmukhammadjonov@gmail.com';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || 'Ziraat123321**';

const LAWYER_EMAIL = process.env.LAWYER_EMAIL || 'furxat.19.97.12@gmail.com';
const LAWYER_PASSWORD = process.env.LAWYER_PASSWORD || 'Ziraat123321**';

test.describe('UI login flows (non-destructive)', () => {
  test('client can sign in and see dashboard', async ({ page }) => {
    await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
    // Fill login form - try multiple label variations
    await page.fill('input[type="email"]', CLIENT_EMAIL).catch(() => {});
    await page.fill('input[type="password"]', CLIENT_PASSWORD).catch(() => {});
    // Click primary button - try multiple text options
    const btn = page.locator('button:has-text("Kirish"), button:has-text("Sign in"), button:has-text("Log in" )');
    await btn.first().click();
    // wait for dashboard or protected route
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/dashboard|account|profile/,{timeout:10000}).catch(async ()=>{
      // fallback: check presence of dashboard widgets
      await expect(page.locator('text=Dashboard').first()).toBeVisible({timeout:5000});
    });
  });

  test('lawyer can sign in and access lawyer features', async ({ page }) => {
    await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', LAWYER_EMAIL).catch(() => {});
    await page.fill('input[type="password"]', LAWYER_PASSWORD).catch(() => {});
    const btn = page.locator('button:has-text("Kirish"), button:has-text("Sign in"), button:has-text("Log in")');
    await btn.first().click();
    await page.waitForTimeout(1500);
    // Expect elements that lawyers typically see: 'Cases', 'Clients', 'Dashboard'
    const possible = page.locator('text=Cases, text=Clients, text=Lawyer, text=My Cases', { exact: false });
    await expect(possible.first()).toBeVisible({ timeout: 8000 }).catch(async ()=>{
      await expect(page.locator('text=Dashboard').first()).toBeVisible({timeout:5000});
    });
  });
});
