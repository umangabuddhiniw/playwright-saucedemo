import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { addTestResult } from '../utils/testRunner';
import { logger, logHelper } from '../utils/logger'; // Add logger import
import credentials from '../../data/credentials.json';

test('problem_user - broken images and UI issues video', async ({ page, browserName }) => {
  const user = credentials.users.find(user => user.username === 'problem_user');
  const screenshotHelper = new ScreenshotHelper(page, 'problem_user_ui_issues');
  const startTime = Date.now();
  
  if (!user) {
    logger.error('problem_user not found in credentials.json');
    throw new Error('problem_user not found in credentials.json');
  }

  logHelper.testStart('problem_user broken images handling', browserName);
  logger.info(`User: ${user.username}`);
  
  try {
    // Step 1: Login
    logHelper.step('Login with problem_user credentials');
    await page.goto('/');
    await screenshotHelper.takeScreenshot('01-login-page');
    await page.fill('[data-test="username"]', user.username);
    await page.fill('[data-test="password"]', user.password);
    await page.click('[data-test="login-button"]');
    
    // Step 2: Verify login successful
    logHelper.step('Verify login successful');
    await expect(page.locator('.inventory_list')).toBeVisible();
    await screenshotHelper.takeScreenshot('02-inventory-page');
    logger.info('Login successful for problem_user');
    
    // Step 3: Check for broken images
    logHelper.step('Check for broken images');
    const images = page.locator('.inventory_item_img img');
    const imageCount = await images.count();
    
    logger.info(`Found ${imageCount} images on the page`);
    await screenshotHelper.takeScreenshot('03-images-check');
    
    // Enhanced: Actually check for broken images
    let brokenImagesCount = 0;
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const isBroken = await image.evaluate((img: HTMLImageElement) => {
        return img.naturalWidth === 0 || img.complete === false;
      });
      if (isBroken) {
        brokenImagesCount++;
        logger.warn(`Broken image found at index ${i}`);
      }
    }
    
    if (brokenImagesCount > 0) {
      logger.info(`Found ${brokenImagesCount} broken images out of ${imageCount} total images`);
    } else {
      logger.info('No broken images detected');
    }
    
    const duration = Date.now() - startTime;
    
    addTestResult({
      username: user.username,
      status: 'passed',
      duration: duration,
      screenshots: screenshotHelper.getScreenshotsTaken(),
      timestamp: new Date(),
      testFile: 'problem-user-video.spec.ts',
      testName: 'Broken images and UI issues video',
      browser: browserName
    });
    
    logHelper.testPass('problem_user broken images handling', duration);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    addTestResult({
      username: user.username,
      status: 'failed',
      duration: duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      screenshots: screenshotHelper.getScreenshotsTaken(),
      timestamp: new Date(),
      testFile: 'problem-user-video.spec.ts',
      testName: 'Broken images and UI issues video',
      browser: browserName
    });
    
    logHelper.testFail('problem_user broken images handling', error instanceof Error ? error.message : 'Unknown error', duration);
    throw error;
  }
});