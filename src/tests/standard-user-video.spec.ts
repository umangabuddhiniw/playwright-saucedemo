import { test, expect } from '@playwright/test';
import { ScreenshotHelper } from '../utils/screenshotHelper';
import { addTestResult } from '../utils/testRunner';
import { logger, logHelper } from '../utils/logger';
import credentials from '../../data/credentials.json';

test('standard_user - complete flow video', async ({ page, browserName }, testInfo) => {
    const user = credentials.users.find(user => user.username === 'standard_user');
    
    const screenshotHelper = new ScreenshotHelper(page, 'standard_user_complete');
    
    const startTime = Date.now();
    
    if (!user) {
        logger.error('standard_user not found in credentials.json');
        throw new Error('standard_user not found in credentials.json');
    }

    logHelper.testStart('standard_user complete flow', browserName);
    logger.info(`User: ${user.username}`);
    
    try {
        // Step 1: Login
        logHelper.step('Login with standard_user credentials');
        await page.goto('/');
        await screenshotHelper.takeScreenshot('01-login-page');
        await page.fill('[data-test="username"]', user.username);
        await page.fill('[data-test="password"]', user.password);
        await page.click('[data-test="login-button"]');
        
        // Step 2: Verify login successful
        logHelper.step('Verify login successful');
        await expect(page.locator('.inventory_list')).toBeVisible();
        await screenshotHelper.takeScreenshot('02-inventory-page');
        logger.info('Login successful');
        
        // Step 3: Add some items to cart - NO COUNT EXPECTATION
        logHelper.step('Add items to cart');
        const addButtons = page.locator('button.btn_inventory');
        const availableButtons = await addButtons.count();
        
        // Add a couple of items if available
        const itemsToAdd = Math.min(2, availableButtons);
        logger.info(`Adding ${itemsToAdd} items to cart...`);
        
        for (let i = 0; i < itemsToAdd; i++) {
            await addButtons.nth(i).click();
            logger.info(`Added item ${i + 1}`);
        }
        
        await screenshotHelper.takeScreenshot('03-items-added');
        
        // Step 4: Go to cart
        logHelper.step('Navigate to cart');
        await page.click('.shopping_cart_link');
        await expect(page.locator('.cart_list')).toBeVisible();
        await screenshotHelper.takeScreenshot('04-cart-page');
        
        // Step 5: Remove one item if available
        logHelper.step('Remove item from cart');
        const removeButtons = page.locator('button.cart_button');
        const removeCount = await removeButtons.count();
        
        if (removeCount > 0) {
            await removeButtons.first().click();
            logger.info('Removed one item from cart');
        } else {
            logger.info('No items to remove from cart');
        }
        
        await screenshotHelper.takeScreenshot('05-after-remove');
        
        // Step 6: Checkout
        logHelper.step('Start checkout process');
        await page.click('[data-test="checkout"]');
        await expect(page.locator('[data-test="firstName"]')).toBeVisible();
        await screenshotHelper.takeScreenshot('06-checkout-form');
        
        // Step 7: Fill checkout info
        logHelper.step('Fill checkout information');
        await page.fill('[data-test="firstName"]', user.firstName);
        await page.fill('[data-test="lastName"]', user.lastName);
        await page.fill('[data-test="postalCode"]', user.postalCode);
        await page.click('[data-test="continue"]');
        
        // Step 8: Verify overview and complete
        logHelper.step('Verify checkout overview');
        await expect(page.locator('.summary_info')).toBeVisible();
        await screenshotHelper.takeScreenshot('07-checkout-overview');
        await page.click('[data-test="finish"]');
        
        // Step 9: Verify completion
        logHelper.step('Verify order completion');
        await expect(page.locator('.complete-header')).toBeVisible();
        await expect(page.locator('.complete-header')).toContainText('Thank you for your order!');
        await screenshotHelper.takeScreenshot('08-order-complete');
        
        const duration = Date.now() - startTime;
        
        // Small delay to ensure all screenshots are processed
        await page.waitForTimeout(500);
        
        const screenshots = screenshotHelper.getScreenshotsTaken();
        
        // Add successful result
        addTestResult({
            username: user.username,
            status: 'passed',
            duration: duration,
            screenshots: screenshots,
            timestamp: new Date(),
            testFile: 'standard-user-video.spec.ts',
            testName: 'standard_user - complete flow video',
            browser: browserName
        });
        
        logHelper.testPass('standard_user complete flow', duration);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        // Small delay to ensure screenshots are processed
        await page.waitForTimeout(500);
        const screenshots = screenshotHelper.getScreenshotsTaken();
        
        // Add failed result
        addTestResult({
            username: user.username,
            status: 'failed',
            duration: duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            screenshots: screenshots,
            timestamp: new Date(),
            testFile: 'standard-user-video.spec.ts',
            testName: 'standard_user - complete flow video',
            browser: browserName
        });
        
        logHelper.testFail('standard_user complete flow', error instanceof Error ? error.message : 'Unknown error', duration);
        throw error;
    }
});