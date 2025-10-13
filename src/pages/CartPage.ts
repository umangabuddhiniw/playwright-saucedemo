import { Page, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  private get cartItems() { return this.page.locator('.cart_item'); }
  private get itemPrices() { return this.page.locator('.inventory_item_price'); }
  private get removeButtons() { return this.page.locator('button.cart_button'); }
  private get checkoutButton() { return this.page.locator('[data-test="checkout"]'); }
  private get continueShoppingButton() { return this.page.locator('[data-test="continue-shopping"]'); }

  async getCartItemsCount(): Promise<number> {
    return await this.cartItems.count();
  }

  async getCartItems(): Promise<{name: string, price: number}[]> {
    const items = [];
    const cartItems = await this.cartItems.all();
    
    for (const item of cartItems) {
      const name = await item.locator('.inventory_item_name').textContent();
      const priceText = await item.locator('.inventory_item_price').textContent();
      const price = parseFloat(priceText!.replace('$', ''));
      items.push({ name: name!, price });
    }
    
    return items;
  }

  async calculateSubtotal(): Promise<number> {
    const items = await this.getCartItems();
    return items.reduce((total, item) => total + item.price, 0);
  }

  async removeFirstItem() {
    const firstRemoveButton = this.removeButtons.first();
    await firstRemoveButton.click();
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }

  async waitForCartToLoad() {
    await this.page.waitForSelector('.cart_item', { timeout: 5000 });
  }
}