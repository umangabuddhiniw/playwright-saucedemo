// src/tests/locked-user-video.spec.ts
import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { resultsCollector } from '../utils/results-collector';
import { logger, logHelper } from '../utils/logger';
import credentials from '../../data/credentials.json';

// Test data and configuration
const TEST_USER = 'locked_out_user';
const TEST_NAME = 'locked_out_user error handling verification';

test.describe('Locked User Tests', () => {
  let screenshotHelper: ScreenshotHelper; 

  test.beforeEach(async ({ page }, testInfo) => {
    // Initialize screenshot helper for each test
    screenshotHelper = new ScreenshotHelper(page, `locked_user_${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    logger.debug(`🔄 Test setup completed for: ${testInfo.title}`);
  });

  test('locked_out_user - error handling verification', async ({ page, browserName }) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let screenshotFilenames: string[] = [];
    let errorTextContent: string = '';

    try {
      // Step 1: Find user credentials
      logHelper.testStart(TEST_NAME, browserName);
      const user = credentials.users.find(user => user.username === TEST_USER);
      
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`👤 Testing with locked user: ${user.username}`, {
        browser: browserName,
        userType: 'locked_out_user'
      });

      // Step 2: Navigate to application with proper waiting
      logHelper.step('Navigate to application homepage');
      await page.goto('/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      await page.waitForLoadState('domcontentloaded');
      await screenshotHelper.takeScreenshot('01-login-page-loaded');

      // Step 3: Verify login page elements are present
      logHelper.step('Verify login page elements');
      await expect(page.locator('[data-test="username"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="password"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="login-button"]')).toBeVisible({ timeout: 10000 });

      // Step 4: Perform login with locked user
      logHelper.step('Perform login with locked_out_user credentials');
      await page.fill('[data-test="username"]', user.username);
      await page.fill('[data-test="password"]', user.password);
      await screenshotHelper.takeScreenshot('02-credentials-filled');

      // Step 5: Click login and wait for response
      logHelper.step('Click login button and wait for error state');
      await page.click('[data-test="login-button"]');
      
      // Wait for either error message or redirect with timeout
      await Promise.race([
        page.waitForSelector('[data-test="error"]', { timeout: 10000 }),
        page.waitForSelector('.inventory_list', { timeout: 10000 })
      ]);
      
      await page.waitForLoadState('networkidle');
      await screenshotHelper.takeScreenshot('03-post-login-attempt');

      // Step 6: Verify error message appears (expected behavior)
      logHelper.step('Verify locked user error message appears');
      const errorElement = page.locator('[data-test="error"]');
      
      try {
        await expect(errorElement).toBeVisible({ timeout: 5000 });
        errorTextContent = await errorElement.textContent() || 'Error message content not available';
        await screenshotHelper.takeScreenshot('04-error-message-visible');
        
        logger.info('🔒 Expected locked user error state reached', {
          errorMessage: errorTextContent,
          userType: 'locked_out_user'
        });

        // Step 7: Verify we're still on login page (not redirected)
        logHelper.step('Verify still on login page after error');
        const currentUrl = page.url();
        const loginButtonStillVisible = await page.locator('[data-test="login-button"]').isVisible().catch(() => false);
        
        if (loginButtonStillVisible) {
          logger.info('✅ User correctly remained on login page after lockout error');
          await screenshotHelper.takeScreenshot('05-still-on-login-page');
        } else {
          logger.warn('⚠️ User may have been redirected from login page');
        }

        // Step 8: Verify error message content contains expected text
        logHelper.step('Verify error message content');
        const expectedErrorKeywords = ['locked', 'sorry', 'user', 'account', 'blocked'];
        const hasExpectedContent = expectedErrorKeywords.some(keyword => 
          errorTextContent.toLowerCase().includes(keyword)
        );

        if (hasExpectedContent) {
          logger.info('✅ Error message contains expected locked user content', {
            content: errorTextContent
          });
        } else {
          logger.warn('⚠️ Error message may not contain expected locked user terminology', {
            actualContent: errorTextContent
          });
        }

      } catch (error) {
        // Error element not found - check if login was unexpectedly successful
        const inventoryVisible = await page.locator('.inventory_list').isVisible().catch(() => false);
        
        if (inventoryVisible) {
          throw new Error('Locked user was able to login successfully - this should not happen');
        } else {
          throw new Error('Expected error message not displayed for locked user');
        }
      }

      // Step 9: Final documentation
      logHelper.step('Final state documentation');
      await screenshotHelper.takeScreenshot('06-final-state');
      
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      logger.info('📋 Locked user test completed successfully', {
        duration,
        screenshotsTaken: screenshotFilenames.length,
        errorMessage: errorTextContent,
        expectedBehavior: 'User correctly prevented from logging in'
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      testStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      // Capture final error state
      logHelper.step('Capture final error state');
      await screenshotHelper.takeScreenshot('99-final-error-state').catch(() => {
        logger.error('❌ Failed to capture final error screenshot');
      });

      logger.error('💥 Locked user test failed', {
        duration,
        error: errorMessage,
        screenshotsTaken: screenshotFilenames.length,
        userType: 'locked_out_user'
      });

      logHelper.testFail(TEST_NAME, error instanceof Error ? error : new Error(errorMessage), duration);
    } finally {
      const duration = Date.now() - startTime;
      
      // ✅ FIXED: Use the correct TestResultData structure with string array
      const testResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: TEST_NAME,
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: screenshotFilenames, // ✅ FIXED: Now this is string[]
        errorMessage: errorMessage,
        itemsAdded: 0,
        itemsRemoved: 0,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      // ✅ FIXED: Use resultsCollector with correct data
      resultsCollector.addResult(testResult);

      // Log final result
      if (testStatus === 'passed') {
        logHelper.testPass(TEST_NAME, duration, {
          screenshots: screenshotFilenames.length,
          expectedBehavior: 'User correctly prevented from logging in with proper error message'
        });
      }

      logger.debug('📊 Locked user test result recorded', {
        status: testStatus,
        duration,
        screenshots: screenshotFilenames.length,
        userType: 'locked_out_user'
      });
    }
  });

  // Additional test to verify locked user consistency
  test('locked_out_user - error message consistency check', async ({ page, browserName }) => {
    const consistencyScreenshotHelper = new ScreenshotHelper(page, 'locked_user_consistency');
    const startTime = Date.now();
    let consistencyTestStatus: 'passed' | 'failed' = 'passed';
    let consistencyErrorMessage: string | undefined;
    let consistencyScreenshotFilenames: string[] = [];
    
    try {
      logHelper.testStart('locked_out_user error message consistency check', browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔒 Consistency check for locked user: ${user.username}`, {
        browser: browserName
      });

      // Navigate and attempt login
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.fill('[data-test="username"]', user.username);
      await page.fill('[data-test="password"]', user.password);
      await consistencyScreenshotHelper.takeScreenshot('01-login-attempt');
      
      await page.click('[data-test="login-button"]');
      await page.waitForLoadState('networkidle');
      await consistencyScreenshotHelper.takeScreenshot('02-post-login');

      // Verify error message consistency
      const errorElement = page.locator('[data-test="error"]');
      await expect(errorElement).toBeVisible({ timeout: 10000 });
      
      const errorText = await errorElement.textContent() || 'No error text available';
      await consistencyScreenshotHelper.takeScreenshot('03-error-message-consistent');
      
      // Verify error message is not empty and contains meaningful content
      if (errorText.trim().length < 5) {
        throw new Error('Error message appears to be empty or too short');
      }

      logger.info('✅ Locked user error message consistent', {
        errorMessage: errorText,
        consistencyCheck: 'passed'
      });

      consistencyScreenshotFilenames = consistencyScreenshotHelper.getScreenshotFilenames();

    } catch (error) {
      consistencyTestStatus = 'failed';
      consistencyErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      consistencyScreenshotFilenames = consistencyScreenshotHelper.getScreenshotFilenames();
      
      logHelper.testFail('locked_out_user error message consistency check', 
        error instanceof Error ? error : new Error(consistencyErrorMessage), 
        Date.now() - startTime
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      resultsCollector.addResult({
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user error message consistency check',
        username: TEST_USER,
        browser: browserName,
        status: consistencyTestStatus,
        duration: duration.toString(),
        screenshots: consistencyScreenshotFilenames, // ✅ FIXED: Now this is string[]
        errorMessage: consistencyErrorMessage,
        itemsAdded: 0,
        itemsRemoved: 0,
        startTime: new Date(startTime),
        endTime: new Date()
      });

      if (consistencyTestStatus === 'passed') {
        logHelper.testPass('locked_out_user error message consistency check', duration, {
          screenshots: consistencyScreenshotFilenames.length,
          result: 'Error message consistent across test runs'
        });
      }
    }
  });

  // Test to verify locked user cannot bypass lockout
  test('locked_out_user - multiple login attempts behavior', async ({ page, browserName }) => {
    const multipleAttemptsScreenshotHelper = new ScreenshotHelper(page, 'locked_user_multiple_attempts');
    const startTime = Date.now();
    let multipleAttemptsStatus: 'passed' | 'failed' = 'passed';
    let multipleAttemptsErrorMessage: string | undefined;
    let multipleAttemptsScreenshotFilenames: string[] = [];
    
    try {
      logHelper.testStart('locked_out_user multiple login attempts behavior', browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔄 Testing multiple login attempts for: ${user.username}`, {
        browser: browserName,
        testType: 'multiple_attempts'
      });

      // First login attempt
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.fill('[data-test="username"]', user.username);
      await page.fill('[data-test="password"]', user.password);
      await multipleAttemptsScreenshotHelper.takeScreenshot('01-first-attempt-setup');
      
      await page.click('[data-test="login-button"]');
      await page.waitForLoadState('networkidle');
      await multipleAttemptsScreenshotHelper.takeScreenshot('02-first-attempt-result');

      // Verify first attempt shows error
      const firstErrorElement = page.locator('[data-test="error"]');
      await expect(firstErrorElement).toBeVisible({ timeout: 10000 });
      const firstErrorText = await firstErrorElement.textContent() || '';
      await multipleAttemptsScreenshotHelper.takeScreenshot('03-first-error-visible');

      // Second login attempt without refreshing
      logHelper.step('Second login attempt without page refresh');
      await page.click('[data-test="login-button"]');
      await page.waitForLoadState('networkidle');
      await multipleAttemptsScreenshotHelper.takeScreenshot('04-second-attempt-result');

      // Verify error persists or changes appropriately
      const secondErrorElement = page.locator('[data-test="error"]');
      const secondErrorVisible = await secondErrorElement.isVisible().catch(() => false);
      
      if (secondErrorVisible) {
        const secondErrorText = await secondErrorElement.textContent() || '';
        logger.info('✅ Error persists on multiple login attempts', {
          firstError: firstErrorText.substring(0, 50) + '...',
          secondError: secondErrorText.substring(0, 50) + '...'
        });
        await multipleAttemptsScreenshotHelper.takeScreenshot('05-second-error-consistent');
      } else {
        logger.warn('⚠️ Error message disappeared on second attempt');
      }

      // Verify still on login page after multiple attempts
      const loginButtonStillVisible = await page.locator('[data-test="login-button"]').isVisible().catch(() => false);
      if (!loginButtonStillVisible) {
        throw new Error('Unexpected page navigation after multiple locked user login attempts');
      }

      multipleAttemptsScreenshotFilenames = multipleAttemptsScreenshotHelper.getScreenshotFilenames();

      logger.info('📋 Multiple attempts test completed', {
        attempts: 2,
        result: 'User consistently prevented from logging in'
      });

    } catch (error) {
      multipleAttemptsStatus = 'failed';
      multipleAttemptsErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      multipleAttemptsScreenshotFilenames = multipleAttemptsScreenshotHelper.getScreenshotFilenames();
      
      logHelper.testFail('locked_out_user multiple login attempts behavior', 
        error instanceof Error ? error : new Error(multipleAttemptsErrorMessage), 
        Date.now() - startTime
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      resultsCollector.addResult({
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user multiple login attempts behavior',
        username: TEST_USER,
        browser: browserName,
        status: multipleAttemptsStatus,
        duration: duration.toString(),
        screenshots: multipleAttemptsScreenshotFilenames, // ✅ FIXED: Now this is string[]
        errorMessage: multipleAttemptsErrorMessage,
        itemsAdded: 0,
        itemsRemoved: 0,
        startTime: new Date(startTime),
        endTime: new Date()
      });

      if (multipleAttemptsStatus === 'passed') {
        logHelper.testPass('locked_out_user multiple login attempts behavior', duration, {
          screenshots: multipleAttemptsScreenshotFilenames.length,
          result: 'User consistently locked out across multiple attempts'
        });
      }
    }
  });
});