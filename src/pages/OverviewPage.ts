import { Page, Locator } from '@playwright/test';
import { logger, logHelper } from '../utils/logger';
import { CustomWait } from '../utils/customWait';

export interface CartItemDetail {
    name: string;
    description: string;
    price: number;
    quantity: number;
}

export interface SummaryData {
    itemTotal: number;
    tax: number;
    finalTotal: number;
    calculationResult: {
        isCorrect: boolean;
        calculatedTotal: number;
        displayedTotal: number;
        difference: number;
    };
}

export interface CalculationResult {
    isCorrect: boolean;
    calculatedTotal: number;
    displayedTotal: number;
    difference: number;
}

export class OverviewPage {
    readonly page: Page;
    private customWait: CustomWait;

    constructor(page: Page) {
        this.page = page;
        this.customWait = new CustomWait(page);
    }

    // Locators with proper typing
    private get itemTotal(): Locator { 
        return this.page.locator('.summary_subtotal_label'); 
    }
    
    private get tax(): Locator { 
        return this.page.locator('.summary_tax_label'); 
    }
    
    private get finalTotal(): Locator { 
        return this.page.locator('.summary_total_label'); 
    }
    
    private get finishButton(): Locator { 
        return this.page.locator('[data-test="finish"]'); 
    }
    
    private get cancelButton(): Locator { 
        return this.page.locator('[data-test="cancel"]'); 
    }
    
    private get summarySection(): Locator { 
        return this.page.locator('.summary_info'); 
    }
    
    private get cartItems(): Locator { 
        return this.page.locator('.cart_item'); 
    }
    
    private get itemNames(): Locator { 
        return this.page.locator('.inventory_item_name'); 
    }
    
    private get itemDescriptions(): Locator {
        return this.page.locator('.inventory_item_desc');
    }
    
    private get itemPrices(): Locator {
        return this.page.locator('.inventory_item_price');
    }
    
    private get itemQuantities(): Locator {
        return this.page.locator('.cart_quantity');
    }

    /**
     * Extract price from text with robust parsing and error handling
     */
    private extractPrice(text: string | null, prefix: string): number {
        try {
            if (!text) {
                throw new Error(`Price element text is null or empty for prefix: ${prefix}`);
            }
            
            if (!text.includes(prefix)) {
                throw new Error(`Price text does not contain expected prefix: ${prefix}`);
            }
            
            const cleanedText = text.replace(prefix, '').replace('$', '').trim();
            const amount = parseFloat(cleanedText);
            
            if (isNaN(amount)) {
                throw new Error(`Failed to parse price from text: "${text}" (cleaned: "${cleanedText}")`);
            }
            
            if (amount < 0) {
                throw new Error(`Invalid price amount: ${amount}`);
            }
            
            logger.debug(`💰 Extracted price: $${amount} from "${text}"`);
            return amount;
        } catch (error) {
            logger.error('❌ Failed to extract price', {
                error: error instanceof Error ? error.message : 'Unknown error',
                text,
                prefix
            });
            throw error;
        }
    }

    /**
     * Get item total with enhanced waiting and validation
     */
    async getItemTotal(): Promise<number> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            return await this.customWait.retryOperationInstance(
                async () => {
                    // ✅ FIXED: Use instance method instead of static method
                    await this.customWait.waitForElementInstance('.summary_subtotal_label', 5000);
                    const text = await this.itemTotal.textContent();
                    return this.extractPrice(text, 'Item total: $');
                },
                3, // maxRetries
                1000 // baseDelay
            );
        } catch (error) {
            logger.error('❌ Failed to get item total', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get tax amount with enhanced waiting and validation
     */
    async getTax(): Promise<number> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            return await this.customWait.retryOperationInstance(
                async () => {
                    // ✅ FIXED: Use instance method instead of static method
                    await this.customWait.waitForElementInstance('.summary_tax_label', 5000);
                    const text = await this.tax.textContent();
                    return this.extractPrice(text, 'Tax: $');
                },
                3, // maxRetries
                1000 // baseDelay
            );
        } catch (error) {
            logger.error('❌ Failed to get tax amount', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get final total with enhanced waiting and validation
     */
    async getFinalTotal(): Promise<number> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            return await this.customWait.retryOperationInstance(
                async () => {
                    // ✅ FIXED: Use instance method instead of static method
                    await this.customWait.waitForElementInstance('.summary_total_label', 5000);
                    const text = await this.finalTotal.textContent();
                    return this.extractPrice(text, 'Total: $');
                },
                3, // maxRetries
                1000 // baseDelay
            );
        } catch (error) {
            logger.error('❌ Failed to get final total', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Verify that the totals calculation is correct
     */
    async verifyTotalCalculation(): Promise<CalculationResult> {
        try {
            logger.debug('🧮 Verifying total calculation...');
            
            const [itemTotal, tax, finalTotal] = await Promise.all([
                this.getItemTotal(),
                this.getTax(),
                this.getFinalTotal()
            ]);
            
            const calculatedTotal = parseFloat((itemTotal + tax).toFixed(2));
            const displayedTotal = parseFloat(finalTotal.toFixed(2));
            const difference = Math.abs(calculatedTotal - displayedTotal);
            const isCorrect = difference < 0.01; // Allow for floating point precision
            
            const result = {
                isCorrect,
                calculatedTotal,
                displayedTotal,
                difference
            };
            
            if (!isCorrect) {
                logger.warn('⚠️ Total calculation mismatch', {
                    itemTotal,
                    tax,
                    calculatedTotal,
                    displayedTotal,
                    difference
                });
            } else {
                logger.debug('✅ Total calculation verified successfully', {
                    itemTotal,
                    tax,
                    calculatedTotal,
                    displayedTotal
                });
            }
            
            return result;
        } catch (error) {
            logger.error('❌ Failed to verify total calculation', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            return {
                isCorrect: false,
                calculatedTotal: 0,
                displayedTotal: 0,
                difference: 0
            };
        }
    }

    /**
     * Finish checkout with enhanced reliability
     */
    async finishCheckout(): Promise<boolean> {
        try {
            logger.info('🏁 Finishing checkout...');
            
            // ✅ FIXED: Use instance method instead of static method
            return await this.customWait.retryOperationInstance(
                async () => {
                    // Wait for finish button to be ready
                    await this.waitForElementToBeEnabled(this.finishButton, 10000);
                    
                    // Click with retry mechanism
                    await this.clickWithRetry(this.finishButton);
                    
                    // Wait for navigation to complete page
                    const navigationSuccess = await this.waitForCondition(
                        async () => this.page.url().includes('checkout-complete'),
                        15000,
                        500,
                        'Navigation to checkout complete page'
                    ).then(() => true).catch(() => false);

                    if (!navigationSuccess) {
                        throw new Error('Failed to navigate to checkout complete page');
                    }
                    
                    logger.info('✅ Checkout finished successfully');
                    return true;
                },
                2, // maxRetries
                1000 // baseDelay
            );
        } catch (error) {
            logger.error('❌ Failed to finish checkout', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Wait for overview page to load completely with sequential element checks
     */
    async waitForOverviewToLoad(timeout: number = 15000): Promise<boolean> {
        try {
            logger.debug('🔄 Waiting for overview page to load...');
            
            // ✅ FIXED: Use instance methods instead of static methods
            await this.customWait.waitForElementInstance('.summary_info', timeout);
            await this.customWait.waitForElementInstance('.summary_subtotal_label', timeout);
            await this.customWait.waitForElementInstance('.summary_total_label', timeout);
            await this.customWait.waitForElementInstance('[data-test="finish"]', timeout);
            
            // Verify we have positive totals
            const [itemTotal, finalTotal] = await Promise.all([
                this.getItemTotal().catch(() => 0),
                this.getFinalTotal().catch(() => 0)
            ]);
            
            if (itemTotal <= 0 || finalTotal <= 0) {
                throw new Error('Totals not populated correctly');
            }
            
            // ✅ FIXED: Use instance method instead of static method
            await this.customWait.waitForNetworkIdleInstance(5000);
            
            logger.debug('✅ Overview page loaded successfully');
            return true;
        } catch (error) {
            logger.error('❌ Failed to load overview page', {
                error: error instanceof Error ? error.message : 'Unknown error',
                timeout
            });
            return false;
        }
    }

    /**
     * Cancel checkout and return to inventory
     */
    async cancelCheckout(): Promise<boolean> {
        try {
            logger.info('↩️ Cancelling checkout from overview...');
            
            // ✅ FIXED: Use instance method instead of static method
            return await this.customWait.retryOperationInstance(
                async () => {
                    await this.waitForElementToBeEnabled(this.cancelButton, 5000);
                    await this.clickWithRetry(this.cancelButton);
                    
                    // Verify we navigated back to inventory
                    const navigationSuccess = await this.waitForCondition(
                        async () => this.page.url().includes('inventory'),
                        10000,
                        500,
                        'Navigation back to inventory'
                    ).then(() => true).catch(() => false);

                    if (navigationSuccess) {
                        logger.info('✅ Successfully cancelled checkout and returned to inventory');
                        return true;
                    } else {
                        throw new Error('Failed to navigate back to inventory');
                    }
                },
                2, // maxRetries
                1000 // baseDelay
            );
        } catch (error) {
            logger.error('❌ Failed to cancel checkout', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Get all summary data in one call
     */
    async getSummaryData(): Promise<SummaryData> {
        try {
            logger.debug('📊 Getting comprehensive summary data...');
            
            await this.waitForOverviewToLoad();
            
            const [itemTotal, tax, finalTotal] = await Promise.all([
                this.getItemTotal(),
                this.getTax(),
                this.getFinalTotal()
            ]);
            
            const calculationResult = await this.verifyTotalCalculation();
            
            const summaryData = {
                itemTotal,
                tax,
                finalTotal,
                calculationResult
            };
            
            logger.info('📈 Summary data retrieved', summaryData);
            return summaryData;
        } catch (error) {
            logger.error('❌ Failed to get summary data', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            throw error;
        }
    }

    /**
     * Get count of cart items
     */
    async getCartItemCount(): Promise<number> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            await this.customWait.waitForElementInstance('.cart_item', 5000);
            const count = await this.cartItems.count();
            logger.debug(`📦 Cart item count: ${count}`);
            return count;
        } catch (error) {
            logger.error('❌ Failed to get cart item count', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return 0;
        }
    }

    /**
     * Complete the entire checkout process from overview
     */
    async completeCheckout(): Promise<{ success: boolean; error?: string }> {
        try {
            logger.info('🎯 Completing checkout from overview...');
            
            // Verify overview is loaded
            const overviewLoaded = await this.waitForOverviewToLoad();
            if (!overviewLoaded) {
                throw new Error('Overview page did not load properly');
            }

            // Verify calculations are correct (but don't block checkout for minor discrepancies)
            const calculationResult = await this.verifyTotalCalculation();
            if (!calculationResult.isCorrect && calculationResult.difference > 0.05) {
                logger.warn('⚠️ Proceeding with checkout despite calculation discrepancy', {
                    difference: calculationResult.difference
                });
            }

            // Finish checkout
            const finishSuccess = await this.finishCheckout();
            if (!finishSuccess) {
                throw new Error('Failed to finish checkout');
            }
            
            logger.info('✅ Checkout completed successfully from overview');
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('❌ Failed to complete checkout from overview', { error: errorMessage });
            
            return { 
                success: false, 
                error: `Checkout failed: ${errorMessage}` 
            };
        }
    }

    /**
     * Check if finish button is enabled
     */
    async isFinishButtonEnabled(): Promise<boolean> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            await this.customWait.waitForElementInstance('[data-test="finish"]', 3000);
            const isEnabled = await this.finishButton.isEnabled();
            logger.debug(`🔘 Finish button enabled: ${isEnabled}`);
            return isEnabled;
        } catch {
            return false;
        }
    }

    /**
     * Wait for page to fully load
     */
    async waitForPageLoad(): Promise<void> {
        try {
            await this.page.waitForLoadState('networkidle');
            // ✅ FIXED: Use instance method instead of static method
            await this.customWait.artificialDelayInstance(500); // Small delay for stability
        } catch (error) {
            logger.error('❌ Failed to wait for page load', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get all cart item names for verification
     */
    async getCartItemNames(): Promise<string[]> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            await this.customWait.waitForElementInstance('.inventory_item_name', 5000);
            
            const count = await this.itemNames.count();
            const names: string[] = [];
            
            for (let i = 0; i < count; i++) {
                const name = await this.itemNames.nth(i).textContent();
                if (name) {
                    names.push(name.trim());
                }
            }
            
            logger.debug(`📝 Cart item names: ${names.join(', ')}`);
            return names;
        } catch (error) {
            logger.error('❌ Failed to get cart item names', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }

    /**
     * Get cart item details including name, description, and price
     */
    async getCartItemDetails(): Promise<CartItemDetail[]> {
        try {
            // ✅ FIXED: Use instance method instead of static method
            await this.customWait.waitForElementInstance('.cart_item', 5000);
            
            const count = await this.cartItems.count();
            const items: CartItemDetail[] = [];
            
            for (let i = 0; i < count; i++) {
                try {
                    const item = this.cartItems.nth(i);
                    
                    const [name, description, priceText, quantityText] = await Promise.all([
                        item.locator('.inventory_item_name').textContent().catch(() => null),
                        item.locator('.inventory_item_desc').textContent().catch(() => null),
                        item.locator('.inventory_item_price').textContent().catch(() => null),
                        item.locator('.cart_quantity').textContent().catch(() => null)
                    ]);
                    
                    const price = priceText ? parseFloat(priceText.replace('$', '')) : 0;
                    const quantity = quantityText ? parseInt(quantityText, 10) : 1;
                    
                    items.push({
                        name: name?.trim() || `Item ${i + 1}`,
                        description: description?.trim() || 'No description',
                        price: isNaN(price) ? 0 : price,
                        quantity: isNaN(quantity) ? 1 : quantity
                    });
                    
                } catch (itemError) {
                    logger.warn(`⚠️ Error processing cart item ${i + 1}`, {
                        error: itemError instanceof Error ? itemError.message : 'Unknown error'
                    });
                    continue;
                }
            }
            
            logger.debug(`📦 Retrieved ${items.length} cart item details`);
            return items;
        } catch (error) {
            logger.error('❌ Failed to get cart item details', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }

    /**
     * Verify we are on the overview page
     */
    async isOnOverviewPage(): Promise<boolean> {
        try {
            const currentUrl = this.page.url();
            const isOverviewPage = currentUrl.includes('checkout-step-two');
            
            if (isOverviewPage) {
                // Additional verification that key elements are present
                const summaryVisible = await this.summarySection.isVisible().catch(() => false);
                return summaryVisible;
            }
            
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Get comprehensive page status for debugging
     */
    async getPageStatus(): Promise<{
        isOnOverviewPage: boolean;
        isFinishEnabled: boolean;
        itemCount: number;
        summaryData: SummaryData | null;
        url: string;
        pageTitle: string;
    }> {
        try {
            const [isOnOverviewPage, isFinishEnabled, itemCount, url, pageTitle] = await Promise.all([
                this.isOnOverviewPage(),
                this.isFinishButtonEnabled(),
                this.getCartItemCount(),
                this.page.url(),
                this.page.title().catch(() => 'Unknown')
            ]);

            let summaryData: SummaryData | null = null;
            if (isOnOverviewPage) {
                try {
                    summaryData = await this.getSummaryData();
                } catch {
                    // If summary data fails, continue without it
                }
            }

            return {
                isOnOverviewPage,
                isFinishEnabled,
                itemCount,
                summaryData,
                url,
                pageTitle
            };
        } catch (error) {
            logger.error('❌ Failed to get page status', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            return {
                isOnOverviewPage: false,
                isFinishEnabled: false,
                itemCount: 0,
                summaryData: null,
                url: this.page.url(),
                pageTitle: 'Error'
            };
        }
    }

    /**
     * Validate overview page state
     */
    async validatePageState(): Promise<{
        isValid: boolean;
        issues: string[];
        details: string;
    }> {
        const issues: string[] = [];
        
        try {
            // Check if we're on the overview page
            if (!await this.isOnOverviewPage()) {
                issues.push('Not on overview page');
                return {
                    isValid: false,
                    issues,
                    details: 'Not on overview page'
                };
            }

            // Check finish button
            const finishEnabled = await this.isFinishButtonEnabled();
            if (!finishEnabled) {
                issues.push('Finish button is not enabled');
            }

            // Check item count
            const itemCount = await this.getCartItemCount();
            if (itemCount === 0) {
                issues.push('No items in cart');
            }

            // Check totals calculation
            try {
                const calculationResult = await this.verifyTotalCalculation();
                if (!calculationResult.isCorrect) {
                    issues.push(`Total calculation mismatch: ${calculationResult.difference}`);
                }
            } catch {
                issues.push('Failed to verify total calculation');
            }

            return {
                isValid: issues.length === 0,
                issues,
                details: `Overview page validation: ${itemCount} items, finish enabled: ${finishEnabled}`
            };
            
        } catch (error) {
            return {
                isValid: false,
                issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                details: 'Overview page validation failed'
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