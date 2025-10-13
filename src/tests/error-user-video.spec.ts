import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { addTestResult } from '../utils/testRunner';
import { logger, logHelper } from '../utils/logger'; // Add logger import
import credentials from '../../data/credentials.json';

test('error_user - UI issues and error handling video', async ({ page, browserName }) => {
  const user = credentials.users.find(user => user.username === 'error_user');
  const screenshotHelper = new ScreenshotHelper(page, 'error_user_ui_issues');
  const startTime = Date.now();
  
  if (!user) {
    logger.error('error_user not found in credentials.json');
    throw new Error('error_user not found in credentials.json');
  }

  logHelper.testStart('error_user UI issues handling', browserName);
  logger.info(`User: ${user.username}`);
  
  try {
    // Step 1: Login
    logHelper.step('Login with credentials');
    await page.goto('/');
    await screenshotHelper.takeScreenshot('01-login-page');
    await page.fill('[data-test="username"]', user.username);
    await page.fill('[data-test="password"]', user.password);
    await page.click('[data-test="login-button"]');
    
    // Step 2: Verify login successful and document UI issues
    logHelper.step('Verify login and document UI issues');
    await expect(page.locator('.inventory_list')).toBeVisible();
    await screenshotHelper.takeScreenshot('02-inventory-page');
    
    // Step 3: Document specific error_user UI issues
    logHelper.step('Document UI issues for error_user');
    await screenshotHelper.takeScreenshot('03-ui-issues-documented');
    
    // Step 4: Try to add item to cart to document error handling
    logHelper.step('Test add to cart functionality');
    try {
      await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
      await screenshotHelper.takeScreenshot('04-item-added');
      logger.info('Item added to cart successfully');
    } catch (error) {
      await screenshotHelper.takeScreenshot('04-add-to-cart-error');
      logger.warn('Expected error behavior documented for error_user');
    }
    
    const duration = Date.now() - startTime;
    
    addTestResult({
      username: user.username,
      status: 'passed',
      duration: duration,
      screenshots: screenshotHelper.getScreenshotsTaken(),
      timestamp: new Date(),
      testName: 'UI issues and error handling video',
      testFile: 'error-user-video.spec.ts',
      browser: browserName
    });
    
    logHelper.testPass('error_user UI issues handling', duration);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Take final error screenshot before reporting
    logHelper.step('Capture final error state');
    await screenshotHelper.takeScreenshot('05-final-error-state');
    
    addTestResult({
      username: user.username,
      status: 'failed',
      duration: duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      screenshots: screenshotHelper.getScreenshotsTaken(),
      timestamp: new Date(),
      testName: 'UI issues and error handling video',
      testFile: 'error-user-video.spec.ts',
      browser: browserName
    });
    
    logHelper.testFail('error_user UI issues handling', error instanceof Error ? error.message : 'Unknown error', duration);
    throw error;
  }
});