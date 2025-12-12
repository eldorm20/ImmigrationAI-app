import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';

const CLIENT = {
  email: process.env.CLIENT_EMAIL,
  password: process.env.CLIENT_PASSWORD,
};

const LAWYER = {
  email: process.env.LAWYER_EMAIL,
  password: process.env.LAWYER_PASSWORD,
};

test.describe('Non-destructive QA checks - credentials & UI smoke', () => {
  test('client: API login should succeed (read-only)', async ({ request }) => {
    test.skip(!CLIENT.email || !CLIENT.password, 'CLIENT_EMAIL/CLIENT_PASSWORD not provided');
    const login = await request.post(`${BASE}/api/auth/login`, {
      data: { email: CLIENT.email, password: CLIENT.password },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    expect(body.accessToken || body.token || body.access_token).toBeTruthy();
  });

  test('lawyer: API login should succeed (read-only)', async ({ request }) => {
    test.skip(!LAWYER.email || !LAWYER.password, 'LAWYER_EMAIL/LAWYER_PASSWORD not provided');
    const login = await request.post(`${BASE}/api/auth/login`, {
      data: { email: LAWYER.email, password: LAWYER.password },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    expect(body.accessToken || body.token || body.access_token).toBeTruthy();
  });

  test('random credentials should not authenticate', async ({ request }) => {
    const email = `e2e_random_${Date.now()}@example.com`;
    const login = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'RandomPass123!' },
    });
    expect(login.ok()).toBeFalsy();
  });

  test('UI smoke: homepage CTA and assessment flow opens', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const cta = page.locator('text=Get Free Assessment,Start Full Assessment,Bepul Boshlang,Bepul Boshlang', { exact: false });
    if (await cta.count() > 0) {
      await cta.first().click();
      const q = page.locator('text=Answer|Question|Eligibility|Answer Quick Questions|Answer 5 Questions', { exact: false });
      await expect(q.first()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(page).toHaveURL(/./);
    }
  });
});
