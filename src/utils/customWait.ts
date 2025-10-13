import { Page, Locator } from '@playwright/test';

export class CustomWait {
    /**
     * Wait for element to be visible
     */
    static async waitForElement(page: Page, selector: string, timeout: number = 10000): Promise<Locator> {
        const element = page.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        return element;
    }

    /**
     * Wait for element to be enabled and clickable
     */
    static async waitForElementToBeEnabled(locator: Locator, timeout: number = 5000): Promise<void> {
        await locator.waitFor({ state: 'attached', timeout });
        let isEnabled = false;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout && !isEnabled) {
            isEnabled = await locator.isEnabled();
            if (!isEnabled) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        if (!isEnabled) {
            throw new Error(`Element still not enabled after ${timeout}ms`);
        }
    }

    /**
     * Click with retry mechanism for flaky elements
     */
    static async clickWithRetry(
        locator: Locator, 
        maxRetries: number = 3, 
        delay: number = 1000
    ): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await locator.click({ timeout: 5000 });
                console.log(`✅ Click successful on attempt ${attempt}`);
                return;
            } catch (error) {
                lastError = error as Error;
                console.log(`❌ Click attempt ${attempt} failed: ${error}`);

                if (attempt < maxRetries) {
                    console.log(`🔄 Retrying click in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // Additional wait for element to be stable
                    await locator.waitFor({ state: 'visible', timeout: 5000 });
                }
            }
        }

        throw new Error(`Failed to click element after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Wait for network to be idle
     */
    static async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
        await page.waitForLoadState('networkidle', { timeout });
    }

    /**
     * Wait for specific text to appear in element
     */
    static async waitForSpecificText(
        page: Page, 
        selector: string, 
        text: string, 
        timeout: number = 10000
    ): Promise<void> {
        await page.waitForFunction(
            (args: any) => {
                const element = document.querySelector(args.selector);
                return element && element.textContent?.includes(args.text);
            },
            { selector, text },
            { timeout }
        );
    }

    /**
     * Generic retry operation for any async function
     */
    static async retryOperation<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000,
        operationName: string = 'Operation'
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 ${operationName} - Attempt ${attempt}/${maxRetries}`);
                const result = await operation();
                console.log(`✅ ${operationName} - Success on attempt ${attempt}`);
                return result;
            } catch (error) {
                lastError = error as Error;
                console.log(`❌ ${operationName} - Attempt ${attempt} failed: ${error}`);
                
                if (attempt < maxRetries) {
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        const errorMessage = lastError?.message || 'Unknown error occurred';
        throw new Error(`${operationName} failed after ${maxRetries} attempts: ${errorMessage}`);
    }

    /**
     * Wait for page to fully load including all resources
     */
    static async waitForFullPageLoad(page: Page, timeout: number = 30000): Promise<void> {
        await page.waitForLoadState('load', { timeout });
        await page.waitForLoadState('domcontentloaded', { timeout });
        await page.waitForLoadState('networkidle', { timeout });
    }

    /**
     * Wait for element to disappear
     */
    static async waitForElementToDisappear(
        page: Page, 
        selector: string, 
        timeout: number = 10000
    ): Promise<void> {
        await page.waitForSelector(selector, { state: 'detached', timeout });
    }

    /**
     * Wait for multiple elements to be visible
     */
    static async waitForMultipleElements(
        page: Page,
        selectors: string[],
        timeout: number = 10000
    ): Promise<void> {
        const promises = selectors.map(selector => 
            page.waitForSelector(selector, { state: 'visible', timeout })
        );
        await Promise.all(promises);
    }

    /**
     * Wait for condition to be true with polling
     */
    static async waitForCondition(
        condition: () => Promise<boolean>,
        timeout: number = 10000,
        pollInterval: number = 500
    ): Promise<void> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const result = await condition();
            if (result) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    }
}