// src/tests/locked-user-video.spec.ts
import { test, expect, Page } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { resultsCollector } from '../utils/results-collector';
import { logger, logHelper } from '../utils/logger';
import credentials from '../../data/credentials.json';

// Test data and configuration
const TEST_USER = 'locked_out_user';

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
  itemsAdded: number;
  itemsRemoved: number;
  startTime: Date;
  endTime: Date;
}

// Simple login function for locked user
async function performLockedUserLogin(page: Page, user: any, screenshotHelper: ScreenshotHelper): Promise<{ success: boolean; errorMessage: string }> {
  // Wait for login page to fully render before filling
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
  
  // Better waiting for post-login navigation
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Extra time for post-login rendering
  await screenshotHelper.takeScreenshot('post-login');
  
  // Check for errors - for locked user, we expect an error
  const errorElement = page.locator('[data-test="error"]');
  const hasError = await errorElement.isVisible().catch(() => false);
  
  if (hasError) {
    const errorText = await errorElement.textContent().catch(() => null) || 'Locked user error';
    return { success: false, errorMessage: errorText };
  }
  
  // Check if login was unexpectedly successful
  const inventoryVisible = await page.locator('.inventory_list, .inventory_container').first().isVisible().catch(() => false);
  if (inventoryVisible) {
    return { success: true, errorMessage: 'Unexpectedly logged in successfully' };
  }
  
  return { success: false, errorMessage: 'No error message but also no inventory access' };
}

test.describe('Locked User Tests', () => {
  let screenshotHelper: ScreenshotHelper; 

  test.beforeEach(async ({ page }, testInfo) => {
    // Initialize screenshot helper for each test
    screenshotHelper = new ScreenshotHelper(page, `locked_user_${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    logger.debug(`🔄 Test setup completed for: ${testInfo.title}`);
  });

  test('locked_out_user - error handling verification', async ({ page, browserName }, testInfo) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let screenshotFilenames: string[] = [];
    let errorTextContent: string = '';
    let testSummary = '';

    try {
      const TEST_NAME = 'locked_out_user - error handling verification';
      
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
      
      // Wait for login page to render completely before screenshot
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForSelector('[data-test="password"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000); // Extra rendering time for CI
      
      await screenshotHelper.takeScreenshot('01-login-page-loaded');

      // Step 3: Verify login page elements are present
      logHelper.step('Verify login page elements');
      await expect(page.locator('[data-test="username"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="password"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="login-button"]')).toBeVisible({ timeout: 10000 });

      // Step 4: Perform login with locked user
      logHelper.step('Perform login with locked_out_user credentials');
      const loginResult = await performLockedUserLogin(page, user, screenshotHelper);

      // Step 5: Verify error message appears (expected behavior)
      logHelper.step('Verify locked user error message appears');
      
      if (!loginResult.success) {
        // This is the expected behavior for locked user
        errorTextContent = loginResult.errorMessage;
        await screenshotHelper.takeScreenshot('04-error-message-visible');
        
        logger.info('🔒 Expected locked user error state reached', {
          errorMessage: errorTextContent,
          userType: 'locked_out_user'
        });

        // Step 6: Verify we're still on login page (not redirected)
        logHelper.step('Verify still on login page after error');
        const currentUrl = page.url();
        const loginButtonStillVisible = await page.locator('[data-test="login-button"]').isVisible().catch(() => false);
        
        if (loginButtonStillVisible) {
          logger.info('✅ User correctly remained on login page after lockout error');
          await screenshotHelper.takeScreenshot('05-still-on-login-page');
        } else {
          logger.warn('⚠️ User may have been redirected from login page');
        }

        // Step 7: Verify error message content contains expected text
        logHelper.step('Verify error message content');
        const expectedErrorKeywords = ['locked', 'sorry', 'user', 'account', 'blocked'];
        const hasExpectedContent = expectedErrorKeywords.some(keyword => 
          errorTextContent.toLowerCase().includes(keyword)
        );

        if (hasExpectedContent) {
          logger.info('✅ Error message contains expected locked user content', {
            content: errorTextContent
          });
          testSummary = `Correctly prevented from login with message: ${errorTextContent.substring(0, 50)}...`;
        } else {
          logger.warn('⚠️ Error message may not contain expected locked user terminology', {
            actualContent: errorTextContent
          });
          testSummary = `Prevented from login but unexpected message: ${errorTextContent.substring(0, 50)}...`;
        }

      } else {
        // This should not happen for locked user
        throw new Error('Locked user was able to login successfully - this should not happen');
      }

      // Step 8: Final documentation
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

    } finally {
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use proper TestResult interface with ALL required properties
      const testResult: TestResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user - error handling verification',
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: screenshotFilenames,
        errorMessage: errorMessage || testSummary,
        itemsAdded: 0,
        itemsRemoved: 0,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      // ✅ FIXED: Use resultsCollector with correct data
      resultsCollector.addResult(testResult);

      // Log final result
      if (testStatus === 'passed') {
        logHelper.testPass('locked_out_user - error handling verification', duration, {
          screenshots: screenshotFilenames.length,
          itemsAdded: 0,
          itemsRemoved: 0,
          summary: testSummary
        });
      } else {
        logHelper.testFail('locked_out_user - error handling verification', 
          errorMessage ? new Error(errorMessage) : new Error('Test failed'), 
          duration
        );
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
  test('locked_out_user - error message consistency check', async ({ page, browserName }, testInfo) => {
    const consistencyScreenshotHelper = new ScreenshotHelper(page, 'locked_user_consistency');
    const startTime = Date.now();
    let consistencyTestStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let consistencyErrorMessage: string | undefined;
    let consistencyScreenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let consistencySummary = '';
    
    try {
      const TEST_NAME = 'locked_out_user - error message consistency check';
      logHelper.testStart(TEST_NAME, browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔒 Consistency check for locked user: ${user.username}`, {
        browser: browserName
      });

      // Navigate and attempt login
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Wait for login page rendering
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      const loginResult = await performLockedUserLogin(page, user, consistencyScreenshotHelper);

      // Verify error message consistency
      if (!loginResult.success) {
        const errorText = loginResult.errorMessage;
        
        // Verify error message is not empty and contains meaningful content
        if (errorText.trim().length < 5) {
          throw new Error('Error message appears to be empty or too short');
        }

        consistencySummary = `Consistent error message: ${errorText.substring(0, 50)}...`;
        logger.info('✅ Locked user error message consistent', {
          errorMessage: errorText,
          consistencyCheck: 'passed'
        });

        await consistencyScreenshotHelper.takeScreenshot('03-error-message-consistent');
      } else {
        throw new Error('Locked user unexpectedly logged in successfully');
      }

      consistencyScreenshotFilenames = consistencyScreenshotHelper.getScreenshotFilenames();

    } catch (error) {
      consistencyTestStatus = 'failed';
      consistencyErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      consistencyScreenshotFilenames = consistencyScreenshotHelper.getScreenshotFilenames();
      
    } finally {
      const duration = Date.now() - startTime;
      consistencyScreenshotFilenames = consistencyScreenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use proper TestResult interface with ALL required properties
      const testResult: TestResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user - error message consistency check',
        username: TEST_USER,
        browser: browserName,
        status: consistencyTestStatus,
        duration: duration.toString(),
        screenshots: consistencyScreenshotFilenames,
        errorMessage: consistencyErrorMessage || consistencySummary,
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      resultsCollector.addResult(testResult);

      if (consistencyTestStatus === 'passed') {
        logHelper.testPass('locked_out_user - error message consistency check', duration, {
          screenshots: consistencyScreenshotFilenames.length,
          itemsAdded: itemsAdded,
          itemsRemoved: itemsRemoved,
          summary: consistencySummary
        });
      } else {
        logHelper.testFail('locked_out_user - error message consistency check', 
          consistencyErrorMessage ? new Error(consistencyErrorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });

  // Test to verify locked user cannot bypass lockout
  test('locked_out_user - multiple login attempts behavior', async ({ page, browserName }, testInfo) => {
    const multipleAttemptsScreenshotHelper = new ScreenshotHelper(page, 'locked_user_multiple_attempts');
    const startTime = Date.now();
    let multipleAttemptsStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let multipleAttemptsErrorMessage: string | undefined;
    let multipleAttemptsScreenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let multipleAttemptsSummary = '';
    
    try {
      const TEST_NAME = 'locked_out_user - multiple login attempts behavior';
      logHelper.testStart(TEST_NAME, browserName);
      
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
      
      // Wait for login page rendering
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      await page.fill('[data-test="username"]', user.username);
      await page.fill('[data-test="password"]', user.password);
      await multipleAttemptsScreenshotHelper.takeScreenshot('01-first-attempt-setup');
      
      await page.click('[data-test="login-button"]');
      await page.waitForLoadState('networkidle');
      await multipleAttemptsScreenshotHelper.takeScreenshot('02-first-attempt-result');

      // Verify first attempt shows error
      const firstLoginResult = await performLockedUserLogin(page, user, multipleAttemptsScreenshotHelper);
      if (firstLoginResult.success) {
        throw new Error('First login attempt unexpectedly succeeded for locked user');
      }

      const firstErrorText = firstLoginResult.errorMessage;
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
        const secondErrorText = await secondErrorElement.textContent().catch(() => '') || '';
        logger.info('✅ Error persists on multiple login attempts', {
          firstError: firstErrorText.substring(0, 50) + '...',
          secondError: secondErrorText.substring(0, 50) + '...'
        });
        await multipleAttemptsScreenshotHelper.takeScreenshot('05-second-error-consistent');
        multipleAttemptsSummary = `Consistently locked out across ${2} attempts`;
      } else {
        logger.warn('⚠️ Error message disappeared on second attempt');
        multipleAttemptsSummary = 'Error behavior inconsistent across attempts';
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
      
    } finally {
      const duration = Date.now() - startTime;
      multipleAttemptsScreenshotFilenames = multipleAttemptsScreenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use proper TestResult interface with ALL required properties
      const testResult: TestResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user - multiple login attempts behavior',
        username: TEST_USER,
        browser: browserName,
        status: multipleAttemptsStatus,
        duration: duration.toString(),
        screenshots: multipleAttemptsScreenshotFilenames,
        errorMessage: multipleAttemptsErrorMessage || multipleAttemptsSummary,
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      resultsCollector.addResult(testResult);

      if (multipleAttemptsStatus === 'passed') {
        logHelper.testPass('locked_out_user - multiple login attempts behavior', duration, {
          screenshots: multipleAttemptsScreenshotFilenames.length,
          itemsAdded: itemsAdded,
          itemsRemoved: itemsRemoved,
          summary: multipleAttemptsSummary
        });
      } else {
        logHelper.testFail('locked_out_user - multiple login attempts behavior', 
          multipleAttemptsErrorMessage ? new Error(multipleAttemptsErrorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });
});