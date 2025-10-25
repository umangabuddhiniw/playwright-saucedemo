// src/tests/standard-user-video.spec.ts
import { test, expect, Page } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { resultsCollector } from '../utils/results-collector';
import { logger, logHelper } from '../utils/logger';
import credentials from '../../data/credentials.json';

// Test data and configuration
const TEST_USER = 'standard_user';
const TEST_NAME = 'standard_user complete purchase flow verification';

// Simple helper function to get user information
function getUserInfo(username: string) {
  const user = credentials.users.find(user => user.username === username);
  if (!user) {
    throw new Error(`${username} not found in credentials.json`);
  }
  
  return {
    username: user.username,
    password: user.password,
    firstName: user.firstName || 'Test',
    lastName: user.lastName || 'User',
    postalCode: user.postalCode || '12345'
  };
}

// Simple helper function to add items to cart
async function addItemsToCart(page: Page, maxItems: number = 2): Promise<number> {
  let itemsAdded = 0;
  
  try {
    const addButtons = page.locator('[data-test^="add-to-cart"]');
    const availableButtons = await addButtons.count();
    
    if (availableButtons === 0) {
      return 0;
    }
    
    for (let i = 0; i < Math.min(maxItems, availableButtons); i++) {
      const button = addButtons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);
      const isEnabled = await button.isEnabled().catch(() => false);
      
      if (isVisible && isEnabled) {
        await button.click();
        itemsAdded++;
        await page.waitForTimeout(300);
      }
    }
    
  } catch (error) {
    console.log('⚠️ Error adding items to cart:', error);
  }
  
  return itemsAdded;
}

// Simple login function
async function performLogin(page: Page, user: any, screenshotHelper: ScreenshotHelper): Promise<void> {
  // Fill credentials
  await page.fill('[data-test="username"]', user.username);
  await page.fill('[data-test="password"]', user.password);
  await screenshotHelper.takeScreenshot('credentials-filled');
  
  // Click login button
  await page.click('[data-test="login-button"]');
  
  // Wait for navigation
  await page.waitForLoadState('networkidle');
  await screenshotHelper.takeScreenshot('post-login');
  
  // Check for errors
  const errorElement = page.locator('[data-test="error"]');
  const hasError = await errorElement.isVisible().catch(() => false);
  
  if (hasError) {
    const errorText = await errorElement.textContent().catch(() => 'Login error');
    throw new Error(`Login failed: ${errorText}`);
  }
  
  // Verify successful login
  const inventoryList = page.locator('.inventory_list');
  const isInventoryVisible = await inventoryList.isVisible({ timeout: 10000 }).catch(() => false);
  
  if (!isInventoryVisible) {
    throw new Error('Login unsuccessful - inventory page not loaded');
  }
}

test.describe('Standard User Complete Flow Tests', () => {
  let screenshotHelper: ScreenshotHelper;

  test.beforeEach(async ({ page }, testInfo) => {
    // Initialize screenshot helper for each test
    screenshotHelper = new ScreenshotHelper(page, `standard_user_${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`🔄 Test setup: ${testInfo.title}`);
  });

  test('standard_user - complete purchase flow verification', async ({ page, browserName }) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let screenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let flowSummary = '';

    try {
      console.log(`🚀 Starting test: ${TEST_NAME}`);
      
      // Step 1: Get user credentials
      const user = getUserInfo(TEST_USER);
      console.log(`👤 Testing with user: ${user.username}`);

      // Step 2: Navigate to application
      await page.goto('/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      await screenshotHelper.takeScreenshot('login-page-loaded');

      // Verify login page
      await expect(page.locator('[data-test="username"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="password"]')).toBeVisible({ timeout: 10000 });

      // Step 3: Perform login
      await performLogin(page, user, screenshotHelper);
      console.log('✅ Login successful');

      // Step 4: Verify inventory page
      await expect(page.locator('.inventory_list')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('inventory-page-accessible');

      // Step 5: View item details
      const firstItem = page.locator('.inventory_item_name').first();
      await expect(firstItem).toBeVisible();
      await firstItem.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('.inventory_details_container')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('item-detail-view');

      // Step 6: Go back to products
      await page.click('[data-test="back-to-products"]');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('.inventory_list')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('returned-to-products');

      // Step 7: Add items to cart
      itemsAdded = await addItemsToCart(page, 2);
      
      if (itemsAdded === 0) {
        throw new Error('Failed to add any items to cart');
      }
      
      await page.waitForTimeout(1000);
      await screenshotHelper.takeScreenshot('items-added-to-cart');
      console.log(`🛒 Added ${itemsAdded} items to cart`);

      // Step 8: Navigate to cart
      await page.click('.shopping_cart_link');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('.cart_list')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('cart-page');

      // Step 9: Remove one item if available
      const removeButtons = page.locator('[data-test^="remove"]');
      const removeCount = await removeButtons.count();
      
      if (removeCount > 0 && itemsAdded > 0) {
        await removeButtons.first().click();
        itemsRemoved = 1;
        await page.waitForTimeout(1000);
        console.log('✅ Removed one item from cart');
      }
      
      await screenshotHelper.takeScreenshot('cart-after-removal');

      // Step 10: Start checkout process
      await page.click('[data-test="checkout"]');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-test="firstName"]')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('checkout-form');

      // Step 11: Fill checkout information
      await page.fill('[data-test="firstName"]', user.firstName);
      await page.fill('[data-test="lastName"]', user.lastName);
      await page.fill('[data-test="postalCode"]', user.postalCode);
      await screenshotHelper.takeScreenshot('checkout-filled');
      
      await page.click('[data-test="continue"]');
      await page.waitForLoadState('networkidle');
      await screenshotHelper.takeScreenshot('checkout-overview');

      // Step 12: Verify checkout overview
      await expect(page.locator('.summary_info')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('checkout-overview-verified');

      // Step 13: Complete purchase
      await page.click('[data-test="finish"]');
      await page.waitForLoadState('networkidle');
      await screenshotHelper.takeScreenshot('order-completion');

      // Step 14: Verify order completion
      await expect(page.locator('.complete-header')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.complete-header')).toContainText('Thank you for your order!');
      await screenshotHelper.takeScreenshot('order-complete-verified');

      // Create flow summary
      flowSummary = `Completed: ${itemsAdded} items added, ${itemsRemoved} items removed`;
      
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      console.log('🎉 Test completed successfully', {
        duration,
        screenshots: screenshotFilenames.length,
        itemsAdded,
        itemsRemoved
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      testStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      // Capture final error state
      await screenshotHelper.takeScreenshot('final-error-state').catch(() => {
        console.error('❌ Failed to capture error screenshot');
      });

      console.error('💥 Test failed:', {
        duration,
        error: errorMessage,
        screenshots: screenshotFilenames.length
      });

    } finally {
      const duration = Date.now() - startTime;
      
      // ✅ SIMPLE & RELIABLE test result collection
      const testResult = {
        testFile: 'standard-user-video.spec.ts',
        testName: TEST_NAME,
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: screenshotFilenames,
        errorMessage: errorMessage || flowSummary,
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      try {
        // Add result to collector - this is the key integration point
        resultsCollector.addResult(testResult);
        console.log('✅ Test result recorded in collector');
        
      } catch (collectorError) {
        console.error('❌ Error recording test result:', collectorError);
        // Don't fail the test if results collection fails
      }

      // Log final status
      if (testStatus === 'passed') {
        console.log(`✅ TEST PASSED: ${TEST_NAME} (${duration}ms)`);
      } else {
        console.log(`❌ TEST FAILED: ${TEST_NAME} (${duration}ms)`);
      }
    }
  });

  // Simple smoke test
  test('standard_user - basic functionality smoke test', async ({ page, browserName }) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' = 'passed';
    let errorMessage: string | undefined;
    let itemsAdded = 0;
    
    try {
      console.log('🚀 Starting smoke test');
      
      const user = getUserInfo(TEST_USER);

      // Quick login test
      await page.goto('/', { waitUntil: 'networkidle' });
      await performLogin(page, user, screenshotHelper);
      
      // Verify basic functionality
      await expect(page.locator('.inventory_list')).toBeVisible();
      await expect(page.locator('.shopping_cart_link')).toBeVisible();
      
      // Quick add to cart test
      itemsAdded = await addItemsToCart(page, 1);
      console.log(`✅ Smoke test passed: ${itemsAdded} items added`);

    } catch (error) {
      testStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Smoke test failed:', errorMessage);
      throw error;
      
    } finally {
      const duration = Date.now() - startTime;
      
      const testResult = {
        testFile: 'standard-user-video.spec.ts',
        testName: 'standard_user basic functionality smoke test',
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: [],
        errorMessage: errorMessage || `Smoke test ${testStatus}`,
        itemsAdded: itemsAdded,
        itemsRemoved: 0,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      try {
        resultsCollector.addResult(testResult);
      } catch (error) {
        console.error('Error recording smoke test result:', error);
      }
    }
  });
});

// Global afterAll for summary
test.afterAll(async () => {
  console.log('📊 Test execution completed!');
  
  try {
    const stats = resultsCollector.getStats();
    
    console.log('🎯 FINAL TEST SUMMARY:', {
      totalTests: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      successRate: `${stats.successRate}%`,
      totalScreenshots: stats.totalScreenshots
    });
    
    // Export final results
    const jsonResults = resultsCollector.exportToJSON();
    console.log(`💾 Results exported (${jsonResults.length} characters)`);
    
  } catch (error) {
    console.error('Error generating final summary:', error);
  }
});