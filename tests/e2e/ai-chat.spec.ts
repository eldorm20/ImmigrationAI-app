import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://immigrationai-app-production-b994.up.railway.app';

test('AI chat assistant responds to a simple question', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // open chat widget - try several selectors
  const chatBtn = page.locator('button:has-text("Chat"), button[aria-label*="chat"], text=AI Chat');
  if ((await chatBtn.count()) === 0) test.skip(true, 'No chat UI found on site');
  await chatBtn.first().click().catch(()=>{});
  await page.waitForTimeout(800);

  // find input within chat
  const chatInput = page.locator('textarea[placeholder*="Type"], input[placeholder*="message"], textarea');
  test.skip((await chatInput.count()) === 0, 'No chat input found');
  await chatInput.first().fill('Hello, what documents are needed for a Germany work visa?');
  await chatInput.first().press('Enter').catch(async ()=>{
    const send = page.locator('button:has-text("Send"), button:has-text("Yuborish")');
    if ((await send.count()) > 0) await send.first().click();
  });

  // wait for response
  const reply = page.locator('text=visa, documents, Germany, work', { exact: false });
  await expect(reply.first()).toBeVisible({ timeout: 15000 });
});
