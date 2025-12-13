import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD;

test('Protected API endpoints require auth and work with token', async ({ request }) => {
  // Example protected endpoint - try /api/users/me or /api/profile
  const protectedPath = '/api/users/me';
  const resNoAuth = await request.get(`${BASE}${protectedPath}`);
  // Expect unauthorized or redirect
  expect(resNoAuth.status()).toBeGreaterThanOrEqual(300);

  test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'CLIENT_EMAIL/CLIENT_PASSWORD not provided — skipping auth flow');
  const login = await request.post(`${BASE}/api/auth/login`, { data: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const body = await login.json();
  const token = body.accessToken || body.token || body.access_token;
  expect(token).toBeTruthy();

  // call protected endpoint with token
  const resAuth = await request.get(`${BASE}${protectedPath}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(resAuth.ok()).toBeTruthy();
});
