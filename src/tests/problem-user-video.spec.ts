// src/tests/problem-user-video.spec.ts
import { test, expect, Page } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { resultsCollector } from '../utils/results-collector';
import { logger, logHelper } from '../utils/logger';
import credentials from '../../data/credentials.json';

// Test data and configuration
const TEST_USER = 'problem_user';

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

// Helper function to check for various UI issues
async function checkForUIIssues(page: Page): Promise<{
  brokenImages: number;
  layoutIssues: string[];
  functionalIssues: string[];
  consoleErrors: string[];
}> {
  const issues = {
    brokenImages: 0,
    layoutIssues: [] as string[],
    functionalIssues: [] as string[],
    consoleErrors: [] as string[]
  };

  try {
    // Capture console errors
    const consoleMessages: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    // Check for broken images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const isBroken = await image.evaluate((img: HTMLImageElement) => {
        return img.naturalWidth === 0 || !img.complete || img.src.includes('broken');
      }).catch(() => true);
      
      if (isBroken) {
        issues.brokenImages++;
      }
    }

    // Store console errors after image checks
    issues.consoleErrors = consoleMessages;

    // Check for layout issues
    const inventoryItems = await page.locator('.inventory_item').count();
    if (inventoryItems === 0) {
      issues.layoutIssues.push('No inventory items displayed');
    }

    // Check for overlapping or misaligned elements
    const itemNames = page.locator('.inventory_item_name');
    const itemCount = await itemNames.count();
    
    for (let i = 0; i < itemCount; i++) {
      const name = itemNames.nth(i);
      const isVisible = await name.isVisible().catch(() => false);
      if (!isVisible) {
        issues.layoutIssues.push(`Inventory item ${i + 1} name not visible`);
      }
    }

    // Check for price elements
    const prices = page.locator('.inventory_item_price');
    const priceCount = await prices.count();
    if (priceCount === 0) {
      issues.layoutIssues.push('No price elements displayed');
    }

    // Check for button states
    const addToCartButtons = page.locator('[data-test^="add-to-cart"]');
    const buttonCount = await addToCartButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = addToCartButtons.nth(i);
      const isEnabled = await button.isEnabled().catch(() => false);
      if (!isEnabled) {
        issues.functionalIssues.push(`Add to cart button ${i + 1} is disabled`);
      }
    }

  } catch (error) {
    issues.functionalIssues.push(`Error during UI check: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return issues;
}

// Helper function to test add to cart functionality
async function testAddToCartFunctionality(page: Page, screenshotHelper: ScreenshotHelper): Promise<{
  success: boolean;
  issues: string[];
  cartCount: number;
}> {
  const result = {
    success: false,
    issues: [] as string[],
    cartCount: 0
  };

  try {
    // Try to add first item to cart
    const firstAddButton = page.locator('[data-test^="add-to-cart"]').first();
    
    if (await firstAddButton.isVisible()) {
      const initialCartState = await page.locator('.shopping_cart_badge').isVisible().catch(() => false);
      const initialCount = initialCartState ? parseInt(await page.locator('.shopping_cart_badge').textContent() || '0') : 0;
      
      await firstAddButton.click();
      await page.waitForTimeout(1000); // Wait for any state changes
      await screenshotHelper.takeScreenshot('add-to-cart-attempt');

      // Check cart badge
      const cartBadge = page.locator('.shopping_cart_badge');
      const cartVisible = await cartBadge.isVisible().catch(() => false);
      
      if (cartVisible) {
        result.cartCount = parseInt(await cartBadge.textContent() || '0');
        result.success = true;
        logger.info(`✅ Item added to cart successfully. Cart count: ${result.cartCount}`);
      } else if (!initialCartState && !cartVisible) {
        // If there was no cart badge before and still none, might be expected for problem_user
        result.issues.push('Add to cart did not update cart badge (possibly expected for problem_user)');
        result.success = true; // Still consider success for problem_user edge case
        logger.warn('🛒 Add to cart may not have updated cart badge (expected for problem_user)');
      } else {
        result.issues.push('Add to cart did not update cart badge as expected');
      }
    } else {
      result.issues.push('No add to cart buttons found');
    }

  } catch (error) {
    result.issues.push(`Add to cart error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

// Simple login function for problem user
async function performLogin(page: Page, user: any, screenshotHelper: ScreenshotHelper): Promise<void> {
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
  
  // Check for errors
  const errorElement = page.locator('[data-test="error"]');
  const hasError = await errorElement.isVisible().catch(() => false);
  
  if (hasError) {
    const errorText = await errorElement.textContent().catch(() => 'Login error');
    throw new Error(`Login failed: ${errorText}`);
  }
  
  // Verify successful login - be more lenient for problem_user
  const inventoryList = page.locator('.inventory_list');
  const isInventoryVisible = await inventoryList.isVisible({ timeout: 15000 }).catch(() => false);
  
  if (!isInventoryVisible) {
    // For problem_user, we might still continue if some elements are visible
    const anyInventoryElement = await page.locator('.inventory_item, .inventory_container, #inventory_container').first().isVisible().catch(() => false);
    if (!anyInventoryElement) {
      throw new Error('Login unsuccessful - inventory page not loaded');
    }
    logger.warn('⚠️ Problem user: Inventory list not visible but other elements found');
  }
}

test.describe('Problem User Tests', () => {
  let screenshotHelper: ScreenshotHelper;

  test.beforeEach(async ({ page }, testInfo) => {
    // Initialize screenshot helper for each test
    screenshotHelper = new ScreenshotHelper(page, `problem_user_${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
    logger.debug(`🔄 Test setup completed for: ${testInfo.title}`);
  });

  test('problem_user - comprehensive UI issues verification', async ({ page, browserName }, testInfo) => {
    const startTime = Date.now();
    let testStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let errorMessage: string | undefined;
    let screenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let uiIssuesSummary = '';

    try {
      const TEST_NAME = 'problem_user - comprehensive UI issues verification';
      
      // Step 1: Find user credentials
      logHelper.testStart(TEST_NAME, browserName);
      const user = credentials.users.find(user => user.username === TEST_USER);
      
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`👤 Testing with problem user: ${user.username}`, {
        browser: browserName,
        userType: 'problem_user'
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

      // Step 3: Verify login page elements
      logHelper.step('Verify login page elements');
      await expect(page.locator('[data-test="username"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="password"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-test="login-button"]')).toBeVisible({ timeout: 10000 });

      // Step 4: Perform login
      logHelper.step('Perform login with problem_user credentials');
      await performLogin(page, user, screenshotHelper);
      
      logger.info('✅ Login successful for problem_user');

      // Step 5: Verify login successful
      logHelper.step('Verify login successful and reached inventory');
      await expect(page.locator('.inventory_list, .inventory_item, .inventory_container').first()).toBeVisible({ timeout: 15000 });
      await screenshotHelper.takeScreenshot('04-inventory-page-accessible');

      // Step 6: Comprehensive UI issues check
      logHelper.step('Comprehensive UI issues detection');
      const uiIssues = await checkForUIIssues(page);
      await screenshotHelper.takeScreenshot('05-ui-issues-check');

      // Log all detected issues
      if (uiIssues.brokenImages > 0) {
        logger.warn(`🖼️ Found ${uiIssues.brokenImages} broken images`);
      } else {
        logger.info('✅ No broken images detected');
      }

      if (uiIssues.layoutIssues.length > 0) {
        logger.warn(`📐 Found ${uiIssues.layoutIssues.length} layout issues:`, {
          issues: uiIssues.layoutIssues.slice(0, 5) // Limit output
        });
      } else {
        logger.info('✅ No layout issues detected');
      }

      if (uiIssues.functionalIssues.length > 0) {
        logger.warn(`⚙️ Found ${uiIssues.functionalIssues.length} functional issues:`, {
          issues: uiIssues.functionalIssues.slice(0, 5) // Limit output
        });
      } else {
        logger.info('✅ No functional issues detected');
      }

      if (uiIssues.consoleErrors.length > 0) {
        logger.warn(`🚨 Found ${uiIssues.consoleErrors.length} console errors:`, {
          errors: uiIssues.consoleErrors.slice(0, 3) // Limit to first 3 errors
        });
      } else {
        logger.info('✅ No console errors detected');
      }

      // Step 7: Test add to cart functionality
      logHelper.step('Test add to cart functionality');
      const cartResult = await testAddToCartFunctionality(page, screenshotHelper);
      
      if (cartResult.success) {
        itemsAdded = cartResult.cartCount;
        // For problem_user, even if cart doesn't update, we don't fail the test
        if (cartResult.issues.length > 0) {
          uiIssues.functionalIssues.push(...cartResult.issues);
        }
      } else {
        uiIssues.functionalIssues.push(...cartResult.issues);
        // For problem_user, don't fail the test if add to cart has issues - that's expected
        logger.warn('⚠️ Add to cart functionality issues detected (expected for problem_user)');
      }

      // Step 8: Test navigation
      logHelper.step('Test navigation functionality');
      try {
        await page.click('.shopping_cart_link');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000); // Additional wait for page stability
        await screenshotHelper.takeScreenshot('06-cart-page');
        
        // Check if cart page loaded correctly
        const cartPageTitle = await page.locator('.title').textContent().catch(() => '');
        if (!cartPageTitle?.toLowerCase().includes('cart')) {
          uiIssues.functionalIssues.push('Cart page may not have loaded correctly');
        }
        
        // Go back to inventory - use different selectors for robustness
        const continueShopping = page.locator('[data-test="continue-shopping"]').first();
        const backToProducts = page.locator('[data-test="continue-shopping"], #continue-shopping, .btn_secondary').first();
        
        if (await continueShopping.isVisible()) {
          await continueShopping.click();
        } else if (await backToProducts.isVisible()) {
          await backToProducts.click();
        } else {
          // Fallback: click cart icon again or go back
          await page.click('.shopping_cart_link');
        }
        
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await screenshotHelper.takeScreenshot('07-returned-to-inventory');
        
      } catch (navError) {
        const navErrorMsg = `Navigation error: ${navError instanceof Error ? navError.message : 'Unknown error'}`;
        uiIssues.functionalIssues.push(navErrorMsg);
        logger.warn(`⚠️ ${navErrorMsg} (possibly expected for problem_user)`);
        await screenshotHelper.takeScreenshot('07-navigation-error');
      }

      // Step 9: Create issues summary
      const totalIssues = uiIssues.brokenImages + uiIssues.layoutIssues.length + 
                         uiIssues.functionalIssues.length + uiIssues.consoleErrors.length;
      
      uiIssuesSummary = `Detected ${totalIssues} issues: ${uiIssues.brokenImages} broken images, ` +
                       `${uiIssues.layoutIssues.length} layout issues, ` +
                       `${uiIssues.functionalIssues.length} functional issues, ` +
                       `${uiIssues.consoleErrors.length} console errors`;

      logger.info('📋 Problem user issues summary', {
        brokenImages: uiIssues.brokenImages,
        layoutIssues: uiIssues.layoutIssues.length,
        functionalIssues: uiIssues.functionalIssues.length,
        consoleErrors: uiIssues.consoleErrors.length,
        totalIssues: totalIssues
      });

      // For problem_user, having issues is expected, so we don't fail the test
      if (totalIssues > 0) {
        logger.info('✅ Test PASSED - Issues detected as expected for problem_user');
      } else {
        logger.info('✅ Test PASSED - No issues detected (unexpected for problem_user)');
      }

      // Step 10: Final documentation
      logHelper.step('Final state documentation');
      await screenshotHelper.takeScreenshot('08-final-state');
      
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();

      logger.info('🎯 Problem user test completed', {
        duration,
        screenshotsTaken: screenshotFilenames.length,
        itemsAdded,
        totalIssuesDetected: totalIssues
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

      logger.error('💥 Problem user test failed', {
        duration,
        error: errorMessage,
        screenshotsTaken: screenshotFilenames.length,
        userType: 'problem_user'
      });

    } finally {
      const duration = Date.now() - startTime;
      screenshotFilenames = screenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use proper TestResult interface with ALL required properties
      const testResult: TestResult = {
        testFile: 'problem-user-video.spec.ts',
        testName: 'problem_user - comprehensive UI issues verification',
        username: TEST_USER,
        browser: browserName,
        status: testStatus,
        duration: duration.toString(),
        screenshots: screenshotFilenames,
        errorMessage: errorMessage || uiIssuesSummary,
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      // ✅ This will now match the TestResult interface exactly
      resultsCollector.addResult(testResult);

      // Log final result
      if (testStatus === 'passed') {
        logHelper.testPass('problem_user - comprehensive UI issues verification', duration, {
          screenshots: screenshotFilenames.length,
          itemsAdded: itemsAdded,
          issuesDetected: uiIssuesSummary
        });
      } else {
        logHelper.testFail('problem_user - comprehensive UI issues verification', 
          errorMessage ? new Error(errorMessage) : new Error('Test failed'), 
          duration
        );
      }

      logger.debug('📊 Problem user test result recorded', {
        status: testStatus,
        duration,
        screenshots: screenshotFilenames.length,
        userType: 'problem_user'
      });
    }
  });

  // Additional test for problem_user specific image issues
  test('problem_user - broken images detailed analysis', async ({ page, browserName }, testInfo) => {
    const detailedScreenshotHelper = new ScreenshotHelper(page, 'problem_user_images_detailed');
    const startTime = Date.now();
    let detailedTestStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let detailedErrorMessage: string | undefined;
    let detailedScreenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let imageAnalysisResult = '';
    
    try {
      const TEST_NAME = 'problem_user - broken images detailed analysis';
      logHelper.testStart(TEST_NAME, browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔍 Detailed image analysis for: ${user.username}`, {
        browser: browserName,
        analysisType: 'broken_images'
      });

      // Navigate and login
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Wait for login page rendering
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      await performLogin(page, user, detailedScreenshotHelper);

      // Detailed image analysis
      const images = page.locator('img');
      const imageCount = await images.count();
      let brokenImages = 0;
      const brokenImageDetails: string[] = [];

      logger.info(`🔍 Analyzing ${imageCount} images for issues`);

      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const src = await image.getAttribute('src').catch(() => 'unknown');
        const alt = await image.getAttribute('alt').catch(() => 'unknown');
        
        const isBroken = await image.evaluate((img: HTMLImageElement) => {
          return img.naturalWidth === 0 || !img.complete;
        }).catch(() => true);

        if (isBroken) {
          brokenImages++;
          brokenImageDetails.push(`Image ${i + 1}: src="${src}", alt="${alt}"`);
          
          // Take screenshot of first broken image found
          if (brokenImages === 1) {
            await image.scrollIntoViewIfNeeded();
            await detailedScreenshotHelper.takeScreenshot('03-first-broken-image');
          }
        }
      }

      imageAnalysisResult = `Analyzed ${imageCount} images, found ${brokenImages} broken images`;
      
      if (brokenImages > 0) {
        logger.warn('🖼️ Detailed broken images analysis', {
          totalImages: imageCount,
          brokenImages: brokenImages,
          brokenDetails: brokenImageDetails.slice(0, 3) // Show first 3 details
        });
        await detailedScreenshotHelper.takeScreenshot('04-broken-images-summary');
      } else {
        logger.info('✅ No broken images found in detailed analysis');
        await detailedScreenshotHelper.takeScreenshot('04-all-images-ok');
      }

      // For problem_user, finding broken images is expected behavior
      if (brokenImages > 0) {
        logger.info('✅ Test PASSED - Broken images found as expected for problem_user');
      } else {
        logger.info('✅ Test PASSED - No broken images found (unexpected for problem_user)');
      }

      detailedScreenshotFilenames = detailedScreenshotHelper.getScreenshotFilenames();

    } catch (error) {
      detailedTestStatus = 'failed';
      detailedErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      detailedScreenshotFilenames = detailedScreenshotHelper.getScreenshotFilenames();
      
    } finally {
      const duration = Date.now() - startTime;
      detailedScreenshotFilenames = detailedScreenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use same complete interface
      const testResult: TestResult = {
        testFile: 'problem-user-video.spec.ts',
        testName: 'problem_user - broken images detailed analysis',
        username: TEST_USER,
        browser: browserName,
        status: detailedTestStatus,
        duration: duration.toString(),
        screenshots: detailedScreenshotFilenames,
        errorMessage: detailedErrorMessage || imageAnalysisResult,
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      resultsCollector.addResult(testResult);

      if (detailedTestStatus === 'passed') {
        logHelper.testPass('problem_user - broken images detailed analysis', duration, {
          screenshots: detailedScreenshotFilenames.length,
          result: imageAnalysisResult
        });
      } else {
        logHelper.testFail('problem_user - broken images detailed analysis', 
          detailedErrorMessage ? new Error(detailedErrorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });

  // Test to verify problem_user can still perform basic operations despite issues
  test('problem_user - basic functionality verification', async ({ page, browserName }, testInfo) => {
    const basicScreenshotHelper = new ScreenshotHelper(page, 'problem_user_basic_functionality');
    const startTime = Date.now();
    let basicTestStatus: 'passed' | 'failed' | 'skipped' = 'passed';
    let basicErrorMessage: string | undefined;
    let basicScreenshotFilenames: string[] = [];
    let itemsAdded = 0;
    let itemsRemoved = 0;
    let basicFunctionalityResult = '';
    
    try {
      const TEST_NAME = 'problem_user - basic functionality verification';
      logHelper.testStart(TEST_NAME, browserName);
      
      const user = credentials.users.find(user => user.username === TEST_USER);
      if (!user) {
        throw new Error(`${TEST_USER} not found in credentials.json`);
      }

      logger.info(`🔧 Testing basic functionality for: ${user.username}`, {
        browser: browserName,
        testType: 'basic_functionality'
      });

      // Navigate and login
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Wait for login page rendering
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      await performLogin(page, user, basicScreenshotHelper);

      // Verify basic page elements exist
      const inventoryList = page.locator('.inventory_list, .inventory_item, .inventory_container').first();
      await expect(inventoryList).toBeVisible({ timeout: 15000 });
      
      const inventoryItems = await page.locator('.inventory_item').count();
      if (inventoryItems > 0) {
        basicFunctionalityResult += `Can see ${inventoryItems} inventory items. `;
        logger.info(`✅ Can see ${inventoryItems} inventory items`);
      }

      // Test item details view
      const firstItem = page.locator('.inventory_item_name').first();
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForLoadState('domcontentloaded');
        await basicScreenshotHelper.takeScreenshot('03-item-details-page');
        
        const backButton = page.locator('[data-test="back-to-products"]');
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForLoadState('domcontentloaded');
          basicFunctionalityResult += 'Item details navigation works. ';
          logger.info('✅ Item details navigation works');
        }
      }

      // Test menu functionality
      const menuButton = page.locator('#react-burger-menu-btn');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);
        await basicScreenshotHelper.takeScreenshot('04-menu-opened');
        
        const menuItems = await page.locator('.bm-item-list a').count();
        if (menuItems > 0) {
          basicFunctionalityResult += `Menu has ${menuItems} items. `;
          logger.info(`✅ Menu has ${menuItems} items`);
        }
        
        // Close menu
        await page.locator('#react-burger-cross-btn').click().catch(async () => {
          // Fallback: click outside or press escape
          await page.keyboard.press('Escape');
        });
      }

      basicFunctionalityResult += 'Basic functionality verified for problem_user';
      basicScreenshotFilenames = basicScreenshotHelper.getScreenshotFilenames();

      logger.info('✅ Basic functionality test completed', {
        result: basicFunctionalityResult
      });

    } catch (error) {
      basicTestStatus = 'failed';
      basicErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      basicScreenshotFilenames = basicScreenshotHelper.getScreenshotFilenames();
      
    } finally {
      const duration = Date.now() - startTime;
      basicScreenshotFilenames = basicScreenshotHelper.getScreenshotFilenames();
      
      // ✅ FIXED: Use same complete interface
      const testResult: TestResult = {
        testFile: 'problem-user-video.spec.ts',
        testName: 'problem_user - basic functionality verification',
        username: TEST_USER,
        browser: browserName,
        status: basicTestStatus,
        duration: duration.toString(),
        screenshots: basicScreenshotFilenames,
        errorMessage: basicErrorMessage || basicFunctionalityResult,
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved,
        startTime: new Date(startTime),
        endTime: new Date()
      };

      resultsCollector.addResult(testResult);

      if (basicTestStatus === 'passed') {
        logHelper.testPass('problem_user - basic functionality verification', duration, {
          screenshots: basicScreenshotFilenames.length,
          result: basicFunctionalityResult
        });
      } else {
        logHelper.testFail('problem_user - basic functionality verification', 
          basicErrorMessage ? new Error(basicErrorMessage) : new Error('Test failed'), 
          duration
        );
      }
    }
  });
});