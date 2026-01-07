/**
 * Basic E2E Test Suite for Critical User Flows
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication Flow', () => {
    test('should register a new user', async ({ page }) => {
        await page.goto(`${BASE_URL}/register`);

        const timestamp = Date.now();
        await page.fill('input[name="email"]', `test${timestamp}@example.com`);
        await page.fill('input[name="password"]', 'TestPass123!');
        await page.fill('input[name="confirmPassword"]', 'TestPass123!');

        await page.click('button[type="submit"]');

        // Should redirect to dashboard or show verification message
        await expect(page).toHaveURL(/\/(dashboard|verify-email)/);
    });

    test('should login with valid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        await page.fill('input[name="email"]', 'demo@example.com');
        await page.fill('input[name="password"]', 'password123');

        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        await page.fill('input[name="email"]', 'wrong@example.com');
        await page.fill('input[name="password"]', 'wrongpass');

        await page.click('button[type="submit"]');

        await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });
});

test.describe('Client Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Login as client
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'client@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);
    });

    test('should display dashboard stats', async ({ page }) => {
        await expect(page.locator('text=Applications')).toBeVisible();
        await expect(page.locator('text=Documents')).toBeVisible();
    });

    test('should create new application', async ({ page }) => {
        await page.click('text=New Application');

        await page.selectOption('select[name="visaType"]', 'Skilled Worker');
        await page.selectOption('select[name="country"]', 'UK');

        await page.click('button[type="submit"]');

        await expect(page.locator('text=Application created')).toBeVisible();
    });

    test('should navigate through tabs', async ({ page }) => {
        await page.click('text=Documents');
        await expect(page.locator('[data-tab="documents"]')).toBeVisible();

        await page.click('text=Chat');
        await expect(page.locator('[data-tab="chat"]')).toBeVisible();
    });

    test('should send AI chat message', async ({ page }) => {
        await page.click('text=Chat');

        await page.fill('textarea[placeholder*="message"]', 'What documents do I need for UK visa?');
        await page.click('button:has-text("Send")');

        await expect(page.locator('.ai-response')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Document Upload', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'client@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);
    });

    test('should upload document', async ({ page }) => {
        await page.click('text=Documents');
        await page.click('text=Upload');

        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-passport.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('PDF content'),
        });

        await page.selectOption('select[name="documentType"]', 'passport');
        await page.click('button:has-text("Upload")');

        await expect(page.locator('text=Upload successful')).toBeVisible();
    });
});

test.describe('Lawyer Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'lawyer@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/lawyer/);
    });

    test('should display lawyer stats', async ({ page }) => {
        await expect(page.locator('text=Total Revenue')).toBeVisible();
        await expect(page.locator('text=Active Leads')).toBeVisible();
    });

    test('should view applications list', async ({ page }) => {
        await page.click('text=Applications');

        await expect(page.locator('table')).toBeVisible();
    });

    test('should create new lead', async ({ page }) => {
        await page.click('text=Leads');
        await page.click('text=New Lead');

        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="email"]', 'john.doe@example.com');

        await page.click('button[type="submit"]');

        await expect(page.locator('text=Lead created')).toBeVisible();
    });
});

test.describe('Mobile Responsiveness', () => {
    test('should adapt layout on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

        await page.goto(`${BASE_URL}/dashboard`);

        // Sidebar should be collapsed on mobile
        const sidebar = await page.locator('[data-sidebar]');
        await expect(sidebar).toHaveCSS('transform', /translate/); // Check if hidden

        // Menu button should be visible
        await expect(page.locator('[data-mobile-menu]')).toBeVisible();
    });

    test('should have tappable buttons on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`${BASE_URL}/dashboard`);

        const buttons = await page.locator('button').all();
        for (const button of buttons.slice(0, 5)) {
            const box = await button.boundingBox();
            if (box) {
                expect(box.height).toBeGreaterThanOrEqual(44); // Min tap target 44px
            }
        }
    });
});

test.describe('Performance', () => {
    test('dashboard should load within 3 seconds', async ({ page }) => {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(3000);
    });
});

export { };
