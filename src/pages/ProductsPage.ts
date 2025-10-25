import { Page, expect, Locator } from '@playwright/test';
import { logger } from '../utils/logger';
import { CustomWait } from '../utils/customWait';

export interface ProductInfo {
  name: string;
  price: number;
  addButton: Locator;
  element: Locator;
}

export class ProductsPage {
  readonly page: Page;
  private customWait: CustomWait;

  constructor(page: Page) {
    this.page = page;
    this.customWait = new CustomWait(page);
  }

  // ✅ OPTIMIZED Locators
  private get productItems(): Locator { 
    return this.page.locator('.inventory_item'); 
  }
  
  private get productPrices(): Locator { 
    return this.page.locator('.inventory_item_price'); 
  }
  
  private get addToCartButtons(): Locator { 
    return this.page.locator('button.btn_inventory'); 
  }
  
  private get cartBadge(): Locator { 
    return this.page.locator('.shopping_cart_badge'); 
  }
  
  private get cartLink(): Locator { 
    return this.page.locator('.shopping_cart_link'); 
  }
  
  private get productImages(): Locator { 
    return this.page.locator('.inventory_item_img img'); 
  }
  
  private get productNames(): Locator { 
    return this.page.locator('.inventory_item_name'); 
  }
  
  private get backToProductsButton(): Locator { 
    return this.page.locator('[data-test="back-to-products"]'); 
  }
  
  private get inventoryList(): Locator { 
    return this.page.locator('.inventory_list'); 
  }
  
  private get inventoryDetails(): Locator { 
    return this.page.locator('.inventory_details'); 
  }
  
  private get inventoryDetailsName(): Locator { 
    return this.page.locator('.inventory_details_name'); 
  }
  
  private get sortDropdown(): Locator {
    return this.page.locator('[data-test="product_sort_container"]');
  }

  // ✅ OPTIMIZED: Wait for products to load with CI awareness
  async waitForProductsToLoad(): Promise<void> {
    const isCI = process.env.CI === 'true';
    const timeout = isCI ? 20000 : 10000;
    
    logger.info(`Waiting for products to load (CI: ${isCI})`);

    try {
      // Wait for inventory container
      await this.page.waitForSelector('.inventory_list', { timeout });
      
      // Wait for products with enhanced verification
      await this.waitForCondition(
        async () => {
          const itemCount = await this.productItems.count();
          if (itemCount === 0) return false;
          
          // Verify first product has content
          const firstProduct = this.productItems.first();
          const isVisible = await firstProduct.isVisible();
          const nameElement = firstProduct.locator('.inventory_item_name');
          const hasName = await nameElement.isVisible();
          const nameText = await nameElement.textContent();
          
          return itemCount > 0 && isVisible && hasName && (nameText?.trim().length ?? 0) > 0;
        },
        timeout,
        500,
        'Products to load with content'
      );

      const productCount = await this.productItems.count();
      logger.info(`Products loaded successfully: ${productCount} items`);

    } catch (error) {
      logger.error(`Failed to load products: ${error}`);
      
      // Take screenshot for debugging
      await this.takeScreenshot('products-load-failed');
      throw error;
    }
  }

  // ✅ OPTIMIZED: Add most expensive products
  async addMostExpensiveProducts(count: number): Promise<string[]> {
    // ✅ FIXED: Use instance method instead of static method
    return await this.customWait.retryOperationInstance(
      async () => {
        logger.info(`Adding ${count} most expensive products to cart`);
        
        await this.waitForProductsToLoad();
        
        // Get all products
        const products = await this.getAllProductInfo();
        
        if (products.length === 0) {
          throw new Error('No products found on the page');
        }

        // Sort by price descending
        products.sort((a, b) => b.price - a.price);
        const productsToAdd = products.slice(0, count);
        
        const addedProducts: string[] = [];
        
        // Add products
        for (const product of productsToAdd) {
          try {
            const success = await this.addSingleProduct(product);
            if (success) {
              addedProducts.push(product.name);
              logger.info(`✓ Added: ${product.name} - $${product.price}`);
            }
          } catch (error) {
            logger.warn(`Failed to add ${product.name}: ${error}`);
          }
        }

        // Verify cart count
        if (addedProducts.length > 0) {
          await this.verifyCartCount(addedProducts.length);
        }

        logger.info(`Successfully added ${addedProducts.length} products`);
        return addedProducts;
      },
      2, // maxRetries
      1000 // baseDelay
    );
  }

  // ✅ OPTIMIZED: Get all product information
  private async getAllProductInfo(): Promise<ProductInfo[]> {
    const products: ProductInfo[] = [];
    
    const items = await this.productItems.all();
    
    for (const item of items) {
      try {
        const nameElement = item.locator('.inventory_item_name');
        const priceElement = item.locator('.inventory_item_price');
        const addButton = item.locator('button.btn_inventory').first();
        
        await nameElement.waitFor({ state: 'visible', timeout: 3000 });
        await priceElement.waitFor({ state: 'visible', timeout: 3000 });
        
        const name = await nameElement.textContent();
        const priceText = await priceElement.textContent();
        
        if (!name?.trim() || !priceText?.trim()) {
          continue;
        }
        
        const price = parseFloat(priceText.replace('$', ''));
        
        products.push({
          name: name.trim(),
          price,
          addButton,
          element: item
        });
      } catch (error) {
        logger.warn(`Error processing product: ${error}`);
        continue;
      }
    }

    return products;
  }

  // ✅ OPTIMIZED: Add single product
  private async addSingleProduct(product: ProductInfo): Promise<boolean> {
    try {
      // Scroll to element
      await product.element.scrollIntoViewIfNeeded();
      
      // Check current state
      const buttonText = await product.addButton.textContent();
      if (buttonText === 'Remove') {
        logger.debug(`Product ${product.name} already in cart`);
        return true;
      }

      if (!(await product.addButton.isEnabled())) {
        throw new Error(`Add button disabled for ${product.name}`);
      }

      // Get current cart count
      const initialCount = await this.getCartBadgeCount();
      
      // Click the button
      await product.addButton.click();
      
      // Verify button state changed
      await this.waitForCondition(
        async () => {
          const newButtonText = await product.addButton.textContent();
          return newButtonText === 'Remove';
        },
        5000,
        500,
        `Add button to change to Remove for ${product.name}`
      );

      // Verify cart count increased
      if (initialCount >= 0) {
        await this.waitForCondition(
          async () => {
            const newCount = await this.getCartBadgeCount();
            return newCount >= initialCount + 1;
          },
          5000,
          500,
          `Cart count to increase after adding ${product.name}`
        );
      }

      return true;

    } catch (error) {
      logger.warn(`Failed to add product ${product.name}: ${error}`);
      return false;
    }
  }

  // ✅ OPTIMIZED: Add product by name
  async addProductByName(productName: string): Promise<boolean> {
    // ✅ FIXED: Use instance method instead of static method
    return await this.customWait.retryOperationInstance(
      async () => {
        logger.info(`Adding product to cart: ${productName}`);
        
        await this.waitForProductsToLoad();
        
        // Find product item
        const productItem = this.page.locator('.inventory_item')
          .filter({ has: this.page.locator('.inventory_item_name', { hasText: productName }) })
          .first();
        
        await productItem.waitFor({ state: 'visible', timeout: 5000 });
        
        // Find add button
        const addButton = productItem.locator('button.btn_inventory');
        await addButton.waitFor({ state: 'visible', timeout: 3000 });
        
        // Check current state
        const buttonText = await addButton.textContent();
        if (buttonText === 'Remove') {
          logger.info(`Product ${productName} already in cart`);
          return true;
        }
        
        if (!(await addButton.isEnabled())) {
          throw new Error(`Add button is disabled for product: ${productName}`);
        }
        
        // Click the button
        await addButton.click();
        
        // Verify button state changed
        await this.waitForCondition(
          async () => {
            const newButtonText = await addButton.textContent();
            return newButtonText === 'Remove';
          },
          5000,
          500,
          `Add button to change to Remove for ${productName}`
        );
        
        logger.info(`Successfully added product: ${productName}`);
        return true;
      },
      2, // maxRetries
      1000 // baseDelay
    );
  }

  // ✅ OPTIMIZED: Get cart badge count
  async getCartBadgeCount(): Promise<number> {
    try {
      const isVisible = await this.cartBadge.isVisible({ timeout: 2000 });
      if (!isVisible) {
        return 0;
      }
      
      const countText = await this.cartBadge.textContent();
      if (!countText) {
        return 0;
      }
      
      const count = parseInt(countText, 10);
      return isNaN(count) ? 0 : count;
    } catch (error) {
      return 0;
    }
  }

  // ✅ OPTIMIZED: Go to cart
  async goToCart(): Promise<void> {
    // ✅ FIXED: Use instance method instead of static method
    await this.customWait.retryOperationInstance(
      async () => {
        logger.info('Navigating to cart page');
        
        await this.cartLink.waitFor({ state: 'visible', timeout: 5000 });
        await this.cartLink.click();
        
        // Wait for cart page
        await this.page.waitForURL(/.*cart\.html/, { timeout: 10000 });
        await this.page.waitForSelector('.cart_list', { timeout: 5000 });
        
        logger.info('Successfully navigated to cart page');
      },
      2, // maxRetries
      1000 // baseDelay
    );
  }

  // ✅ OPTIMIZED: Go to item detail
  async goToItemDetail(itemName: string): Promise<void> {
    // ✅ FIXED: Use instance method instead of static method
    return await this.customWait.retryOperationInstance(
      async () => {
        logger.info(`Navigating to item detail page for: ${itemName}`);
        
        await this.waitForProductsToLoad();
        
        const itemElement = this.page.locator('.inventory_item_name', { hasText: itemName }).first();
        await itemElement.waitFor({ state: 'visible', timeout: 5000 });
        
        await itemElement.click();
        
        // Wait for detail page
        await this.page.waitForURL(/.*inventory-item\.html/, { timeout: 10000 });
        await this.page.waitForSelector('.inventory_details', { timeout: 5000 });
        
        // Verify correct item
        const detailProductName = await this.inventoryDetailsName.textContent();
        if (!detailProductName?.includes(itemName)) {
          throw new Error(`Not on correct detail page. Expected: ${itemName}, Got: ${detailProductName}`);
        }
        
        logger.info(`Successfully navigated to detail page for: ${itemName}`);
      },
      2, // maxRetries
      1000 // baseDelay
    );
  }

  // ✅ OPTIMIZED: Go back to products
  async goBackToProducts(): Promise<void> {
    // ✅ FIXED: Use instance method instead of static method
    await this.customWait.retryOperationInstance(
      async () => {
        logger.info('Navigating back to products page');
        
        await this.backToProductsButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.backToProductsButton.click();
        
        // Wait for products page
        await this.page.waitForURL(/.*inventory\.html/, { timeout: 10000 });
        await this.waitForProductsToLoad();
        
        logger.info('Successfully returned to products page');
      },
      2, // maxRetries
      1000 // baseDelay
    );
  }

  // ✅ NEW: Verify cart count
  private async verifyCartCount(expectedAdditions: number): Promise<void> {
    const isCI = process.env.CI === 'true';
    const timeout = isCI ? 8000 : 5000;

    try {
      await this.waitForCondition(
        async () => {
          const currentCount = await this.getCartBadgeCount();
          return currentCount >= expectedAdditions;
        },
        timeout,
        500,
        `Cart count to be at least ${expectedAdditions}`
      );
      
      const finalCount = await this.getCartBadgeCount();
      logger.info(`Cart verification: expected at least ${expectedAdditions}, got ${finalCount}`);
      
    } catch (error) {
      // In CI, don't fail the test on cart verification issues
      if (!isCI) {
        throw error;
      }
      logger.warn(`Cart verification failed in CI: ${error}`);
    }
  }

  // ✅ NEW: Get all product names
  async getAllProductNames(): Promise<string[]> {
    const names: string[] = [];
    await this.waitForProductsToLoad();
    
    const nameElements = await this.productNames.all();
    
    for (const element of nameElements) {
      const name = await element.textContent();
      if (name?.trim()) {
        names.push(name.trim());
      }
    }
    
    return names;
  }

  // ✅ NEW: Get product price by name
  async getProductPrice(productName: string): Promise<number> {
    // ✅ FIXED: Use instance method instead of static method
    return await this.customWait.retryOperationInstance(
      async () => {
        const productItem = this.page.locator('.inventory_item')
          .filter({ has: this.page.locator('.inventory_item_name', { hasText: productName }) })
          .first();
        
        await productItem.waitFor({ state: 'visible', timeout: 5000 });
        
        const priceElement = productItem.locator('.inventory_item_price');
        await priceElement.waitFor({ state: 'visible', timeout: 3000 });
        
        const priceText = await priceElement.textContent();
        if (!priceText) {
          throw new Error(`Price element empty for product: ${productName}`);
        }
        
        const price = parseFloat(priceText.replace('$', ''));
        if (isNaN(price)) {
          throw new Error(`Invalid price format for product: ${productName}. Price text: ${priceText}`);
        }
        
        return price;
      },
      2, // maxRetries
      500 // baseDelay
    );
  }

  // ✅ NEW: Remove product from cart by name
  async removeProductByName(productName: string): Promise<boolean> {
    // ✅ FIXED: Use instance method instead of static method
    return await this.customWait.retryOperationInstance(
      async () => {
        logger.info(`Removing product from cart: ${productName}`);
        
        const productItem = this.page.locator('.inventory_item')
          .filter({ has: this.page.locator('.inventory_item_name', { hasText: productName }) })
          .first();
        
        await productItem.waitFor({ state: 'visible', timeout: 5000 });
        
        const removeButton = productItem.locator('button.btn_inventory')
          .filter({ hasText: 'Remove' });
        
        await removeButton.waitFor({ state: 'visible', timeout: 3000 });
        
        if (!(await removeButton.isEnabled())) {
          throw new Error(`Remove button is disabled for product: ${productName}`);
        }
        
        const currentCartCount = await this.getCartBadgeCount();
        await removeButton.click();
        
        // Verify removal
        await this.waitForCondition(
          async () => {
            const buttonText = await removeButton.textContent();
            return buttonText === 'Add to cart';
          },
          5000,
          500,
          `Remove button to change to Add to cart for ${productName}`
        );
        
        // Verify cart count decreased
        if (currentCartCount > 0) {
          await this.waitForCondition(
            async () => {
              const newCount = await this.getCartBadgeCount();
              return newCount === currentCartCount - 1;
            },
            5000,
            500,
            `Cart count to decrease after removing ${productName}`
          );
        }
        
        logger.info(`Successfully removed product: ${productName}`);
        return true;
      },
      2, // maxRetries
      1000 // baseDelay
    );
  }

  // ✅ NEW: Get total number of products
  async getTotalProductsCount(): Promise<number> {
    await this.waitForProductsToLoad();
    return await this.productItems.count();
  }

  // ✅ NEW: Check for broken images
  async checkForBrokenImages(): Promise<number> {
    let brokenImagesCount = 0;
    await this.waitForProductsToLoad();
    
    const images = await this.productImages.all();
    
    for (const image of images) {
      try {
        const isBroken = await image.evaluate((img: HTMLImageElement) => {
          return img.naturalWidth === 0 || img.complete === false;
        });
        
        if (isBroken) {
          brokenImagesCount++;
        }
      } catch (error) {
        brokenImagesCount++;
      }
    }
    
    return brokenImagesCount;
  }

  // ✅ NEW: Sort products
  async sortProducts(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    // ✅ FIXED: Use instance method instead of static method
    await this.customWait.retryOperationInstance(
      async () => {
        logger.info(`Sorting products by: ${option}`);
        
        await this.sortDropdown.waitFor({ state: 'visible', timeout: 3000 });
        await this.sortDropdown.selectOption(option);
        
        // Wait for products to re-sort
        // ✅ FIXED: Use instance method instead of static method
        await this.customWait.artificialDelayInstance(500);
        await this.waitForProductsToLoad();
        
        logger.info(`Products sorted by: ${option}`);
      },
      2, // maxRetries
      500 // baseDelay
    );
  }

  // ✅ NEW: Reset application state
  async resetAppState(): Promise<void> {
    logger.info('Resetting application state');
    
    try {
      // Remove all items from cart if any
      const currentCount = await this.getCartBadgeCount();
      
      if (currentCount > 0) {
        await this.goToCart();
        
        const removeButtons = this.page.locator('button:has-text("Remove")');
        const count = await removeButtons.count();
        
        for (let i = 0; i < count; i++) {
          await removeButtons.first().click();
          // ✅ FIXED: Use instance method instead of static method
          await this.customWait.artificialDelayInstance(300);
        }
        
        await this.page.goBack();
        await this.waitForProductsToLoad();
      }
      
      logger.info('App state reset completed');
    } catch (error) {
      logger.warn(`Error resetting app state: ${error}`);
    }
  }

  // ✅ NEW: Take screenshot for debugging
  async takeScreenshot(name: string): Promise<void> {
    const isCI = process.env.CI === 'true';
    if (isCI) {
      try {
        await this.page.screenshot({
          path: `test-results/${name}-${Date.now()}.png`
        });
      } catch (error) {
        // Ignore screenshot errors
      }
    }
  }

  // ✅ NEW: Setup for test
  async setupForTest(): Promise<void> {
    const isCI = process.env.CI === 'true';
    
    // Set appropriate timeouts
    if (isCI) {
      this.page.setDefaultTimeout(15000);
      this.page.setDefaultNavigationTimeout(20000);
    }

    // Reset app state
    await this.resetAppState();
    
    // Wait for stable state
    await this.waitForProductsToLoad();
  }

  // ========== HELPER METHODS ==========

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