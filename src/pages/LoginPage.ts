import { Page, expect } from '@playwright/test';
import { logger, logHelper } from '../utils/logger'; // Add logger import

export interface UserCredentials {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    postalCode: string;
}

export class LoginPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // Locators
    private get usernameInput() { return this.page.locator('[data-test="username"]'); }
    private get passwordInput() { return this.page.locator('[data-test="password"]'); }
    private get loginButton() { return this.page.locator('[data-test="login-button"]'); }
    get errorMessage() { return this.page.locator('[data-test="error"]'); }
    private get loginContainer() { return this.page.locator('.login_container'); }

    /**
     * Navigate to the login page
     */
    async navigate(): Promise<void> {
        await this.page.goto('/');
        await this.waitForLoginPageToLoad();
    }

    /**
     * Wait for login page to be fully loaded
     */
    async waitForLoginPageToLoad(): Promise<void> {
        await this.page.waitForSelector('[data-test="username"]', { state: 'visible', timeout: 10000 });
        await this.page.waitForSelector('[data-test="password"]', { state: 'visible', timeout: 10000 });
        await this.page.waitForSelector('[data-test="login-button"]', { state: 'visible', timeout: 10000 });
    }

    /**
     * Login with provided credentials
     * @param username - User username
     * @param password - User password
     */
    async login(username: string, password: string): Promise<void> {
        logger.info(`Attempting login with username: ${username}`);
        
        // Clear any existing values
        await this.usernameInput.clear();
        await this.passwordInput.clear();
        
        // Fill credentials
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        
        // Click login button
        await this.loginButton.click();
        
        // Wait for navigation or error
        await this.waitForLoginResult();
    }

    /**
     * Wait for login result (success or error)
     */
    private async waitForLoginResult(): Promise<void> {
        try {
            // Wait for either successful navigation or error message
            await Promise.race([
                this.page.waitForURL(/.*inventory.html/, { timeout: 5000 }),
                this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
            ]);
        } catch (error) {
            logger.warn('Login result timeout - checking current state...');
        }
    }

    /**
     * Get error message text if present
     */
    async getErrorMessage(): Promise<string> {
        try {
            await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
            const errorText = await this.errorMessage.textContent();
            return errorText?.trim() || '';
        } catch {
            return '';
        }
    }

    /**
     * Check if login was successful
     */
    async isLoginSuccessful(): Promise<boolean> {
        return this.page.url().includes('/inventory.html');
    }

    /**
     * Check if error message is displayed
     */
    async isErrorMessageDisplayed(): Promise<boolean> {
        return await this.errorMessage.isVisible();
    }

    /**
     * Handle specific user types and their behaviors
     */
    async handleUserSpecificBehavior(user: UserCredentials): Promise<{ success: boolean; error?: string }> {
        logger.info(`Handling user type: ${user.username}`);
        
        switch (user.username) {
            case 'standard_user':
                return await this.handleStandardUser();
            
            case 'problem_user':
                return await this.handleProblemUser();
            
            case 'locked_out_user':
                return await this.handleLockedOutUser();
            
            case 'performance_glitch_user':
                return await this.handlePerformanceGlitchUser();
            
            case 'error_user':
                return await this.handleErrorUser();
            
            case 'visual_user':
                return await this.handleVisualUser();
            
            default:
                return await this.handleStandardUser();
        }
    }

    /**
     * Handle standard user - normal behavior
     */
    private async handleStandardUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.info('Standard user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { success: false, error: error || 'Unknown login error for standard user' };
    }

    /**
     * Handle problem user - may have UI issues
     */
    private async handleProblemUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.warn('Problem user logged in - may have UI issues');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { success: false, error: error || 'Login failed for problem user' };
    }

    /**
     * Handle locked out user - should always show error
     */
    private async handleLockedOutUser(): Promise<{ success: boolean; error?: string }> {
        const error = await this.getErrorMessage();
        
        if (error.includes('locked out')) {
            logger.info('Correctly detected locked out user');
            return { success: false, error };
        }
        
        if (await this.isLoginSuccessful()) {
            return { success: false, error: 'Locked out user was able to login - this is unexpected!' };
        }
        
        return { success: false, error: error || 'Unexpected behavior for locked out user' };
    }

    /**
     * Handle performance glitch user - may take longer to login
     */
    private async handlePerformanceGlitchUser(): Promise<{ success: boolean; error?: string }> {
        // Wait longer for performance glitch user
        await this.page.waitForTimeout(3000);
        
        if (await this.isLoginSuccessful()) {
            logger.info('Performance glitch user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { success: false, error: error || 'Login timeout for performance glitch user' };
    }

    /**
     * Handle error user - may encounter random errors
     */
    private async handleErrorUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.info('Error user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        if (error) {
            logger.warn('Error user encountered expected error:', error);
            return { success: false, error };
        }
        
        return { success: false, error: 'Unexpected behavior for error user' };
    }

    /**
     * Handle visual user - for visual testing
     */
    private async handleVisualUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.info('Visual user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { success: false, error: error || 'Login failed for visual user' };
    }

    /**
     * Validate credentials format
     */
    validateCredentials(user: UserCredentials): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!user.username || user.username.trim() === '') {
            errors.push('Username is required');
        }

        if (!user.password || user.password.trim() === '') {
            errors.push('Password is required');
        }

        if (!user.firstName || user.firstName.trim() === '') {
            errors.push('First name is required');
        }

        if (!user.lastName || user.lastName.trim() === '') {
            errors.push('Last name is required');
        }

        if (!user.postalCode || user.postalCode.trim() === '') {
            errors.push('Postal code is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get current login state for reporting
     */
    async getLoginState(): Promise<{
        isLoggedIn: boolean;
        currentUrl: string;
        hasError: boolean;
        errorMessage: string;
    }> {
        return {
            isLoggedIn: await this.isLoginSuccessful(),
            currentUrl: this.page.url(),
            hasError: await this.isErrorMessageDisplayed(),
            errorMessage: await this.getErrorMessage()
        };
    }

    /**
     * Complete login flow with user-specific handling
     */
    async completeLoginFlow(user: UserCredentials): Promise<{
        success: boolean;
        error?: string;
        loginState?: any;
    }> {
        try {
            // Validate credentials first
            const validation = this.validateCredentials(user);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: `Invalid credentials: ${validation.errors.join(', ')}`
                };
            }

            // Navigate and login
            await this.navigate();
            await this.login(user.username, user.password);

            // Handle user-specific behavior
            const result = await this.handleUserSpecificBehavior(user);
            
            // Get final login state
            const loginState = await this.getLoginState();
            
            return {
                success: result.success,
                error: result.error,
                loginState
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Login flow failed for ${user.username}:`, errorMessage);
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}