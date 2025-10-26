import { test, expect } from '@playwright/test';

test('diagnostic test - check artifact generation', async ({ page }) => {
  console.log('🔍 Starting diagnostic test...');
  await page.goto('https://example.com');
  console.log('✅ Page loaded');
  await page.screenshot({ path: 'diagnostic-screenshot.png' });
  console.log('📸 Screenshot taken');
  await page.waitForTimeout(1000);
  await expect(page).toHaveTitle('Example Domain');
  console.log('✅ Test completed');
});
