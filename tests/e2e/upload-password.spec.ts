import { test, expect } from '@playwright/test';
import fs from 'fs';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

function randomEmail() {
  return `e2e_user_${Date.now()}@example.com`;
}

test.describe('E2E: upload and change-password (API)', () => {
  test('register -> change password -> upload document', async ({ request }) => {
    const email = randomEmail();
    const password = 'TestPass123!';

    // Register user
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email,
        password,
        firstName: 'E2E',
        lastName: 'User',
      },
    });
    expect(registerRes.ok()).toBeTruthy();
    const registerJson = await registerRes.json();
    expect(registerJson.accessToken).toBeTruthy();
    const accessToken = registerJson.accessToken as string;

    // Change password
    const changeRes = await request.post(`${API_BASE}/users/change-password`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        currentPassword: password,
        newPassword: 'NewPass123!'
      }
    });
    expect(changeRes.ok()).toBeTruthy();

    // Upload a small test file
    const buffer = Buffer.from('%PDF-1.4\n%Dummy PDF for testing\n');
    const uploadRes = await request.post(`${API_BASE}/documents/upload`, {
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer,
        },
        documentType: 'e2e_test'
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });

    expect(uploadRes.ok()).toBeTruthy();
    const uploadJson = await uploadRes.json();
    expect(uploadJson.id).toBeTruthy();
    expect(uploadJson.url).toBeTruthy();
  });
});
