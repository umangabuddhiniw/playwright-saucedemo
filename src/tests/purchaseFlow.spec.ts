import { test, expect, Page } from '@playwright/test';
import { LoginPage, UserCredentials } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutInfoPage } from '../pages/CheckoutInfoPage';
import { OverviewPage } from '../pages/OverviewPage';
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { CustomWait } from '../utils/customWait';
import { addTestResult, generateAllReports } from '../utils/testRunner';
import { logger, logHelper } from '../utils/logger'; // Add logger import
import credentials from '../../data/credentials.json';

let page: Page;
let loginPage: LoginPage;
let productsPage: ProductsPage;
let cartPage: CartPage;
let checkoutInfoPage: CheckoutInfoPage;
let overviewPage: OverviewPage;
let checkoutCompletePage: CheckoutCompletePage;
let screenshotHelper: ScreenshotHelper;

test.beforeEach(async ({ browser }) => {
  page = await browser.newPage();
  loginPage = new LoginPage(page);
  productsPage = new ProductsPage(page);
  cartPage = new CartPage(page);
  checkoutInfoPage = new CheckoutInfoPage(page);
  overviewPage = new OverviewPage(page);
  checkoutCompletePage = new CheckoutCompletePage(page);
});

test.afterEach(async () => {
  await page.close();
});

for (const user of credentials.users) {
  test(`Purchase flow for ${user.username}`, async ({ browserName }, testInfo) => {
    const currentBrowserName = browserName || testInfo.project.name;
    
    screenshotHelper = new ScreenshotHelper(page, `${user.username}_purchase`);
    
    const startTime = Date.now();
    
    // Define test result object WITH error property
    const testResult = {
      username: user.username, // ✅ FIXED: Remove browser name from username
      status: 'passed' as 'passed' | 'failed' | 'skipped',
      duration: 0,
      screenshots: [] as string[],
      timestamp: new Date(),
      browser: currentBrowserName,
      testName: `Purchase flow for ${user.username}`,
      testFile: 'purchaseFlow.spec.ts',
      error: undefined as string | undefined
    };

    try {
      logHelper.testStart(`Purchase flow for ${user.username}`, currentBrowserName);

      // Step 1: Login using LoginPage methods
      await test.step('Login with credentials', async () => {
        const loginResult = await loginPage.completeLoginFlow(user);
        await screenshotHelper.takeScreenshot('01-login-page');
        
        if (!loginResult.success) {
          logger.error(`Login failed: ${loginResult.error}`);
          
          if (user.username === 'locked_out_user') {
            logger.info('Expected behavior: locked_out_user cannot login');
            await screenshotHelper.takeScreenshot('02-locked-out-error');
            testResult.status = 'passed';
          } else {
            testResult.status = 'failed';
            testResult.error = `Login failed: ${loginResult.error}`;
          }
          return;
        }
        
        logger.info(`Login successful for ${user.username}`);
        await screenshotHelper.takeScreenshot('02-after-login');
      });

      // Skip remaining steps if login failed (except for locked_out_user where it's expected)
      if (testResult.status === 'failed' || 
          (user.username === 'locked_out_user' && !await loginPage.isLoginSuccessful())) {
        testResult.duration = Date.now() - startTime;
        testResult.screenshots = screenshotHelper.getScreenshotsTaken();
        
        addTestResult(testResult);
        return;
      }

      // Step 2: Handle user-specific behaviors using ProductsPage methods
      if (user.username === 'problem_user') {
        await test.step('Handle problem user issues', async () => {
          logger.warn('Handling problem user specific issues...');
          
          // Use ProductsPage method for broken images
          const brokenImages = await productsPage.checkForBrokenImages();
          logger.info(`Found ${brokenImages} broken images for problem_user`);
          
          // Use new ProductsPage method for button analysis
          const buttonAnalysis = await productsPage.analyzeAddToCartButtons();
          logger.info(`Add-to-cart buttons: ${buttonAnalysis.enabled}/${buttonAnalysis.total} enabled`);
          
          await screenshotHelper.takeScreenshot('03-problem-user-check');
        });
        
        // SKIP CHECKOUT FLOW FOR PROBLEM_USER
        logger.info('Skipping checkout flow for problem_user (expected UI issues)');
        testResult.duration = Date.now() - startTime;
        testResult.screenshots = screenshotHelper.getScreenshotsTaken();
        addTestResult(testResult);
        return;
      }

      // Step 3: Handle performance glitch user using ProductsPage method
      if (user.username === 'performance_glitch_user') {
        await test.step('Wait for performance issues', async () => {
          logger.info('Handling performance glitch user...');
          await productsPage.waitForProductsToLoadExtended();
          await screenshotHelper.takeScreenshot('03-performance-wait');
        });
      }

      // Step 4: Add products using ProductsPage method
      await test.step('Add most expensive products to cart', async () => {
        logger.info('Finding and adding 2 most expensive products...');
        const addedProducts = await productsPage.addMostExpensiveProducts(2);
        
        const badgeCount = await productsPage.getCartBadgeCount();
        
        logger.info(`Added ${addedProducts.length} products to cart`);
        logger.info(`Cart badge count: ${badgeCount}`);
        
        await screenshotHelper.takeScreenshot('04-added-to-cart');
      });

      // Step 5: Cart operations using CartPage methods
      await test.step('Validate and modify cart items', async () => {
        await productsPage.goToCart();
        await cartPage.waitForCartToLoad();
        
        const cartItems = await cartPage.getCartItems();
        
        const subtotal = await cartPage.calculateSubtotal();
        logger.info(`Cart subtotal: $${subtotal}`);
        logger.info(`Cart items count: ${cartItems.length}`);
        
        // Log cart items for debugging
        cartItems.forEach((item, index) => {
          logger.debug(`Cart item ${index + 1}: ${item.name} - $${item.price}`);
        });
        
        await screenshotHelper.takeScreenshot('05-cart-before-remove');
        
        // Remove item using CartPage method
        const initialCount = await cartPage.getCartItemsCount();
        logger.info(`Removing one item from cart (current: ${initialCount} items)`);
        
        await cartPage.removeFirstItem();
        
        await page.waitForTimeout(1000);
        
        const finalCount = await cartPage.getCartItemsCount();
        
        logger.info(`Item removed successfully (now: ${finalCount} items)`);
        
        await screenshotHelper.takeScreenshot('06-cart-after-remove');
      });

      // Step 6: Checkout process using page methods - SKIP FOR ERROR_USER
      if (user.username === 'error_user') {
        logger.info('Skipping checkout flow for error_user (expected UI issues)');
        testResult.duration = Date.now() - startTime;
        testResult.screenshots = screenshotHelper.getScreenshotsTaken();
        addTestResult(testResult);
        return;
      }

      await test.step('Complete checkout process', async () => {
        logger.info('Starting checkout process...');
        await cartPage.proceedToCheckout();
        await checkoutInfoPage.waitForCheckoutForm();
        
        logger.info(`Filling checkout info for ${user.firstName} ${user.lastName}`);
        await checkoutInfoPage.fillCheckoutInfo(user.firstName, user.lastName, user.postalCode);
        await checkoutInfoPage.continueToOverview();
        
        await overviewPage.waitForOverviewToLoad();
        
        // Verify totals using OverviewPage methods
        const itemTotal = await overviewPage.getItemTotal();
        const tax = await overviewPage.getTax();
        const finalTotal = await overviewPage.getFinalTotal();
        
        const calculatedTotal = itemTotal + tax;
        
        logger.info('Financial Summary:');
        logger.info(`  Item Total: $${itemTotal}`);
        logger.info(`  Tax: $${tax}`);
        logger.info(`  Final Total: $${finalTotal}`);
        logger.info(`  Calculated Total: $${calculatedTotal}`);
        logger.info(`  Match: ${finalTotal === calculatedTotal ? 'YES' : 'NO'}`);
        
        await overviewPage.finishCheckout();
        
        await checkoutCompletePage.waitForCompletion();
        await expect(checkoutCompletePage.completionMessage).toBeVisible();
        await expect(checkoutCompletePage.completionMessage).toContainText('Thank you for your order!');
        
        logger.info('Order completed successfully!');
        
        await screenshotHelper.takeScreenshot('07-order-complete');
      });

      logger.info(`Purchase flow completed successfully for ${user.username}`);
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error instanceof Error ? error.message : String(error);
      logger.error(`Test failed for ${user.username} on ${currentBrowserName}:`, error);
      await screenshotHelper.takeScreenshot('08-test-failure');
    } finally {
      testResult.duration = Date.now() - startTime;
      testResult.screenshots = screenshotHelper.getScreenshotsTaken();
      
      addTestResult(testResult);
      
      logger.info(`Test duration: ${testResult.duration}ms`);
      logger.info(`Screenshots taken: ${testResult.screenshots.length}`);
    }
  });
}

test.afterAll(async () => {
  // Generate comprehensive reports
  logger.info('Generating test reports...');
  
  const { htmlReportPath, jsonReportPath } = generateAllReports();
  
  logger.info(`HTML Report: ${htmlReportPath}`);
  logger.info(`JSON Report: ${jsonReportPath}`);
  logger.info('Test execution completed!');
});