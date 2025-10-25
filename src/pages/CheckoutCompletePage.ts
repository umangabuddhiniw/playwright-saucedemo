import { Page, Locator } from '@playwright/test';
import { logger, logHelper } from '../utils/logger';
import { CustomWait } from '../utils/customWait';

export class CheckoutCompletePage {
  readonly page: Page;
  private customWait: CustomWait;

  constructor(page: Page) {
    this.page = page;
    this.customWait = new CustomWait(page);
  }

  // Locators with proper typing
  get completionMessage(): Locator { 
    return this.page.locator('.complete-header'); 
  }
  
  get completionText(): Locator { 
    return this.page.locator('.complete-text'); 
  }
  
  get ponyExpressImage(): Locator { 
    return this.page.locator('.pony_express'); 
  }
  
  private get backHomeButton(): Locator { 
    return this.page.locator('[data-test="back-to-products"]'); 
  }

  /**
   * Wait for checkout completion page to load completely
   */
  async waitForCompletion(timeout: number = 15000): Promise<void> {
    try {
      logger.debug('🔄 Waiting for checkout completion page to load...');
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForElementInstance('.complete-header', timeout);
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForElementInstance('.pony_express', 10000)
        .catch(() => logger.warn('Pony express image not found, but continuing...'));
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForElementInstance('[data-test="back-to-products"]', 10000);
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForNetworkIdleInstance(5000);
      
      logger.info('✅ Checkout completion page loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load checkout completion page', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeout
      });
      throw error;
    }
  }

  /**
   * Go back to home page with comprehensive error handling
   */
  async goBackToHome(): Promise<boolean> {
    try {
      logger.info('🏠 Returning to home page...');
      
      // Wait for page to be fully loaded first
      await this.waitForCompletion();
      
      // Verify back home button is enabled
      const isEnabled = await this.isBackHomeButtonEnabled();
      if (!isEnabled) {
        throw new Error('Back home button is not enabled');
      }
      
      // Use retry mechanism for more reliable clicking
      await this.clickWithRetry(this.backHomeButton);
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForNetworkIdleInstance();
      
      // Verify we navigated away from checkout complete page
      const navigationSuccessful = await this.waitForCondition(
        async () => !this.page.url().includes('checkout-complete'),
        10000,
        500,
        'Navigation away from checkout complete page'
      ).then(() => true).catch(() => false);

      if (navigationSuccessful) {
        logger.info('✅ Successfully returned to home page');
        return true;
      } else {
        logger.warn('⚠️ May not have navigated completely away from checkout page');
        return false;
      }
      
    } catch (error) {
      logger.error('❌ Failed to return to home page', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Verify completion message with exact or partial text matching
   */
  async verifyCompletionMessage(expectedText: string = 'Thank you for your order!'): Promise<boolean> {
    try {
      logger.info(`🔍 Verifying completion message: "${expectedText}"`);
      
      // Wait for completion first
      await this.waitForCompletion();
      
      // Get actual message text
      const actualText = await this.getCompletionMessageText();
      
      // Check if expected text is contained in actual text
      const containsText = actualText.includes(expectedText);
      
      if (containsText) {
        logger.info(`✅ Completion message verified: "${expectedText}"`);
        return true;
      } else {
        logger.error(`❌ Completion message mismatch. Expected: "${expectedText}", Actual: "${actualText}"`);
        return false;
      }
      
    } catch (error) {
      logger.error('❌ Failed to verify completion message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        expectedText
      });
      return false;
    }
  }

  /**
   * Verify completion message with exact text matching
   */
  async verifyCompletionMessageExact(expectedText: string = 'Thank you for your order!'): Promise<boolean> {
    try {
      logger.info(`🔍 Verifying exact completion message: "${expectedText}"`);
      
      // Wait for completion first
      await this.waitForCompletion();
      
      // Use CustomWait instance for specific text verification
      await this.waitForCondition(
        async () => {
          const actualText = await this.getCompletionMessageText();
          return actualText === expectedText;
        },
        10000,
        500,
        `Completion message to be exactly: "${expectedText}"`
      );
      
      logger.info(`✅ Exact completion message verified: "${expectedText}"`);
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to verify exact completion message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        expectedText
      });
      return false;
    }
  }

  /**
   * Get completion message text with error handling
   */
  async getCompletionMessageText(): Promise<string> {
    try {
      await this.waitForCompletion();
      const text = await this.completionMessage.textContent();
      
      if (!text) {
        logger.warn('⚠️ Completion message text is empty or null');
        return '';
      }
      
      const trimmedText = text.trim();
      logger.debug(`📝 Completion message: "${trimmedText}"`);
      return trimmedText;
      
    } catch (error) {
      logger.error('❌ Failed to get completion message text', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return '';
    }
  }

  /**
   * Get completion description text
   */
  async getCompletionDescriptionText(): Promise<string> {
    try {
      await this.waitForCompletion();
      const text = await this.completionText.textContent();
      
      if (!text) {
        logger.warn('⚠️ Completion description text is empty or null');
        return '';
      }
      
      const trimmedText = text.trim();
      logger.debug(`📝 Completion description: "${trimmedText}"`);
      return trimmedText;
      
    } catch (error) {
      logger.error('❌ Failed to get completion description text', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return '';
    }
  }

  /**
   * Complete checkout and return home with comprehensive error handling
   */
  async completeCheckoutAndReturnHome(): Promise<boolean> {
    try {
      logger.info('🎉 Completing checkout and returning home...');
      
      // ✅ FIXED: Use instance method instead of static method
      return await this.customWait.retryOperationInstance(
        async () => {
          // Verify completion message first
          const messageVerified = await this.verifyCompletionMessage();
          if (!messageVerified) {
            throw new Error('Completion message verification failed');
          }
          
          // Return to home
          const returnSuccess = await this.goBackToHome();
          if (!returnSuccess) {
            throw new Error('Failed to return to home page');
          }
          
          // Additional verification that we're on a products/inventory page
          const currentUrl = this.page.url();
          const isOnProductsPage = currentUrl.includes('inventory') || 
                                  currentUrl.includes('products') ||
                                  currentUrl.endsWith('/inventory.html');
          
          if (!isOnProductsPage) {
            logger.warn(`⚠️ May not be on products page after return. Current URL: ${currentUrl}`);
          }
          
          return true;
        },
        3, // maxRetries
        1000 // baseDelay
      );
      
    } catch (error) {
      logger.error('❌ Failed to complete checkout and return home', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if pony express image is visible (visual confirmation)
   */
  async isPonyExpressImageVisible(): Promise<boolean> {
    try {
      await this.waitForCompletion();
      const isVisible = await this.ponyExpressImage.isVisible();
      logger.debug(`🖼️ Pony express image visible: ${isVisible}`);
      return isVisible;
    } catch (error) {
      logger.debug('🖼️ Pony express image check failed, assuming not visible');
      return false;
    }
  }

  /**
   * Check if back home button is enabled
   */
  async isBackHomeButtonEnabled(): Promise<boolean> {
    try {
      await this.waitForElementToBeEnabled(this.backHomeButton, 5000);
      logger.debug('🔘 Back home button is enabled');
      return true;
    } catch (error) {
      logger.warn('🔘 Back home button is not enabled or not found');
      return false;
    }
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageToLoad(): Promise<void> {
    try {
      logger.debug('🌐 Waiting for full page load...');
      await this.page.waitForLoadState('networkidle');
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.artificialDelayInstance(500); // Small delay for stability
      logger.debug('✅ Full page load complete');
    } catch (error) {
      logger.error('❌ Failed to wait for full page load', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get page title for verification
   */
  async getPageTitle(): Promise<string> {
    try {
      return await this.page.title();
    } catch (error) {
      logger.error('❌ Failed to get page title', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return '';
    }
  }

  /**
   * Verify page URL contains expected text
   */
  async verifyPageUrlContains(expectedText: string): Promise<boolean> {
    try {
      const currentUrl = this.page.url();
      const containsText = currentUrl.includes(expectedText);
      
      if (containsText) {
        logger.debug(`✅ Page URL contains "${expectedText}": ${currentUrl}`);
        return true;
      } else {
        logger.warn(`⚠️ Page URL does not contain "${expectedText}": ${currentUrl}`);
        return false;
      }
    } catch (error) {
      logger.error('❌ Failed to verify page URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        expectedText
      });
      return false;
    }
  }

  /**
   * Take screenshot of completion page for documentation
   */
  async takeCompletionScreenshot(screenshotName: string = 'checkout-complete'): Promise<void> {
    try {
      await this.waitForCompletion();
      // This would typically be used with a screenshot helper
      logger.info(`📸 Would take screenshot: ${screenshotName}`);
      // await screenshotHelper.takeScreenshot(screenshotName);
    } catch (error) {
      logger.error('❌ Failed to take completion screenshot', {
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshotName
      });
    }
  }

  /**
   * Get complete checkout completion status for reporting
   */
  async getCompletionStatus(): Promise<{
    isComplete: boolean;
    message: string;
    description: string;
    ponyImageVisible: boolean;
    backButtonEnabled: boolean;
    pageTitle: string;
    url: string;
  }> {
    try {
      await this.waitForCompletion();
      
      const [message, description, ponyVisible, backEnabled, title, url] = await Promise.all([
        this.getCompletionMessageText(),
        this.getCompletionDescriptionText(),
        this.isPonyExpressImageVisible(),
        this.isBackHomeButtonEnabled(),
        this.getPageTitle(),
        this.page.url()
      ]);
      
      const isComplete = message.includes('Thank you for your order') && backEnabled;
      
      const status = {
        isComplete,
        message,
        description,
        ponyImageVisible: ponyVisible,
        backButtonEnabled: backEnabled,
        pageTitle: title,
        url
      };
      
      logger.info('📊 Checkout completion status', status);
      return status;
      
    } catch (error) {
      logger.error('❌ Failed to get completion status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isComplete: false,
        message: 'Error retrieving status',
        description: 'Error retrieving status',
        ponyImageVisible: false,
        backButtonEnabled: false,
        pageTitle: 'Error',
        url: this.page.url()
      };
    }
  }

  /**
   * Validate checkout completion page state
   */
  async validatePageState(): Promise<{
    isValid: boolean;
    issues: string[];
    details: string;
  }> {
    const issues: string[] = [];
    
    try {
      // Check completion message
      const message = await this.getCompletionMessageText();
      if (!message.includes('Thank you')) {
        issues.push('Completion message does not contain expected text');
      }
      
      // Check back button
      const backButtonEnabled = await this.isBackHomeButtonEnabled();
      if (!backButtonEnabled) {
        issues.push('Back home button is not enabled');
      }
      
      // Check URL
      const url = this.page.url();
      if (!url.includes('checkout-complete')) {
        issues.push('Not on checkout complete page');
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        details: `Checkout complete page validation: ${issues.length} issues found`
      };
      
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: 'Checkout complete page validation failed'
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Wait for element to be enabled
   */
  private async waitForElementToBeEnabled(element: Locator, timeout: number = 10000): Promise<void> {
    try {
      await element.waitFor({ state: 'visible', timeout });
      
      await this.waitForCondition(
        async () => await element.isEnabled(),
        timeout,
        500,
        'Element to be enabled'
      );
    } catch (error) {
      throw new Error(`Element not enabled within ${timeout}ms`);
    }
  }

  /**
   * Click with retry mechanism
   */
  private async clickWithRetry(element: Locator, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await element.click();
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        // ✅ FIXED: Use instance method instead of static method
        await this.customWait.artificialDelayInstance(500 * attempt);
      }
    }
  }

  /**
   * Wait for condition with polling
   */
  private async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    pollInterval: number = 500,
    description: string = 'Condition'
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.artificialDelayInstance(pollInterval);
    }
    
    throw new Error(`${description} not met within ${timeout}ms`);
  }
}