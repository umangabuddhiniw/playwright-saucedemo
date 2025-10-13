import { Page, expect } from '@playwright/test';

export class CheckoutCompletePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  get completionMessage() { return this.page.locator('.complete-header'); }
  private get backHomeButton() { return this.page.locator('[data-test="back-to-products"]'); }

  async goBackToHome() {
    await this.backHomeButton.click();
  }

  async waitForCompletion() {
    await this.page.waitForSelector('.complete-header', { timeout: 5000 });
  }
}