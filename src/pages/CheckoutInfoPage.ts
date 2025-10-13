import { Page } from '@playwright/test';

export class CheckoutInfoPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  private get firstNameInput() { return this.page.locator('[data-test="firstName"]'); }
  private get lastNameInput() { return this.page.locator('[data-test="lastName"]'); }
  private get postalCodeInput() { return this.page.locator('[data-test="postalCode"]'); }
  private get continueButton() { return this.page.locator('[data-test="continue"]'); }
  private get cancelButton() { return this.page.locator('[data-test="cancel"]'); }

  async fillCheckoutInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview() {
    await this.continueButton.click();
  }

  async waitForCheckoutForm() {
    await this.page.waitForSelector('[data-test="firstName"]', { timeout: 5000 });
  }
}