// src/tests/standard-user-video.spec.ts
import { test, expect, Page } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { resultsCollector } from '../utils/results-collector';
import { logger, logHelper } from '../utils/logger';
import credentials from '../../data/credentials.json';

// Test data and configuration
const TEST_USER = 'standard_user';
const TEST_NAME = 'standard_user - complete purchase flow verification';

// Define interface for test result to match resultsCollector expectations
interface TestResult {
  testFile: string;
  testName: string;
  username: string;
  browser: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: string;
  screenshots: string[];
  errorMessage?: string;
  startTime: Date;
  endTime: Date;
}

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
        
        // Verify the button changed to remove
        try {
          const removeButton = page.locator('[data-test^="remove"]').nth(i);
          await removeButton.waitFor({ state: 'visible', timeout: 2000 });
        } catch {
          logger.warn(`⚠️ Remove button not immediately visible for item ${i + 1}`);
        }
      }
    }
    
  } catch (error) {
    logger.warn('⚠️ Error adding items to cart', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return itemsAdded;
}

// Enhanced function to get cart badge count
async function getCartBadgeCount(page: Page): Promise<number> {
  try {
    const cartBadge = page.locator('.shopping_cart_badge');
    if (await cartBadge.isVisible({ timeout: 3000 })) {
      const badgeText = await cartBadge.textContent();
      return parseInt(badgeText || '0', 10);
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

// Simple login function - FIXED: Better waiting for rendering
async function performLogin(page: Page, user: any, screenshotHelper: ScreenshotHelper): Promise<void> {
  // FIX: Wait for login page to fully render before filling
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
  await page.waitForSelector('[data-test="password"]', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500); // Extra rendering time
  
  // Fill credentials
  await page.fill('[data-test="username"]', user.username);
  await page.fill('[data-test="password"]', user.password);
  await screenshotHelper.takeScreenshot('credentials-filled');

  // Click login button
  await page.click('[data-test="login-button"]');
  
  // FIX: Better waiting for post-login navigation
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Extra time for post-login rendering
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
  const isInventoryVisible = await inventoryList.isVisible({ timeout: 15000 }).catch(() => false);
  
  if (!isInventoryVisible) {
    throw new Error('Login unsuccessful - inventory page not loaded');
  }
}

test.describe('Standard User Complete Flow Tests', () => {
  let screenshotHelper: ScreenshotHelper;

  test.beforeEach(async ({ page }, testInfo) => {
    // Initialize screenshot helper for each test
    screenshotHelper = new ScreenshotHelper(page, `standard_user_${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    logger.debug(`🔄 Test setup: ${testInfo.title}`);
  });

  test('standard_user - complete purchase flow verification', async ({ page, browserName }, testInfo) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let screenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let flowSummary = '';

    try {
      logHelper.testStart(TEST_NAME, browserName);
      logger.info(`🚀 Starting test: ${TEST_NAME}`, {
        browser: browserName,
        user: TEST_USER
      });
      
      // Step 1: Get user credentials
      const user = getUserInfo(TEST_USER);
      logger.info(`👤 Testing with user: ${user.username}`);

      // Step 2: Navigate to application - FIXED: Better waiting
      await page.goto('/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // FIX: Wait for login page to render completely before screenshot
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForSelector('[data-test="password"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000); // Extra rendering time for CI
      
      await screenshotHelper.takeScreenshot('login-page-loaded');

      // Verify login page
      await expect(page.locator('[data-test="username"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="password"]')).toBeVisible({ timeout: 10000 });

      // Step 3: Perform login
      await performLogin(page, user, screenshotHelper);
      logger.info('✅ Login successful');

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

      // Step 7: Add items to cart with proper tracking
      const manuallyAddedItems = await addItemsToCart(page, 2);
      
      // Verify cart badge count matches
      const badgeCount = await getCartBadgeCount(page);
      itemsAdded = badgeCount > 0 ? badgeCount : manuallyAddedItems;
      
      if (itemsAdded === 0) {
        throw new Error('Failed to add any items to cart');
      }
      
      await page.waitForTimeout(1000);
      await screenshotHelper.takeScreenshot('items-added-to-cart');
      logger.info(`🛒 Added ${itemsAdded} items to cart`);

      // Step 8: Navigate to cart
      await page.click('.shopping_cart_link');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('.cart_list')).toBeVisible({ timeout: 10000 });
      await screenshotHelper.takeScreenshot('cart-page');

      // Step 9: Remove one item if available with accurate counting
      const cartItemsBeforeRemoval = await page.locator('.cart_item, [data-test="inventory-item"]').count();
      logger.info(`🛒 Cart items before removal: ${cartItemsBeforeRemoval}`);
      
      // Update itemsAdded based on actual cart count if different
      if (cartItemsBeforeRemoval !== itemsAdded) {
        logger.warn(`🔄 Adjusting itemsAdded from ${itemsAdded} to ${cartItemsBeforeRemoval} based on actual cart count`);
        itemsAdded = cartItemsBeforeRemoval;
      }
      
      const removeButtons = page.locator('[data-test^="remove"]');
      const removeCount = await removeButtons.count();
      
      if (removeCount > 0 && itemsAdded > 0) {
        await removeButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Wait for cart to update and verify removal
        const cartItemsAfterRemoval = await page.locator('.cart_item, [data-test="inventory-item"]').count();
        itemsRemoved = cartItemsBeforeRemoval - cartItemsAfterRemoval;
        
        // Update itemsAdded count after removal
        itemsAdded = itemsAdded - itemsRemoved;
        
        logger.info(`✅ Removed item from cart. Cart items: ${cartItemsBeforeRemoval} → ${cartItemsAfterRemoval}`);
        logger.info(`📊 Updated counts: Added: ${itemsAdded}, Removed: ${itemsRemoved}`);
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

      logger.info('🎉 Test completed successfully', {
        duration,
        screenshotsTaken: screenshotFilenames.length,
        itemsAdded,
        itemsRemoved,
        user: TEST_USER
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      testStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      // Capture final error state
      await screenshotHelper.takeScreenshot('final-error-state').catch(() => {
        logger.error('❌ Failed to capture error screenshot');
      });

      logger.error('💥 Test failed', {
        duration,
        error: errorMessage,
        screenshotsTaken: screenshotFilenames.length,
        user: TEST_USER,
        itemsAdded,
        itemsRemoved
      });

    } finally {
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Match EXACT interface expected by resultsCollector
      const testResult: TestResult = {
        testFile: 'standard-user-video.spec.ts',
        testName: TEST_NAME,
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: screenshotFilenames,
        errorMessage: errorMessage || flowSummary,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      try {
        // Add result to collector - this is the key integration point
        resultsCollector.addResult(testResult);
        logger.debug('✅ Test result recorded in collector', {
          user: TEST_USER,
          status: testStatus,
          duration
        });
        
      } catch (collectorError) {
        logger.error('❌ Error recording test result', {
          error: collectorError instanceof Error ? collectorError.message : 'Unknown error'
        });
        // Don't fail the test if results collection fails
      }

      // Log final status using logHelper
      if (testStatus === 'passed') {
        logHelper.testPass(TEST_NAME, duration, {
          screenshots: screenshotFilenames.length,
          summary: flowSummary
        });
      } else {
        logHelper.testFail(TEST_NAME, 
          errorMessage ? new Error(errorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });

  // Simple smoke test
  test('standard_user - basic functionality smoke test', async ({ page, browserName }, testInfo) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let screenshotFilenames: string[] = [];
    
    try {
      logHelper.testStart('standard_user - basic functionality smoke test', browserName);
      logger.info('🚀 Starting smoke test', {
        browser: browserName,
        user: TEST_USER
      });
      
      const user = getUserInfo(TEST_USER);

      // Quick login test
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // FIX: Wait for login page rendering
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      await performLogin(page, user, screenshotHelper);
      
      // Verify basic functionality
      await expect(page.locator('.inventory_list')).toBeVisible();
      await expect(page.locator('.shopping_cart_link')).toBeVisible();
      
      // Quick add to cart test
      const manuallyAddedItems = await addItemsToCart(page, 1);
      const badgeCount = await getCartBadgeCount(page);
      itemsAdded = badgeCount > 0 ? badgeCount : manuallyAddedItems;
      
      logger.info(`✅ Smoke test passed: ${itemsAdded} items added`);

      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

    } catch (error) {
      testStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Smoke test failed', {
        error: errorMessage,
        user: TEST_USER
      });
      throw error;
      
    } finally {
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use correct interface with all required properties
      const testResult: TestResult = {
        testFile: 'standard-user-video.spec.ts',
        testName: 'standard_user - basic functionality smoke test',
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: screenshotFilenames,
        errorMessage: errorMessage,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      try {
        resultsCollector.addResult(testResult);
        
        // Log final status
        if (testStatus === 'passed') {
          logHelper.testPass('standard_user - basic functionality smoke test', duration, {
            screenshots: screenshotFilenames.length
          });
        } else {
          logHelper.testFail('standard_user - basic functionality smoke test', 
            errorMessage ? new Error(errorMessage) : new Error('Test failed'), 
            duration
          );
        }
        
      } catch (error) {
        logger.error('Error recording smoke test result', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });
});

// Global afterAll for summary
test.afterAll(async () => {
  logger.info('📊 Test execution completed!');
  
  try {
    const stats = resultsCollector.getStats();
    
    logger.info('🎯 FINAL TEST SUMMARY', {
      totalTests: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      successRate: `${stats.successRate}%`
    });
    
  } catch (error) {
    logger.error('Error generating final summary', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});