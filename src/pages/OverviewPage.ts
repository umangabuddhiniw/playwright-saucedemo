import { Page, expect } from '@playwright/test';

export class OverviewPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  private get itemTotal() { return this.page.locator('.summary_subtotal_label'); }
  private get tax() { return this.page.locator('.summary_tax_label'); }
  private get finalTotal() { return this.page.locator('.summary_total_label'); }
  private get finishButton() { return this.page.locator('[data-test="finish"]'); }
  private get cancelButton() { return this.page.locator('[data-test="cancel"]'); }

  async getItemTotal(): Promise<number> {
    const text = await this.itemTotal.textContent();
    return parseFloat(text!.replace('Item total: $', ''));
  }

  async getTax(): Promise<number> {
    const text = await this.tax.textContent();
    return parseFloat(text!.replace('Tax: $', ''));
  }

  async getFinalTotal(): Promise<number> {
    const text = await this.finalTotal.textContent();
    return parseFloat(text!.replace('Total: $', ''));
  }

  async finishCheckout() {
    await this.finishButton.click();
  }

  async waitForOverviewToLoad() {
    await this.page.waitForSelector('.summary_info', { timeout: 5000 });
  }
}