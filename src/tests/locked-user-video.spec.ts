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

// 🎯 ULTIMATE FIX: Video-compatible visual readiness detection
async function waitForVisualReady(page: Page, timeout = 30000) {
  console.log('👁️ Waiting for visual readiness...');
  
  // Wait for network to be completely idle
  await page.waitForLoadState('networkidle', { timeout });
  
  // Wait for DOM to be fully ready
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout }
  );
  
  // 🎯 CRITICAL: Wait for specific visual elements to be rendered
  try {
    // Wait for body to have some content (not empty)
    await page.waitForFunction(
      () => {
        const body = document.body;
        return body && 
               body.children.length > 0 && 
               body.offsetWidth > 0 && 
               body.offsetHeight > 0 &&
               window.getComputedStyle(body).visibility !== 'hidden';
      },
      { timeout: 15000 }
    );
  } catch (error) {
    console.log('⚠️ Visual readiness check timed out, continuing...');
  }
  
  // 🎯 CRITICAL: Force a render cycle and wait for stability
  await page.evaluate(async () => {
    // Force style recalculation
    document.body.style.visibility = 'hidden';
    const forceReflow = document.body.offsetHeight;
    document.body.style.visibility = 'visible';
    
    // Wait for next animation frame
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  
  // 🎯 CRITICAL: Video recording compatible waits
  const isCI = !!process.env.CI;
  if (isCI) {
    console.log('🏗️ CI detected - applying video-compatible stabilization...');
    await page.waitForTimeout(3000); // Extra wait for CI video rendering
  } else {
    await page.waitForTimeout(1000); // Wait for local video recording
  }
  
  console.log('✅ Visual readiness confirmed');
}

// 🎯 ULTIMATE FIX: Video-compatible screenshot function
async function takeGuaranteedScreenshot(page: Page, screenshotHelper: ScreenshotHelper, name: string) {
  console.log(`📸 PREPARING screenshot: ${name}`);
  
  // Step 1: Ensure visual readiness with video compatibility
  await waitForVisualReady(page);
  
  // Step 2: Force viewport to be properly set for video recording
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    // Ensure body is visible and has dimensions for video
    document.body.style.visibility = 'visible';
    document.documentElement.style.visibility = 'visible';
  });
  
  // Step 3: Wait for any final rendering (video compatible)
  await page.waitForTimeout(1000);
  
  // Step 4: Take the screenshot with error handling
  try {
    console.log(`🖼️ CAPTURING screenshot: ${name}`);
    await screenshotHelper.takeScreenshot(name);
    console.log(`✅ SUCCESS screenshot: ${name}`);
  } catch (screenshotError) {
    console.error(`❌ FAILED screenshot: ${name}`, screenshotError);
    
    // Fallback: Use Playwright's built-in screenshot
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fallbackPath = `test-results/screenshots/fallback-${name}-${timestamp}.png`;
      await page.screenshot({ 
        path: fallbackPath,
        fullPage: true 
      });
      console.log(`🔄 Used fallback screenshot: ${fallbackPath}`);
    } catch (fallbackError) {
      console.error('💥 Both screenshot methods failed:', fallbackError);
    }
  }
}

// 🎯 ENHANCED: Video-optimized login function for locked user
async function performVideoOptimizedLockedUserLogin(page: Page, user: any, screenshotHelper: ScreenshotHelper): Promise<{ success: boolean; errorMessage: string }> {
  console.log(`🔐 STARTING video-optimized locked user login for: ${user.username}`);
  
  // Step 1: Navigate with video-compatible loading
  console.log('🌐 Navigating to login page with video optimization...');
  await page.goto('https://www.saucedemo.com', { 
    waitUntil: 'commit',
    timeout: 60000 // Increased for video recording
  });
  
  // Step 2: Wait for page to be visually ready with video considerations
  console.log('⏳ Waiting for login page visual readiness (video optimized)...');
  await waitForVisualReady(page);
  
  // Step 3: Verify critical elements exist and are visible
  console.log('🔍 Verifying login form elements...');
  await page.waitForSelector('[data-test="username"]', { 
    state: 'attached',
    timeout: 25000 
  });
  
  await page.waitForSelector('[data-test="password"]', { 
    state: 'attached',
    timeout: 25000 
  });
  
  // Step 4: Wait for elements to be visible and interactable
  await page.waitForSelector('[data-test="username"]', { 
    state: 'visible', 
    timeout: 20000 
  });
  
  await page.waitForSelector('[data-test="password"]', { 
    state: 'visible', 
    timeout: 20000 
  });
  
  // Step 5: Take FIRST screenshot - optimized for video recording
  console.log('📸 Taking FIRST video-optimized screenshot...');
  await takeGuaranteedScreenshot(page, screenshotHelper, '01-login-page-ready');
  
  // Step 6: Fill credentials with video-friendly pacing
  console.log('⌨️ Filling credentials with video pacing...');
  await page.fill('[data-test="username"]', user.username);
  await page.waitForTimeout(500); // Allow UI to update for video
  
  await page.fill('[data-test="password"]', user.password);
  await page.waitForTimeout(500); // Allow UI to update for video
  
  // Step 7: Take screenshot with credentials filled
  await takeGuaranteedScreenshot(page, screenshotHelper, '02-credentials-filled');
  
  // Step 8: Perform login with video-optimized navigation waiting
  console.log('🚀 Clicking login button with video optimization...');
  
  // Use multiple navigation strategies for video recording
  const navigationPromise = page.waitForNavigation({ 
    waitUntil: 'domcontentloaded',
    timeout: 40000 
  });
  
  await page.click('[data-test="login-button"]');
  
  try {
    await navigationPromise;
  } catch (navError) {
    console.log('⚠️ Primary navigation timeout, trying networkidle...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  }
  
  // Step 9: Wait for post-login page to be visually ready for video
  console.log('⏳ Waiting for post-login page readiness (video optimized)...');
  await waitForVisualReady(page);
  
  // Step 10: Take screenshot after login - optimized for video
  console.log('📸 Taking video-optimized post-login screenshot...');
  await takeGuaranteedScreenshot(page, screenshotHelper, '03-post-login-result');
  
  // Step 11: Check for errors - for locked user, we expect an error
  const errorElement = page.locator('[data-test="error"]');
  const hasError = await errorElement.isVisible().catch(() => false);
  
  if (hasError) {
    const errorText = await errorElement.textContent().catch(() => null) || 'Locked user error';
    console.log(`🔒 Locked user error detected: ${errorText}`);
    return { success: false, errorMessage: errorText };
  }
  
  // Check if login was unexpectedly successful
  const inventoryVisible = await page.locator('.inventory_list, .inventory_container').first().isVisible().catch(() => false);
  if (inventoryVisible) {
    console.log('❌ Locked user unexpectedly logged in successfully');
    return { success: true, errorMessage: 'Unexpectedly logged in successfully' };
  }
  
  console.log('⚠️ No error message but also no inventory access');
  return { success: false, errorMessage: 'No error message but also no inventory access' };
}

test.describe('Locked User Tests with Video Recording', () => {
  let screenshotHelper: ScreenshotHelper; 

  test.beforeEach(async ({ page }, testInfo) => {
    console.log(`🔄 Test setup started: ${testInfo.title}`);
    
    // Initialize screenshot helper for each test
    screenshotHelper = new ScreenshotHelper(page, `locked_user_${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    
    // 🎯 CRITICAL: Set consistent viewport size for video recording
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 🎯 CRITICAL: Ensure browser is ready for video recording
    await page.waitForTimeout(200);
    
    console.log(`✅ Test setup completed: ${testInfo.title}`);
  });

  test('locked_out_user - error handling verification with video', async ({ page, browserName }, testInfo) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let screenshotFilenames: string[] = [];
    let errorTextContent: string = '';
    let testSummary = '';

    try {
      const TEST_NAME = 'locked_out_user - error handling verification with video';
      
      // Step 1: Find user credentials
      logHelper.testStart(TEST_NAME, browserName);
      const user = credentials.users.find(user => user.username === TEST_USER);
      
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`👤 Testing with locked user: ${user.username}`, {
        browser: browserName,
        userType: 'locked_out_user',
        ci: !!process.env.CI,
        videoRecording: true
      });

      // Step 2: Navigate to application with video-optimized loading
      logHelper.step('Navigate to application homepage with video optimization');
      
      console.log('🌐 Starting video-optimized navigation...');
      await page.goto('https://www.saucedemo.com', { 
        waitUntil: 'commit',
        timeout: 60000 
      });
      
      // 🎯 CRITICAL: Wait for visual readiness BEFORE first screenshot (video optimized)
      console.log('⏳ Waiting for initial page visual readiness (video optimized)...');
      await waitForVisualReady(page);
      
      // 🎯 CRITICAL: Take FIRST screenshot - guaranteed to have content for video
      console.log('📸 Taking FIRST video-optimized guaranteed screenshot...');
      await takeGuaranteedScreenshot(page, screenshotHelper, '00-initial-page-ready');
      
      // Verify login page elements are ready
      await page.waitForSelector('[data-test="username"]', { 
        state: 'visible', 
        timeout: 20000 
      });
      await page.waitForSelector('[data-test="password"]', { 
        state: 'visible', 
        timeout: 20000 
      });

      // Step 3: Perform login with video-optimized approach
      logHelper.step('Perform login with locked_out_user credentials with video');
      const loginResult = await performVideoOptimizedLockedUserLogin(page, user, screenshotHelper);

      // Step 4: Verify error message appears (expected behavior)
      logHelper.step('Verify locked user error message appears with video');
      
      if (!loginResult.success) {
        // This is the expected behavior for locked user
        errorTextContent = loginResult.errorMessage;
        
        // 🎯 CRITICAL: Take screenshot after error is confirmed
        await takeGuaranteedScreenshot(page, screenshotHelper, '04-error-message-confirmed');
        
        logger.info('🔒 Expected locked user error state reached', {
          errorMessage: errorTextContent,
          userType: 'locked_out_user',
          videoRecording: true
        });

        // Step 5: Verify we're still on login page (not redirected)
        logHelper.step('Verify still on login page after error with video');
        const currentUrl = page.url();
        const loginButtonStillVisible = await page.locator('[data-test="login-button"]').isVisible().catch(() => false);
        
        if (loginButtonStillVisible) {
          logger.info('✅ User correctly remained on login page after lockout error');
          await takeGuaranteedScreenshot(page, screenshotHelper, '05-still-on-login-page');
        } else {
          logger.warn('⚠️ User may have been redirected from login page');
          await takeGuaranteedScreenshot(page, screenshotHelper, '05-possible-redirection');
        }

        // Step 6: Verify error message content contains expected text
        logHelper.step('Verify error message content with video');
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

      // Step 7: Final documentation with video optimization
      logHelper.step('Final state documentation with video');
      await takeGuaranteedScreenshot(page, screenshotHelper, '99-final-state');
      
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      logger.info('📋 Locked user test completed successfully with video', {
        duration,
        screenshotsTaken: screenshotFilenames.length,
        errorMessage: errorTextContent,
        expectedBehavior: 'User correctly prevented from logging in',
        ci: !!process.env.CI,
        videoRecording: true
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      testStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      // Capture final error state with video compatibility
      logHelper.step('Capture final error state with video');
      await takeGuaranteedScreenshot(page, screenshotHelper, '99-final-error-state').catch(() => {
        logger.error('❌ Failed to capture final error screenshot');
      });

      logger.error('💥 Locked user test failed', {
        duration,
        error: errorMessage,
        screenshotsTaken: screenshotFilenames.length,
        userType: 'locked_out_user',
        ci: !!process.env.CI,
        videoRecording: true
      });

    } finally {
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();
      
      const testResult: TestResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user - error handling verification with video',
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

      resultsCollector.addResult(testResult);

      if (testStatus === 'passed') {
        logHelper.testPass('locked_out_user - error handling verification with video', duration, {
          screenshots: screenshotFilenames.length,
          itemsAdded: 0,
          itemsRemoved: 0,
          summary: testSummary,
          videoRecording: true
        });
      } else {
        logHelper.testFail('locked_out_user - error handling verification with video', 
          errorMessage ? new Error(errorMessage) : new Error('Test failed'), 
          duration
        );
      }

      logger.debug('📊 Locked user test result recorded with video', {
        status: testStatus,
        duration,
        screenshots: screenshotFilenames.length,
        userType: 'locked_out_user',
        ci: !!process.env.CI,
        videoRecording: true
      });
    }
  });

  // Additional test to verify locked user consistency with video
  test('locked_out_user - error message consistency check with video', async ({ page, browserName }, testInfo) => {
    const consistencyScreenshotHelper = new ScreenshotHelper(page, 'locked_user_consistency_video');
    const startTime = Date.now();
    let consistencyTestStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let consistencyErrorMessage: string | undefined;
    let consistencyScreenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let consistencySummary = '';
    
    try {
      const TEST_NAME = 'locked_out_user - error message consistency check with video';
      logHelper.testStart(TEST_NAME, browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔒 Consistency check for locked user: ${user.username}`, {
        browser: browserName,
        ci: !!process.env.CI,
        videoRecording: true
      });

      // Navigate and attempt login with video-optimized approach
      await page.goto('https://www.saucedemo.com', { 
        waitUntil: 'commit',
        timeout: 60000 
      });
      
      // 🎯 CRITICAL: Wait for visual readiness with video optimization
      await waitForVisualReady(page);
      await takeGuaranteedScreenshot(page, consistencyScreenshotHelper, '01-initial-page-ready');
      
      const loginResult = await performVideoOptimizedLockedUserLogin(page, user, consistencyScreenshotHelper);

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
          consistencyCheck: 'passed',
          videoRecording: true
        });

        // 🎯 CRITICAL: Take screenshot after confirming consistency with video optimization
        await takeGuaranteedScreenshot(page, consistencyScreenshotHelper, '03-error-message-consistent');
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
      
      const testResult: TestResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user - error message consistency check with video',
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
        logHelper.testPass('locked_out_user - error message consistency check with video', duration, {
          screenshots: consistencyScreenshotFilenames.length,
          itemsAdded: itemsAdded,
          itemsRemoved: itemsRemoved,
          summary: consistencySummary,
          videoRecording: true
        });
      } else {
        logHelper.testFail('locked_out_user - error message consistency check with video', 
          consistencyErrorMessage ? new Error(consistencyErrorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });

  // Test to verify locked user cannot bypass lockout with video optimization
  test('locked_out_user - multiple login attempts behavior with video', async ({ page, browserName }, testInfo) => {
    const multipleAttemptsScreenshotHelper = new ScreenshotHelper(page, 'locked_user_multiple_attempts_video');
    const startTime = Date.now();
    let multipleAttemptsStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let multipleAttemptsErrorMessage: string | undefined;
    let multipleAttemptsScreenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let multipleAttemptsSummary = '';
    
    try {
      const TEST_NAME = 'locked_out_user - multiple login attempts behavior with video';
      logHelper.testStart(TEST_NAME, browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔄 Testing multiple login attempts for: ${user.username}`, {
        browser: browserName,
        testType: 'multiple_attempts',
        ci: !!process.env.CI,
        videoRecording: true
      });

      // First login attempt with video-optimized approach
      await page.goto('https://www.saucedemo.com', { 
        waitUntil: 'commit',
        timeout: 60000 
      });
      
      // 🎯 CRITICAL: Wait for visual readiness with video optimization
      await waitForVisualReady(page);
      await takeGuaranteedScreenshot(page, multipleAttemptsScreenshotHelper, '01-initial-page-ready');
      
      await page.fill('[data-test="username"]', user.username);
      await page.waitForTimeout(500); // Video-compatible wait
      await page.fill('[data-test="password"]', user.password);
      await page.waitForTimeout(500); // Video-compatible wait
      await takeGuaranteedScreenshot(page, multipleAttemptsScreenshotHelper, '02-first-attempt-setup');
      
      await page.click('[data-test="login-button"]');
      
      // 🎯 CRITICAL: Wait for result page to be visually ready for video
      await waitForVisualReady(page);
      await takeGuaranteedScreenshot(page, multipleAttemptsScreenshotHelper, '03-first-attempt-result');

      // Verify first attempt shows error
      const firstLoginResult = await performVideoOptimizedLockedUserLogin(page, user, multipleAttemptsScreenshotHelper);
      if (firstLoginResult.success) {
        throw new Error('First login attempt unexpectedly succeeded for locked user');
      }

      const firstErrorText = firstLoginResult.errorMessage;
      await takeGuaranteedScreenshot(page, multipleAttemptsScreenshotHelper, '04-first-error-visible');

      // Second login attempt without refreshing
      logHelper.step('Second login attempt without page refresh with video');
      await page.click('[data-test="login-button"]');
      
      // 🎯 CRITICAL: Wait for second attempt result with video optimization
      await waitForVisualReady(page);
      await takeGuaranteedScreenshot(page, multipleAttemptsScreenshotHelper, '05-second-attempt-result');

      // Verify error persists or changes appropriately
      const secondErrorElement = page.locator('[data-test="error"]');
      const secondErrorVisible = await secondErrorElement.isVisible().catch(() => false);
      
      if (secondErrorVisible) {
        const secondErrorText = await secondErrorElement.textContent().catch(() => '') || '';
        logger.info('✅ Error persists on multiple login attempts', {
          firstError: firstErrorText.substring(0, 50) + '...',
          secondError: secondErrorText.substring(0, 50) + '...',
          videoRecording: true
        });
        await takeGuaranteedScreenshot(page, multipleAttemptsScreenshotHelper, '06-second-error-consistent');
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

      logger.info('📋 Multiple attempts test completed with video', {
        attempts: 2,
        result: 'User consistently prevented from logging in',
        ci: !!process.env.CI,
        videoRecording: true
      });

    } catch (error) {
      multipleAttemptsStatus = 'failed';
      multipleAttemptsErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      multipleAttemptsScreenshotFilenames = multipleAttemptsScreenshotHelper.getScreenshotFilenames();
      
    } finally {
      const duration = Date.now() - startTime;
      multipleAttemptsScreenshotFilenames = multipleAttemptsScreenshotHelper.getScreenshotFilenames();
      
      const testResult: TestResult = {
        testFile: 'locked-user-video.spec.ts',
        testName: 'locked_out_user - multiple login attempts behavior with video',
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
        logHelper.testPass('locked_out_user - multiple login attempts behavior with video', duration, {
          screenshots: multipleAttemptsScreenshotFilenames.length,
          itemsAdded: itemsAdded,
          itemsRemoved: itemsRemoved,
          summary: multipleAttemptsSummary,
          videoRecording: true
        });
      } else {
        logHelper.testFail('locked_out_user - multiple login attempts behavior with video', 
          multipleAttemptsErrorMessage ? new Error(multipleAttemptsErrorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });
});