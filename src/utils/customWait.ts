import { Page, Locator } from '@playwright/test';
import { logger } from './logger';

export class CustomWait {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ STATIC METHODS (can be used without instance)
  static async waitForElement(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    try {
      logger.debug(`🔍 Waiting for element: ${selector}`);
      await page.waitForSelector(selector, { timeout });
      logger.debug(`✅ Element visible: ${selector}`);
    } catch (error) {
      logger.error(`❌ Element not visible within ${timeout}ms: ${selector}`, { error });
      throw error;
    }
  }

  static async waitForCondition(
    page: Page,
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    checkInterval: number = 500,
    description: string = 'Condition'
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        logger.debug(`✅ Condition met: ${description}`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    logger.error(`❌ Condition not met within ${timeout}ms: ${description}`);
    return false;
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 500,
    operationName: string = 'Operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`🔄 ${operationName} attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`⚠️ ${operationName} attempt ${attempt}/${maxRetries} failed`, { error: lastError.message });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`❌ All ${maxRetries} attempts failed for: ${operationName}`);
    throw lastError!;
  }

  static async clickWithRetry(locator: Locator, maxRetries: number = 3): Promise<void> {
    await this.retryOperation(
      async () => {
        await locator.click();
      },
      maxRetries,
      500,
      'Click operation'
    );
  }

  static async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
    try {
      logger.debug('🌐 Waiting for network idle');
      await page.waitForLoadState('networkidle', { timeout });
      logger.debug('✅ Network is idle');
    } catch (error) {
      logger.error(`❌ Network did not become idle within ${timeout}ms`, { error });
      throw error;
    }
  }

  static async artificialDelay(ms: number): Promise<void> {
    logger.debug(`⏳ Adding artificial delay: ${ms}ms`);
    await new Promise(resolve => setTimeout(resolve, ms));
    logger.debug(`✅ Artificial delay completed: ${ms}ms`);
  }

  // ✅ INSTANCE METHODS (use when you have CustomWait instance)
  
  /**
   * Artificial delay to simulate user thinking time or handle performance glitches
   */
  async artificialDelayInstance(ms: number = 1000): Promise<void> {
    try {
      logger.debug(`⏳ Adding artificial delay: ${ms}ms`);
      await this.page.waitForTimeout(ms);
      logger.debug(`✅ Artificial delay completed: ${ms}ms`);
    } catch (error) {
      logger.error(`❌ Artificial delay failed:`, { error });
      throw error;
    }
  }

  /**
   * Wait for URL to contain specific text
   */
  async waitForURLToContain(text: string, timeout: number = 10000): Promise<void> {
    try {
      logger.debug(`🔍 Waiting for URL to contain: "${text}"`);
      
      await this.page.waitForFunction(
        (expectedText) => window.location.href.includes(expectedText),
        text,
        { timeout }
      );
      
      logger.debug(`✅ URL now contains: "${text}"`);
    } catch (error) {
      logger.error(`❌ URL did not contain "${text}" within ${timeout}ms:`, { error });
      throw new Error(`Timeout waiting for URL to contain "${text}"`);
    }
  }

  /**
   * Wait for element to be visible and stable
   */
  async waitForElementInstance(selector: string, timeout: number = 10000): Promise<void> {
    try {
      logger.debug(`🔍 Waiting for element: ${selector}`);
      
      const element = this.page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      
      // Additional stability check
      await this.page.waitForTimeout(100);
      
      logger.debug(`✅ Element visible and stable: ${selector}`);
    } catch (error) {
      logger.error(`❌ Element not visible within ${timeout}ms: ${selector}`, { error });
      throw error;
    }
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdleInstance(timeout: number = 30000): Promise<void> {
    try {
      logger.debug(`🌐 Waiting for network idle`);
      await this.page.waitForLoadState('networkidle', { timeout });
      logger.debug(`✅ Network is idle`);
    } catch (error) {
      logger.error(`❌ Network did not become idle within ${timeout}ms:`, { error });
      throw error;
    }
  }

  /**
   * Wait for specific text to appear on page
   */
  async waitForText(text: string, timeout: number = 10000): Promise<void> {
    try {
      logger.debug(`📝 Waiting for text: "${text}"`);
      
      const element = this.page.getByText(text, { exact: false });
      await element.waitFor({ state: 'visible', timeout });
      
      logger.debug(`✅ Text found: "${text}"`);
    } catch (error) {
      logger.error(`❌ Text not found within ${timeout}ms: "${text}"`, { error });
      throw error;
    }
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete(selector: string = '.loading, .spinner, [data-test="loading"]', timeout: number = 15000): Promise<void> {
    try {
      logger.debug(`🔄 Waiting for loading to complete`);
      
      // Wait for loading indicator to be hidden or removed
      const loadingElement = this.page.locator(selector);
      await loadingElement.waitFor({ state: 'hidden', timeout });
      
      logger.debug(`✅ Loading completed`);
    } catch (error) {
      logger.debug(`⚠️ Loading indicator not found or already hidden, continuing...`);
      // Don't throw error for loading indicators as they might not exist
    }
  }

  /**
   * Wait for multiple conditions
   */
  async waitForMultipleConditions(conditions: Array<{ type: string; value: string }>, timeout: number = 15000): Promise<void> {
    try {
      logger.debug(`🎯 Waiting for multiple conditions:`, { conditions });
      
      const startTime = Date.now();
      
      for (const condition of conditions) {
        const remainingTime = timeout - (Date.now() - startTime);
        if (remainingTime <= 0) break;

        try {
          switch (condition.type) {
            case 'element':
              await this.waitForElementInstance(condition.value, remainingTime);
              break;
            case 'text':
              await this.waitForText(condition.value, remainingTime);
              break;
            case 'url':
              await this.waitForURLToContain(condition.value, remainingTime);
              break;
            case 'network':
              await this.waitForNetworkIdleInstance(remainingTime);
              break;
            default:
              logger.warn(`⚠️ Unknown condition type: ${condition.type}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Condition failed: ${condition.type}="${condition.value}"`, { error });
          // Continue with other conditions
        }
      }
      
      logger.debug(`✅ Multiple conditions completed`);
    } catch (error) {
      logger.error(`❌ Multiple conditions failed:`, { error });
      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperationInstance<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`🔄 Attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`⚠️ Attempt ${attempt} failed:`, { error: lastError.message });
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.debug(`⏳ Retrying in ${delay}ms...`);
          await this.artificialDelayInstance(delay);
        }
      }
    }
    
    logger.error(`❌ All ${maxRetries} attempts failed`);
    throw lastError!;
  }
}

// Export a factory function for easier usage
export function createCustomWait(page: Page): CustomWait {
  return new CustomWait(page);
}

// Default export
export default CustomWait;

logger.debug('⏰ CustomWait utility loaded with static and instance methods');