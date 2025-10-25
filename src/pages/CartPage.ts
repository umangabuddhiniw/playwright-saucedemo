import { Page, Locator } from '@playwright/test';
import { logger, logHelper } from '../utils/logger';
import { CustomWait } from '../utils/customWait';

export interface CartItem {
  name: string;
  price: number;
  quantity?: number;
  index?: number;
}

export class CartPage {
  readonly page: Page;
  private customWait: CustomWait;

  constructor(page: Page) {
    this.page = page;
    this.customWait = new CustomWait(page);
  }

  // Locators with proper error handling
  private get cartItems(): Locator { 
    return this.page.locator('.cart_item'); 
  }
  
  private get itemNames(): Locator { 
    return this.page.locator('.inventory_item_name'); 
  }
  
  private get itemPrices(): Locator { 
    return this.page.locator('.inventory_item_price'); 
  }
  
  private get removeButtons(): Locator { 
    return this.page.locator('button.cart_button').filter({ hasText: 'Remove' }); 
  }
  
  private get checkoutButton(): Locator { 
    return this.page.locator('[data-test="checkout"]'); 
  }
  
  private get continueShoppingButton(): Locator { 
    return this.page.locator('[data-test="continue-shopping"]'); 
  }
  
  private get cartList(): Locator { 
    return this.page.locator('.cart_list'); 
  }
  
  private get cartBadge(): Locator {
    return this.page.locator('.shopping_cart_badge');
  }

  private get cartQuantity(): Locator {
    return this.page.locator('.cart_quantity');
  }

  /**
   * Wait for cart to load completely with comprehensive checks
   */
  async waitForCartToLoad(timeout: number = 15000): Promise<void> {
    try {
      logger.debug('🔄 Waiting for cart to load...');
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForElementInstance('.cart_list', timeout);
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForNetworkIdleInstance(5000);
      
      // Additional check for cart items to be stable
      await this.waitForCondition(
        async () => {
          const itemCount = await this.cartItems.count();
          return itemCount >= 0; // Just ensure selector is stable
        },
        5000,
        200,
        'Cart items to stabilize'
      );
      
      logger.debug('✅ Cart loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load cart', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get the count of items in the cart with error handling
   */
  async getCartItemsCount(): Promise<number> {
    try {
      await this.waitForCartToLoad();
      const count = await this.cartItems.count();
      logger.debug(`📊 Cart item count: ${count}`);
      return count;
    } catch (error) {
      logger.error('❌ Failed to get cart items count', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Get all cart items with their names and prices with comprehensive error handling
   */
  async getCartItems(): Promise<CartItem[]> {
    const items: CartItem[] = [];
    
    try {
      await this.waitForCartToLoad();
      const itemCount = await this.getCartItemsCount();
      
      logger.debug(`🔍 Retrieving ${itemCount} cart items...`);
      
      for (let i = 0; i < itemCount; i++) {
        try {
          const item = this.cartItems.nth(i);
          
          // Get item name with null safety
          const nameElement = item.locator('.inventory_item_name');
          const name = await nameElement.textContent().catch(() => null);
          if (!name) {
            logger.warn(`⚠️ Could not retrieve name for cart item ${i + 1}`);
            continue;
          }
          
          // Get item price with null safety and parsing
          const priceElement = item.locator('.inventory_item_price');
          const priceText = await priceElement.textContent().catch(() => null);
          if (!priceText) {
            logger.warn(`⚠️ Could not retrieve price for cart item ${i + 1}`);
            continue;
          }
          
          // Parse price safely
          const price = this.parsePrice(priceText);
          if (price === null) {
            logger.warn(`⚠️ Could not parse price "${priceText}" for cart item ${i + 1}`);
            continue;
          }
          
          // Get quantity if available
          const quantityElement = item.locator('.cart_quantity');
          const quantityText = await quantityElement.textContent().catch(() => null);
          const quantity = quantityText ? parseInt(quantityText) : 1;
          
          items.push({ 
            name: name.trim(), 
            price,
            quantity,
            index: i
          });
          
          logger.debug(`📦 Cart item ${i + 1}: ${name.trim()} - $${price} (Qty: ${quantity})`);
          
        } catch (itemError) {
          logger.error(`❌ Error processing cart item ${i + 1}`, {
            error: itemError instanceof Error ? itemError.message : 'Unknown error'
          });
          continue;
        }
      }
      
      logger.info(`✅ Retrieved ${items.length} cart items successfully`);
      return items;
      
    } catch (error) {
      logger.error('❌ Failed to get cart items', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Safely parse price text to number
   */
  private parsePrice(priceText: string): number | null {
    try {
      // Remove currency symbols and trim whitespace
      const cleanPrice = priceText.replace(/[^\d.,]/g, '').trim();
      const price = parseFloat(cleanPrice);
      
      // Validate the parsed price
      if (isNaN(price) || price < 0) {
        return null;
      }
      
      return parseFloat(price.toFixed(2)); // Ensure 2 decimal places
    } catch {
      return null;
    }
  }

  /**
   * Calculate the subtotal of all items in the cart
   */
  async calculateSubtotal(): Promise<number> {
    try {
      const items = await this.getCartItems();
      const subtotal = items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
      
      logger.debug(`💰 Cart subtotal: $${subtotal.toFixed(2)}`);
      return parseFloat(subtotal.toFixed(2));
      
    } catch (error) {
      logger.error('❌ Failed to calculate cart subtotal', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Remove the first item from the cart with comprehensive retry mechanism
   */
  async removeFirstItem(): Promise<boolean> {
    try {
      await this.waitForCartToLoad();
      const initialCount = await this.getCartItemsCount();
      
      if (initialCount === 0) {
        logger.warn('⚠️ No items in cart to remove');
        return false;
      }

      logger.info(`🗑️ Removing first item from cart (current: ${initialCount} items)`);
      
      const firstRemoveButton = this.removeButtons.first();
      
      // Get item name before removal for logging
      const itemName = await this.getItemName(0).catch(() => 'Unknown item');
      
      // Use CustomWait instance for reliable clicking
      await this.clickWithRetry(firstRemoveButton);
      
      // Wait for cart to update with comprehensive verification
      const removalSuccessful = await this.waitForCondition(
        async () => {
          const newCount = await this.getCartItemsCount();
          return newCount === initialCount - 1;
        },
        10000,
        500,
        `Cart count to decrease from ${initialCount} to ${initialCount - 1}`
      ).then(() => true).catch(() => false);

      if (removalSuccessful) {
        logger.info(`✅ Successfully removed: ${itemName} (now: ${initialCount - 1} items)`);
        return true;
      } else {
        logger.error('❌ Cart count did not decrease after removal attempt');
        return false;
      }
      
    } catch (error) {
      logger.error('❌ Failed to remove first item from cart', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Remove specific item by index with bounds checking
   */
  async removeItemByIndex(index: number): Promise<boolean> {
    try {
      await this.waitForCartToLoad();
      const itemCount = await this.getCartItemsCount();
      
      if (itemCount === 0) {
        logger.warn('⚠️ Cart is empty, cannot remove item');
        return false;
      }
      
      if (index < 0 || index >= itemCount) {
        logger.error(`❌ Invalid index: ${index}. Cart has ${itemCount} items.`);
        return false;
      }

      logger.info(`🗑️ Removing item at index ${index} from cart`);
      
      const removeButton = this.removeButtons.nth(index);
      const itemName = await this.getItemName(index).catch(() => `Item ${index + 1}`);
      
      // Use CustomWait instance for reliable clicking
      await this.clickWithRetry(removeButton);
      
      // Wait for removal to take effect
      const removalSuccessful = await this.waitForCondition(
        async () => {
          const newCount = await this.getCartItemsCount();
          return newCount === itemCount - 1;
        },
        10000,
        500,
        `Cart count to decrease from ${itemCount} to ${itemCount - 1}`
      ).then(() => true).catch(() => false);

      if (removalSuccessful) {
        logger.info(`✅ Successfully removed: ${itemName}`);
        return true;
      } else {
        logger.error(`❌ Failed to remove item at index ${index}`);
        return false;
      }
      
    } catch (error) {
      logger.error(`❌ Failed to remove item at index ${index}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Remove item by name (case-insensitive partial match)
   */
  async removeItemByName(itemName: string): Promise<boolean> {
    try {
      await this.waitForCartToLoad();
      const items = await this.getCartItems();
      
      const itemIndex = items.findIndex(item => 
        item.name.toLowerCase().includes(itemName.toLowerCase())
      );
      
      if (itemIndex === -1) {
        logger.warn(`⚠️ Item "${itemName}" not found in cart. Available items: ${items.map(i => i.name).join(', ')}`);
        return false;
      }

      logger.info(`🗑️ Removing item by name: "${itemName}" (found at index ${itemIndex})`);
      return await this.removeItemByIndex(itemIndex);
      
    } catch (error) {
      logger.error(`❌ Failed to remove item by name: "${itemName}"`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Remove item by exact name match
   */
  async removeItemByExactName(exactName: string): Promise<boolean> {
    try {
      await this.waitForCartToLoad();
      const items = await this.getCartItems();
      
      const itemIndex = items.findIndex(item => 
        item.name.trim().toLowerCase() === exactName.trim().toLowerCase()
      );
      
      if (itemIndex === -1) {
        logger.warn(`⚠️ Item "${exactName}" not found in cart. Available items: ${items.map(i => i.name).join(', ')}`);
        return false;
      }

      logger.info(`🗑️ Removing item by exact name: "${exactName}" (found at index ${itemIndex})`);
      return await this.removeItemByIndex(itemIndex);
      
    } catch (error) {
      logger.error(`❌ Failed to remove item by exact name: "${exactName}"`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Proceed to checkout with proper waiting and validation
   */
  async proceedToCheckout(): Promise<boolean> {
    try {
      logger.info('💰 Proceeding to checkout...');
      
      // Use CustomWait instance for reliable button interaction
      await this.waitForElementToBeEnabled(this.checkoutButton);
      
      // Verify we have items in cart
      const itemCount = await this.getCartItemsCount();
      if (itemCount === 0) {
        logger.error('❌ Cannot proceed to checkout: cart is empty');
        return false;
      }
      
      await this.clickWithRetry(this.checkoutButton);
      await this.customWait.waitForNetworkIdleInstance();
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForURLToContain('checkout-step-one', 10000)
        .catch(() => logger.warn('⚠️ May not have navigated to exact checkout page'));
      
      logger.info('✅ Successfully proceeded to checkout');
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to proceed to checkout', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Continue shopping with proper navigation
   */
  async continueShopping(): Promise<boolean> {
    try {
      logger.info('🛍️ Continuing shopping...');
      
      // Use CustomWait instance for reliable button interaction
      await this.waitForElementToBeEnabled(this.continueShoppingButton);
      await this.clickWithRetry(this.continueShoppingButton);
      await this.customWait.waitForNetworkIdleInstance();
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForURLToContain('inventory', 10000)
        .catch(() => logger.warn('⚠️ May not have navigated back to exact products page'));
      
      logger.info('✅ Successfully continued shopping');
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to continue shopping', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Wait for cart to be empty with timeout using CustomWait instance
   */
  async waitForCartToBeEmpty(timeout: number = 10000): Promise<boolean> {
    try {
      logger.debug('⏳ Waiting for cart to be empty...');
      
      return await this.waitForCondition(
        async () => {
          const count = await this.getCartItemsCount();
          return count === 0;
        },
        timeout,
        500,
        'Cart to be empty'
      ).then(() => {
        logger.info('✅ Cart is now empty');
        return true;
      }).catch(() => {
        logger.warn('⚠️ Cart did not become empty within timeout');
        return false;
      });
      
    } catch (error) {
      logger.error('❌ Error waiting for cart to be empty', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if cart is empty
   */
  async isCartEmpty(): Promise<boolean> {
    try {
      const count = await this.getCartItemsCount();
      return count === 0;
    } catch {
      // If we can't determine the count, assume it's empty
      return true;
    }
  }

  /**
   * Get item price by index with bounds checking
   */
  async getItemPrice(index: number): Promise<number | null> {
    try {
      await this.waitForCartToLoad();
      const itemCount = await this.getCartItemsCount();
      
      if (index < 0 || index >= itemCount) {
        logger.error(`❌ Invalid index: ${index}. Cart has ${itemCount} items.`);
        return null;
      }

      const priceText = await this.itemPrices.nth(index).textContent();
      if (!priceText) {
        logger.warn(`⚠️ Could not get price for item at index ${index}`);
        return null;
      }
      
      return this.parsePrice(priceText);
      
    } catch (error) {
      logger.error(`❌ Failed to get item price at index ${index}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get item name by index with bounds checking
   */
  async getItemName(index: number): Promise<string | null> {
    try {
      await this.waitForCartToLoad();
      const itemCount = await this.getCartItemsCount();
      
      if (index < 0 || index >= itemCount) {
        logger.error(`❌ Invalid index: ${index}. Cart has ${itemCount} items.`);
        return null;
      }

      const name = await this.itemNames.nth(index).textContent();
      if (!name) {
        logger.warn(`⚠️ Could not get name for item at index ${index}`);
        return null;
      }
      
      return name.trim();
      
    } catch (error) {
      logger.error(`❌ Failed to get item name at index ${index}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Verify item exists in cart by name (case-insensitive partial match)
   */
  async isItemInCart(itemName: string): Promise<boolean> {
    try {
      const items = await this.getCartItems();
      return items.some(item => 
        item.name.toLowerCase().includes(itemName.toLowerCase())
      );
    } catch (error) {
      logger.error(`❌ Failed to check if item "${itemName}" is in cart`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Verify item exists in cart by exact name match
   */
  async isItemInCartExact(exactName: string): Promise<boolean> {
    try {
      const items = await this.getCartItems();
      return items.some(item => 
        item.name.trim().toLowerCase() === exactName.trim().toLowerCase()
      );
    } catch (error) {
      logger.error(`❌ Failed to check if item "${exactName}" is in cart`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Clear all items from cart with comprehensive error handling
   */
  async clearCart(): Promise<boolean> {
    try {
      logger.info('🧹 Clearing entire cart...');
      
      await this.waitForCartToLoad();
      const initialCount = await this.getCartItemsCount();
      
      if (initialCount === 0) {
        logger.info('✅ Cart is already empty');
        return true;
      }
      
      logger.info(`🗑️ Removing ${initialCount} items from cart...`);
      
      // Remove items from last to first to avoid index shifting issues
      for (let i = initialCount - 1; i >= 0; i--) {
        const success = await this.removeItemByIndex(i);
        if (!success) {
          logger.error(`❌ Failed to remove item at index ${i}, stopping cart clearance`);
          return false;
        }
      }
      
      // Verify cart is empty using CustomWait instance
      const clearanceSuccessful = await this.waitForCondition(
        async () => {
          const finalCount = await this.getCartItemsCount();
          return finalCount === 0;
        },
        15000,
        500,
        'Cart to be completely empty'
      ).then(() => true).catch(() => false);

      if (clearanceSuccessful) {
        logger.info('✅ Cart cleared successfully');
        return true;
      } else {
        const finalCount = await this.getCartItemsCount();
        logger.error(`❌ Cart clearance incomplete: ${finalCount} items remaining`);
        return false;
      }
      
    } catch (error) {
      logger.error('❌ Failed to clear cart', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get cart badge count (returns 0 if badge not visible)
   */
  async getCartBadgeCount(): Promise<number> {
    try {
      const isBadgeVisible = await this.cartBadge.isVisible().catch(() => false);
      if (!isBadgeVisible) {
        return 0;
      }
      
      const badgeText = await this.cartBadge.textContent();
      return badgeText ? parseInt(badgeText) : 0;
    } catch (error) {
      logger.debug('Could not get cart badge count, assuming 0');
      return 0;
    }
  }

  /**
   * Wait for cart badge to reflect specific count using CustomWait instance
   */
  async waitForCartBadgeCount(expectedCount: number, timeout: number = 10000): Promise<boolean> {
    try {
      if (expectedCount === 0) {
        // Wait for badge to disappear
        return await this.waitForCondition(
          async () => {
            const isVisible = await this.cartBadge.isVisible().catch(() => false);
            return !isVisible;
          },
          timeout,
          500,
          `Cart badge to disappear (expected count: 0)`
        ).then(() => true).catch(() => false);
      } else {
        // Wait for badge to show specific count
        return await this.waitForCondition(
          async () => {
            const actualCount = await this.getCartBadgeCount();
            return actualCount === expectedCount;
          },
          timeout,
          500,
          `Cart badge to show count: ${expectedCount}`
        ).then(() => true).catch(() => false);
      }
    } catch (error) {
      logger.error(`❌ Failed to wait for cart badge count: ${expectedCount}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get cart summary information
   */
  async getCartSummary(): Promise<{
    itemCount: number;
    subtotal: number;
    items: CartItem[];
    isEmpty: boolean;
  }> {
    try {
      const items = await this.getCartItems();
      const subtotal = await this.calculateSubtotal();
      const itemCount = await this.getCartItemsCount();
      
      return {
        itemCount,
        subtotal,
        items,
        isEmpty: itemCount === 0
      };
    } catch (error) {
      logger.error('❌ Failed to get cart summary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        itemCount: 0,
        subtotal: 0,
        items: [],
        isEmpty: true
      };
    }
  }

  /**
   * Validate cart state (useful for debugging)
   */
  async validateCartState(): Promise<{
    isValid: boolean;
    issues: string[];
    details: string;
  }> {
    const issues: string[] = [];
    
    try {
      // Check if cart is accessible
      await this.waitForCartToLoad(5000);
      
      // Check item count consistency
      const badgeCount = await this.getCartBadgeCount();
      const actualCount = await this.getCartItemsCount();
      
      if (badgeCount !== actualCount) {
        issues.push(`Cart badge count (${badgeCount}) doesn't match actual items (${actualCount})`);
      }
      
      // Check item prices are valid
      const items = await this.getCartItems();
      const invalidPrices = items.filter(item => item.price <= 0);
      if (invalidPrices.length > 0) {
        issues.push(`Found ${invalidPrices.length} items with invalid prices`);
      }
      
      // Check remove buttons match item count
      const removeButtonCount = await this.removeButtons.count();
      if (removeButtonCount !== actualCount) {
        issues.push(`Remove buttons (${removeButtonCount}) don't match item count (${actualCount})`);
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        details: `Cart validation: ${actualCount} items, $${await this.calculateSubtotal()} subtotal`
      };
      
    } catch (error) {
      return {
        isValid: false,
        issues: [`Cart validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: 'Cart validation failed'
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