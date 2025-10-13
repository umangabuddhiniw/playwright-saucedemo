import { Page, expect } from '@playwright/test';
import { logger } from '../utils/logger'; // Add logger import

export class ProductsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  private get productItems() { return this.page.locator('.inventory_item'); }
  private get productPrices() { return this.page.locator('.inventory_item_price'); }
  private get addToCartButtons() { return this.page.locator('button.btn_inventory'); }
  private get cartBadge() { return this.page.locator('.shopping_cart_badge'); }
  private get cartLink() { return this.page.locator('.shopping_cart_link'); }
  private get productImages() { return this.page.locator('.inventory_item_img img'); }

  async addMostExpensiveProducts(count: number): Promise<string[]> {
    const products = [];
    
    const items = await this.productItems.all();
    for (const item of items) {
      const name = await item.locator('.inventory_item_name').textContent();
      const priceText = await item.locator('.inventory_item_price').textContent();
      const price = parseFloat(priceText!.replace('$', ''));
      const addButton = item.locator('button').first();
      
      products.push({
        name: name!,
        price,
        addButton,
        element: item
      });
    }

    // Sort by price descending
    products.sort((a, b) => b.price - a.price);
    
    const addedProducts: string[] = [];
    for (let i = 0; i < Math.min(count, products.length); i++) {
      const product = products[i];
      
      const isButtonAvailable = await product.addButton.isVisible();
      const isButtonEnabled = await product.addButton.isEnabled();
      
      if (isButtonAvailable && isButtonEnabled) {
        await product.addButton.click();
        addedProducts.push(product.name);
        logger.info(`Added product: ${product.name} - $${product.price}`);
      } else {
        logger.warn(`Skipped product: ${product.name} - Add to cart button not available`);
      }
    }
    
    return addedProducts;
  }

  async getCartBadgeCount(): Promise<number> {
    try {
      await this.cartBadge.waitFor({ state: 'visible', timeout: 5000 });
      const countText = await this.cartBadge.textContent();
      return parseInt(countText || '0');
    } catch {
      return 0;
    }
  }

  async goToCart() {
    await this.cartLink.click();
  }

  async checkForBrokenImages(): Promise<number> {
    let brokenImagesCount = 0;
    const images = await this.productImages.all();
    
    for (const image of images) {
      const isBroken = await image.evaluate((img: HTMLImageElement) => {
        return img.naturalWidth === 0;
      });
      
      if (isBroken) {
        brokenImagesCount++;
        logger.debug(`Found broken image: ${await image.getAttribute('alt') || 'Unknown'}`);
      }
    }
    
    if (brokenImagesCount > 0) {
      logger.info(`Found ${brokenImagesCount} broken images`);
    }
    
    return brokenImagesCount;
  }

  async waitForProductsToLoad() {
    await this.page.waitForSelector('.inventory_item', { timeout: 10000 });
  }

  // NEW METHOD: Analyze add to cart buttons for problem_user
  async analyzeAddToCartButtons(): Promise<{ total: number; enabled: number }> {
    const buttons = await this.addToCartButtons.all();
    let enabledCount = 0;
    
    for (const button of buttons) {
      if (await button.isEnabled()) {
        enabledCount++;
      }
    }
    
    logger.debug(`Button analysis: ${enabledCount}/${buttons.length} buttons enabled`);
    
    return { total: buttons.length, enabled: enabledCount };
  }

  // NEW METHOD: Enhanced wait for performance_glitch_user
  async waitForProductsToLoadExtended(): Promise<void> {
    await this.page.waitForSelector('.inventory_item', { timeout: 15000 });
  }
}