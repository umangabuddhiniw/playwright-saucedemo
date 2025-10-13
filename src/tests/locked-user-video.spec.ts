import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { addTestResult } from '../utils/testRunner';
import { logger, logHelper } from '../utils/logger'; // Add logger import
import credentials from '../../data/credentials.json';

test('locked_out_user - error handling video', async ({ page, browserName }) => {
  const user = credentials.users.find(user => user.username === 'locked_out_user');
  const screenshotHelper = new ScreenshotHelper(page, 'locked_out_user_error');
  const startTime = Date.now();
  
  if (!user) {
    logger.error('locked_out_user not found in credentials.json');
    throw new Error('locked_out_user not found in credentials.json');
  }

  logHelper.testStart('locked_out_user error handling', browserName);
  logger.info(`User: ${user.username}`);
  
  try {
    // Step 1: Attempt login
    logHelper.step('Attempt login with locked_out_user');
    await page.goto('/');
    await screenshotHelper.takeScreenshot('01-login-page');
    await page.fill('[data-test="username"]', user.username);
    await page.fill('[data-test="password"]', user.password);
    await page.click('[data-test="login-button"]');
    
    // Step 2: Verify error message appears
    logHelper.step('Verify error message appears');
    await expect(page.locator('[data-test="error"]')).toBeVisible();
    await screenshotHelper.takeScreenshot('02-error-message');
    
    const duration = Date.now() - startTime;
    
    addTestResult({
      username: user.username,
      status: 'passed',
      duration: duration,
      screenshots: screenshotHelper.getScreenshotsTaken(),
      timestamp: new Date(),
      testFile: 'locked-user-video.spec.ts',
      testName: 'Error handling video',
      browser: browserName
    });
    
    logHelper.testPass('locked_out_user error handling', duration);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    addTestResult({
      username: user.username,
      status: 'failed',
      duration: duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      screenshots: screenshotHelper.getScreenshotsTaken(),
      timestamp: new Date(),
      testFile: 'locked-user-video.spec.ts',
      testName: 'Error handling video',
      browser: browserName
    });
    
    logHelper.testFail('locked_out_user error handling', error instanceof Error ? error.message : 'Unknown error', duration);
    throw error;
  }
});