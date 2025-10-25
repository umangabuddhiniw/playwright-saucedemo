import { Page, Locator } from '@playwright/test';
import { logger } from '../utils/logger';
import { CustomWait } from '../utils/customWait';
import { UserCredentials } from '../types/credentials';

export class CheckoutInfoPage {
  readonly page: Page;
  private customWait: CustomWait;

  // Locators with proper typing
  private get firstNameInput(): Locator { 
    return this.page.locator('[data-test="firstName"]'); 
  }
  
  private get lastNameInput(): Locator { 
    return this.page.locator('[data-test="lastName"]'); 
  }
  
  private get postalCodeInput(): Locator { 
    return this.page.locator('[data-test="postalCode"]'); 
  }
  
  private get continueButton(): Locator { 
    return this.page.locator('[data-test="continue"]'); 
  }
  
  private get cancelButton(): Locator { 
    return this.page.locator('[data-test="cancel"]'); 
  }
  
  private get checkoutForm(): Locator { 
    return this.page.locator('.checkout_info'); 
  }
  
  private get errorMessage(): Locator {
    return this.page.locator('[data-test="error"]');
  }

  constructor(page: Page) {
    this.page = page;
    this.customWait = new CustomWait(page);
  }

  /**
   * Fill checkout information using UserCredentials object from JSON file
   */
  async fillCheckoutInfoWithCredentials(userCredentials: UserCredentials): Promise<boolean> {
    try {
      logger.info(`Filling checkout info for ${userCredentials.firstName} ${userCredentials.lastName}`);
      
      return await this.fillCheckoutInfo(
        userCredentials.firstName, 
        userCredentials.lastName, 
        userCredentials.postalCode
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fill checkout information from credentials', {
        error: errorMessage,
        username: userCredentials.username
      });
      return false;
    }
  }

  /**
   * Complete checkout info and continue using UserCredentials object
   */
  async completeCheckoutInfoWithCredentials(userCredentials: UserCredentials): Promise<boolean> {
    try {
      logger.info(`Completing checkout info for ${userCredentials.firstName} ${userCredentials.lastName}`);
      
      return await this.completeCheckoutInfo(
        userCredentials.firstName,
        userCredentials.lastName, 
        userCredentials.postalCode
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to complete checkout information with credentials', {
        error: errorMessage,
        username: userCredentials.username
      });
      return false;
    }
  }

  /**
   * Wait for checkout form to be ready with comprehensive checks
   */
  async waitForCheckoutForm(timeout: number = 15000): Promise<void> {
    try {
      logger.debug('Waiting for checkout form to load...');
      
      // ✅ FIXED: Use instance methods instead of static methods
      await this.customWait.waitForElementInstance('[data-test="firstName"]', timeout);
      await this.customWait.waitForElementInstance('[data-test="lastName"]', timeout);
      await this.customWait.waitForElementInstance('[data-test="postalCode"]', timeout);
      
      // Wait for form to be fully interactive
      const formReady = await this.waitForCondition(
        async () => {
          const [firstNameEnabled, lastNameEnabled, postalCodeEnabled] = await Promise.all([
            this.firstNameInput.isEnabled().catch(() => false),
            this.lastNameInput.isEnabled().catch(() => false),
            this.postalCodeInput.isEnabled().catch(() => false)
          ]);
          return firstNameEnabled && lastNameEnabled && postalCodeEnabled;
        },
        10000,
        500,
        'Checkout form fields to be enabled'
      ).then(() => true).catch(() => false);

      if (!formReady) {
        throw new Error('Checkout form fields did not become enabled within timeout');
      }
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForNetworkIdleInstance(5000);
      
      logger.info('Checkout form loaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to load checkout form', {
        error: errorMessage,
        timeout
      });
      throw error;
    }
  }

  /**
   * Fill checkout information with comprehensive error handling and validation
   */
  async fillCheckoutInfo(firstName: string, lastName: string, postalCode: string): Promise<boolean> {
    try {
      logger.info('Filling checkout information...', {
        firstName: firstName ? `${firstName.substring(0, 1)}***` : 'empty',
        lastName: lastName ? `${lastName.substring(0, 1)}***` : 'empty',
        postalCode: postalCode ? '***' : 'empty'
      });

      // Validate input parameters
      const validation = this.validateInputs(firstName, lastName, postalCode);
      if (!validation.isValid) {
        throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
      }

      // ✅ FIXED: Use instance method instead of static method
      return await this.customWait.retryOperationInstance(
        async () => {
          // Wait for form to be ready
          await this.waitForCheckoutForm();
          
          // Fill fields with individual error handling
          const firstNameSuccess = await this.fillFirstName(firstName);
          const lastNameSuccess = await this.fillLastName(lastName);
          const postalCodeSuccess = await this.fillPostalCode(postalCode);
          
          if (!firstNameSuccess || !lastNameSuccess || !postalCodeSuccess) {
            throw new Error('Failed to fill one or more form fields');
          }
          
          // Verify all fields are filled correctly
          const verificationSuccess = await this.verifyFormData(firstName, lastName, postalCode);
          if (!verificationSuccess) {
            throw new Error('Form data verification failed');
          }
          
          return true;
        },
        3, // maxRetries
        1000 // baseDelay
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fill checkout information', {
        error: errorMessage,
        firstName: firstName ? `${firstName.substring(0, 1)}***` : 'empty',
        lastName: lastName ? `${lastName.substring(0, 1)}***` : 'empty'
      });
      return false;
    }
  }

  /**
   * Validate input parameters
   */
  private validateInputs(firstName: string, lastName: string, postalCode: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!firstName?.trim()) {
      errors.push('First name is required');
    } else if (firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!lastName?.trim()) {
      errors.push('Last name is required');
    } else if (lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    if (!postalCode?.trim()) {
      errors.push('Postal code is required');
    } else if (!/^[A-Z0-9\s-]+$/i.test(postalCode.trim())) {
      errors.push('Postal code contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Fill first name with comprehensive error handling
   */
  private async fillFirstName(firstName: string): Promise<boolean> {
    try {
      logger.debug(`Filling first name: ${firstName ? `${firstName.substring(0, 1)}***` : 'empty'}`);
      
      await this.waitForElementToBeEnabled(this.firstNameInput, 5000);
      
      // Clear field first
      await this.firstNameInput.clear();
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.retryOperationInstance(
        async () => {
          await this.firstNameInput.fill(firstName);
          
          // Verify the value was set correctly
          const valueSet = await this.waitForCondition(
            async () => (await this.firstNameInput.inputValue()) === firstName,
            5000,
            500,
            `First name to be set to "${firstName}"`
          ).then(() => true).catch(() => false);
          
          if (!valueSet) {
            throw new Error('First name value not set correctly');
          }
        },
        2,
        500
      );
      
      logger.debug('First name filled successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fill first name', {
        error: errorMessage,
        firstName: firstName ? `${firstName.substring(0, 1)}***` : 'empty'
      });
      return false;
    }
  }

  /**
   * Fill last name with comprehensive error handling
   */
  private async fillLastName(lastName: string): Promise<boolean> {
    try {
      logger.debug(`Filling last name: ${lastName ? `${lastName.substring(0, 1)}***` : 'empty'}`);
      
      await this.waitForElementToBeEnabled(this.lastNameInput, 5000);
      
      // Clear field first
      await this.lastNameInput.clear();
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.retryOperationInstance(
        async () => {
          await this.lastNameInput.fill(lastName);
          
          // Verify the value was set correctly
          const valueSet = await this.waitForCondition(
            async () => (await this.lastNameInput.inputValue()) === lastName,
            5000,
            500,
            `Last name to be set to "${lastName}"`
          ).then(() => true).catch(() => false);
          
          if (!valueSet) {
            throw new Error('Last name value not set correctly');
          }
        },
        2,
        500
      );
      
      logger.debug('Last name filled successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fill last name', {
        error: errorMessage,
        lastName: lastName ? `${lastName.substring(0, 1)}***` : 'empty'
      });
      return false;
    }
  }

  /**
   * Fill postal code with comprehensive error handling
   */
  private async fillPostalCode(postalCode: string): Promise<boolean> {
    try {
      logger.debug(`Filling postal code: ${postalCode ? '***' : 'empty'}`);
      
      await this.waitForElementToBeEnabled(this.postalCodeInput, 5000);
      
      // Clear field first
      await this.postalCodeInput.clear();
      
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.retryOperationInstance(
        async () => {
          await this.postalCodeInput.fill(postalCode);
          
          // Verify the value was set correctly
          const valueSet = await this.waitForCondition(
            async () => (await this.postalCodeInput.inputValue()) === postalCode,
            5000,
            500,
            'Postal code to be set correctly'
          ).then(() => true).catch(() => false);
          
          if (!valueSet) {
            throw new Error('Postal code value not set correctly');
          }
        },
        2,
        500
      );
      
      logger.debug('Postal code filled successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fill postal code', {
        error: errorMessage
      });
      return false;
    }
  }

  /**
   * Continue to overview with enhanced reliability and error handling
   */
  async continueToOverview(): Promise<boolean> {
    try {
      logger.info('Continuing to checkout overview...');
      
      // ✅ FIXED: Use instance method instead of static method
      return await this.customWait.retryOperationInstance(
        async () => {
          // Wait for continue button to be enabled and clickable
          await this.waitForElementToBeEnabled(this.continueButton, 10000);
          
          // Verify form is filled before continuing
          const formData = await this.getFormData();
          if (!formData.firstName || !formData.lastName || !formData.postalCode) {
            throw new Error('Cannot continue - form is not completely filled');
          }
          
          // Click with retry mechanism
          await this.clickWithRetry(this.continueButton);
          
          // ✅ FIXED: Use instance method instead of static method
          await this.customWait.waitForNetworkIdleInstance();
          
          // Verify we navigated away from info page
          const navigationSuccess = await this.waitForCondition(
            async () => !this.page.url().includes('checkout-step-one'),
            10000,
            500,
            'Navigation to checkout overview'
          ).then(() => true).catch(() => false);

          if (!navigationSuccess) {
            // Check for error messages
            const errorVisible = await this.isErrorMessageVisible();
            if (errorVisible) {
              const errorText = await this.getErrorMessage();
              throw new Error(`Checkout error: ${errorText}`);
            }
            throw new Error('Failed to navigate to checkout overview');
          }
          
          logger.info('Successfully continued to checkout overview');
          return true;
        },
        3, // maxRetries
        1000 // baseDelay
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to continue to overview', {
        error: errorMessage
      });
      return false;
    }
  }

  /**
   * Complete checkout information and proceed to overview in one action
   */
  async completeCheckoutInfo(
    firstName: string, 
    lastName: string, 
    postalCode: string
  ): Promise<boolean> {
    try {
      logger.info('Completing checkout information and continuing...');
      
      // ✅ FIXED: Use instance method instead of static method
      return await this.customWait.retryOperationInstance(
        async () => {
          const fillSuccess = await this.fillCheckoutInfo(firstName, lastName, postalCode);
          if (!fillSuccess) {
            throw new Error('Failed to fill checkout information');
          }
          
          const continueSuccess = await this.continueToOverview();
          if (!continueSuccess) {
            throw new Error('Failed to continue to overview');
          }
          
          return true;
        },
        2, // maxRetries
        1000 // baseDelay
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to complete checkout information', {
        error: errorMessage,
        firstName: firstName ? `${firstName.substring(0, 1)}***` : 'empty',
        lastName: lastName ? `${lastName.substring(0, 1)}***` : 'empty'
      });
      return false;
    }
  }

  /**
   * Cancel checkout and return to cart
   */
  async cancelCheckout(): Promise<boolean> {
    try {
      logger.info('Cancelling checkout...');
      
      await this.clickWithRetry(this.cancelButton);
      // ✅ FIXED: Use instance method instead of static method
      await this.customWait.waitForNetworkIdleInstance();
      
      // Verify we navigated back to cart
      const navigationSuccess = await this.waitForCondition(
        async () => this.page.url().includes('cart'),
        10000,
        500,
        'Navigation back to cart'
      ).then(() => true).catch(() => false);

      if (navigationSuccess) {
        logger.info('Successfully cancelled checkout and returned to cart');
        return true;
      } else {
        logger.warn('May not have navigated completely back to cart');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to cancel checkout', {
        error: errorMessage
      });
      return false;
    }
  }

  /**
   * Verify form data is correctly filled
   */
  private async verifyFormData(
    expectedFirstName: string, 
    expectedLastName: string, 
    expectedPostalCode: string
  ): Promise<boolean> {
    try {
      const actualFirstName = await this.firstNameInput.inputValue();
      const actualLastName = await this.lastNameInput.inputValue();
      const actualPostalCode = await this.postalCodeInput.inputValue();

      const firstNameMatch = actualFirstName === expectedFirstName;
      const lastNameMatch = actualLastName === expectedLastName;
      const postalCodeMatch = actualPostalCode === expectedPostalCode;

      if (!firstNameMatch || !lastNameMatch || !postalCodeMatch) {
        logger.error('Form data verification failed', {
          expected: {
            firstName: expectedFirstName ? `${expectedFirstName.substring(0, 1)}***` : 'empty',
            lastName: expectedLastName ? `${expectedLastName.substring(0, 1)}***` : 'empty',
            postalCode: expectedPostalCode ? '***' : 'empty'
          },
          actual: {
            firstName: actualFirstName ? `${actualFirstName.substring(0, 1)}***` : 'empty',
            lastName: actualLastName ? `${actualLastName.substring(0, 1)}***` : 'empty',
            postalCode: actualPostalCode ? '***' : 'empty'
          }
        });
        return false;
      }

      logger.debug('Form data verified successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to verify form data', {
        error: errorMessage
      });
      return false;
    }
  }

  /**
   * Check if continue button is enabled
   */
  async isContinueButtonEnabled(): Promise<boolean> {
    try {
      await this.waitForElementToBeEnabled(this.continueButton, 3000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if error message is visible
   */
  async isErrorMessageVisible(): Promise<boolean> {
    try {
      return await this.errorMessage.isVisible().catch(() => false);
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    try {
      if (await this.isErrorMessageVisible()) {
        const text = await this.errorMessage.textContent();
        return text?.trim() || 'Unknown error';
      }
      return 'No error message visible';
    } catch {
      return 'Error retrieving error message';
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to wait for page load', {
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Get current field values for debugging
   */
  async getFormData(): Promise<{ firstName: string; lastName: string; postalCode: string }> {
    try {
      const [firstName, lastName, postalCode] = await Promise.all([
        this.firstNameInput.inputValue().catch(() => ''),
        this.lastNameInput.inputValue().catch(() => ''),
        this.postalCodeInput.inputValue().catch(() => '')
      ]);

      return {
        firstName: firstName || '',
        lastName: lastName || '',
        postalCode: postalCode || ''
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get form data', {
        error: errorMessage
      });
      return { firstName: '', lastName: '', postalCode: '' };
    }
  }

  /**
   * Get page status for reporting and debugging
   */
  async getPageStatus(): Promise<{
    isFormLoaded: boolean;
    isContinueEnabled: boolean;
    hasErrors: boolean;
    errorMessage: string;
    formData: { firstName: string; lastName: string; postalCode: string };
    url: string;
  }> {
    try {
      const [formLoaded, continueEnabled, hasErrors, errorMsg, formData, url] = await Promise.all([
        this.waitForCheckoutForm(5000).then(() => true).catch(() => false),
        this.isContinueButtonEnabled(),
        this.isErrorMessageVisible(),
        this.getErrorMessage(),
        this.getFormData(),
        this.page.url()
      ]);

      return {
        isFormLoaded: formLoaded,
        isContinueEnabled: continueEnabled,
        hasErrors,
        errorMessage: errorMsg,
        formData,
        url
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get page status', {
        error: errorMessage
      });
      
      return {
        isFormLoaded: false,
        isContinueEnabled: false,
        hasErrors: true,
        errorMessage: 'Error retrieving page status',
        formData: { firstName: '', lastName: '', postalCode: '' },
        url: this.page.url()
      };
    }
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<boolean> {
    try {
      logger.debug('Clearing checkout form...');
      
      await this.firstNameInput.clear();
      await this.lastNameInput.clear();
      await this.postalCodeInput.clear();
      
      // Verify fields are cleared
      const formData = await this.getFormData();
      const isCleared = !formData.firstName && !formData.lastName && !formData.postalCode;
      
      if (isCleared) {
        logger.debug('Form cleared successfully');
        return true;
      } else {
        logger.warn('Form may not be completely cleared');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to clear form', {
        error: errorMessage
      });
      return false;
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