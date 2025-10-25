import { Page, Locator } from '@playwright/test';
import { logger, logHelper } from '../utils/logger';
import { CustomWait } from '../utils/customWait';
import { UserCredentials } from '../types/credentials';

export interface LoginResult {
    success: boolean;
    error?: string;
    loginState?: any;
}

export class LoginPage {
    readonly page: Page;
    private customWait: CustomWait;

    constructor(page: Page) {
        this.page = page;
        this.customWait = new CustomWait(page);
    }

    // Locators with proper typing
    private get usernameInput(): Locator { 
        return this.page.locator('[data-test="username"]'); 
    }
    
    private get passwordInput(): Locator { 
        return this.page.locator('[data-test="password"]'); 
    }
    
    private get loginButton(): Locator { 
        return this.page.locator('[data-test="login-button"]'); 
    }
    
    get errorMessage(): Locator { 
        return this.page.locator('[data-test="error"]'); 
    }
    
    private get burgerMenu(): Locator {
        return this.page.locator('#react-burger-menu-btn');
    }
    
    private get logoutButton(): Locator {
        return this.page.locator('#logout_sidebar_link');
    }
    
    private get resetButton(): Locator {
        return this.page.locator('#reset_sidebar_link');
    }

    /**
     * Login using UserCredentials object from JSON file
     */
    async loginWithCredentials(userCredentials: UserCredentials): Promise<boolean> {
        try {
            logger.info(`🔐 Attempting login for user from credentials: ${userCredentials.username}`);
            return await this.login(userCredentials.username, userCredentials.password);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Login with credentials failed', {
                error: errorMessage,
                username: userCredentials.username
            });
            return false;
        }
    }

    /**
     * Complete login flow using UserCredentials object
     */
    async completeLoginFlowWithCredentials(userCredentials: UserCredentials): Promise<LoginResult> {
        try {
            logger.info(`🚀 Starting complete login flow for: ${userCredentials.username}`);
            return await this.completeLoginFlow(userCredentials);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Login flow failed for ${userCredentials.username}`, { error: errorMessage });
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Navigate to the login page with comprehensive error handling
     */
    async navigate(): Promise<boolean> {
        try {
            logger.info('🧭 Navigating to login page...');
            await this.page.goto('/', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            const navigationSuccess = await this.waitForLoginPageToLoad(15000);
            if (navigationSuccess) {
                logger.info('✅ Successfully navigated to login page');
                return true;
            } else {
                logger.error('❌ Failed to navigate to login page - page did not load properly');
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Navigation to login page failed', {
                error: errorMessage
            });
            return false;
        }
    }

    /**
     * Wait for login page to be fully loaded with sequential element checks
     */
    async waitForLoginPageToLoad(timeout: number = 15000): Promise<boolean> {
        try {
            logger.debug('🔄 Waiting for login page to load...');
            
            // Use static methods correctly (they're designed for this use case)
            await CustomWait.waitForElement(this.page, '[data-test="username"]', timeout);
            await CustomWait.waitForElement(this.page, '[data-test="password"]', timeout);
            await CustomWait.waitForElement(this.page, '[data-test="login-button"]', timeout);
            
            // Wait for elements to be enabled and interactive
            const elementsReady = await CustomWait.waitForCondition(
                this.page,
                async () => {
                    const [usernameEnabled, passwordEnabled, loginEnabled] = await Promise.all([
                        this.usernameInput.isEnabled().catch(() => false),
                        this.passwordInput.isEnabled().catch(() => false),
                        this.loginButton.isEnabled().catch(() => false)
                    ]);
                    return usernameEnabled && passwordEnabled && loginEnabled;
                },
                10000,
                500,
                'Login page elements to be enabled'
            ).then(() => true).catch(() => false);

            if (!elementsReady) {
                throw new Error('Login page elements did not become enabled within timeout');
            }
            
            // Wait for network to be idle
            await CustomWait.waitForNetworkIdle(this.page, 5000);
            
            logger.debug('✅ Login page loaded successfully');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to load login page', {
                error: errorMessage,
                timeout
            });
            return false;
        }
    }

    /**
     * Login with provided credentials with comprehensive error handling
     */
    async login(username: string, password: string): Promise<boolean> {
        try {
            logger.info(`🔐 Attempting login for user: ${username ? `${username.substring(0, 1)}***` : 'empty'}`);
            
            // Ensure we're on the login page
            const onLoginPage = await this.waitForLoginPageToLoad(10000);
            if (!onLoginPage) {
                throw new Error('Not on login page or page not loaded properly');
            }

            // Clear and fill username with retry
            const usernameSuccess = await CustomWait.retryOperation(
                async () => {
                    await this.usernameInput.clear();
                    await this.usernameInput.fill(username);
                    
                    const valueSet = await CustomWait.waitForCondition(
                        this.page,
                        async () => (await this.usernameInput.inputValue()) === username,
                        5000,
                        500,
                        `Username to be set to "${username}"`
                    ).then(() => true).catch(() => false);
                    
                    if (!valueSet) {
                        throw new Error('Username value not set correctly');
                    }
                    return true;
                },
                2,
                500,
                `Fill username: ${username}`
            );

            if (!usernameSuccess) {
                throw new Error('Failed to fill username');
            }

            // Clear and fill password with retry
            const passwordSuccess = await CustomWait.retryOperation(
                async () => {
                    await this.passwordInput.clear();
                    await this.passwordInput.fill(password);
                    
                    const valueSet = await CustomWait.waitForCondition(
                        this.page,
                        async () => (await this.passwordInput.inputValue()) === password,
                        5000,
                        500,
                        'Password to be set correctly'
                    ).then(() => true).catch(() => false);
                    
                    if (!valueSet) {
                        throw new Error('Password value not set correctly');
                    }
                    return true;
                },
                2,
                500,
                'Fill password'
            );

            if (!passwordSuccess) {
                throw new Error('Failed to fill password');
            }

            // Click login button with retry
            await CustomWait.clickWithRetry(this.loginButton);
            
            // Wait for login result
            const loginResult = await this.waitForLoginResult();
            
            if (loginResult.success) {
                logger.info(`✅ Login successful for user: ${username ? `${username.substring(0, 1)}***` : 'empty'}`);
            } else {
                logger.warn(`⚠️ Login may have failed: ${loginResult.error}`);
            }
            
            return loginResult.success;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Login attempt failed', {
                error: errorMessage,
                username: username ? `${username.substring(0, 1)}***` : 'empty'
            });
            return false;
        }
    }

    /**
     * Wait for login result (success or error) with comprehensive checking
     */
    private async waitForLoginResult(): Promise<{ success: boolean; error?: string }> {
        try {
            logger.debug('⏳ Waiting for login result...');
            
            // Wait for either successful navigation or error message
            const result = await Promise.race([
                // Success case - navigated to inventory
                this.page.waitForURL(/.*inventory.html/, { timeout: 15000 })
                    .then(() => ({ success: true })),
                
                // Error case - error message appears
                CustomWait.waitForElement(this.page, '[data-test="error"]', 10000)
                    .then(async () => {
                        const errorText = await this.getErrorMessage();
                        return { success: false, error: errorText };
                    })
            ]);
            
            return result;
        } catch (error) {
            logger.warn('⚠️ Login result timeout - checking current state...');
            
            // Final state check with safe error checking
            if (await this.isLoginSuccessful()) {
                return { success: true };
            }
            
            const errorMsg = await this.getErrorMessage();
            if (errorMsg) {
                return { success: false, error: errorMsg };
            }
            
            return { 
                success: false, 
                error: 'Login timeout - neither success nor error detected' 
            };
        }
    }

    /**
     * Get error message text if present - SAFE VERSION
     */
    async getErrorMessage(): Promise<string> {
        try {
            // Check if page is closed before trying to access elements
            if (this.page.isClosed()) {
                return '';
            }
            
            const errorVisible = await this.errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
            if (errorVisible) {
                const errorText = await this.errorMessage.textContent();
                return errorText?.trim() || 'Unknown error';
            }
            return '';
        } catch (error) {
            // Don't log errors for page closure - it's expected behavior
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (!errorMessage.includes('closed')) {
                logger.debug('Could not retrieve error message', {
                    error: errorMessage
                });
            }
            return '';
        }
    }

    /**
     * Check if login was successful
     */
    async isLoginSuccessful(): Promise<boolean> {
        try {
            // Check if page is closed first
            if (this.page.isClosed()) {
                return false;
            }
            
            const currentUrl = this.page.url();
            const isInventoryPage = currentUrl.includes('/inventory.html');
            
            // Additional check for inventory elements if on inventory page
            if (isInventoryPage) {
                const inventoryVisible = await this.page.locator('.inventory_list').isVisible({ timeout: 2000 }).catch(() => false);
                return inventoryVisible;
            }
            
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Check if user is logged in - alias for isLoginSuccessful for compatibility
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            // Use the existing method you already have
            return await this.isLoginSuccessful();
        } catch {
            return false;
        }
    }

    /**
     * Check if error message is displayed - SAFE VERSION
     */
    async isErrorMessageDisplayed(): Promise<boolean> {
        try {
            // Check if page is closed first
            if (this.page.isClosed()) {
                return false;
            }
            
            return await this.errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
        } catch {
            return false;
        }
    }

    /**
     * Handle specific user types and their behaviors
     */
    async handleUserSpecificBehavior(user: UserCredentials): Promise<{ success: boolean; error?: string }> {
        try {
            logger.info(`👤 Handling user type: ${user.username}`);
            
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
                    logger.warn(`⚠️ Unknown user type: ${user.username}, treating as standard user`);
                    return await this.handleStandardUser();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`❌ Error handling user-specific behavior for ${user.username}`, {
                error: errorMessage
            });
            return { 
                success: false, 
                error: `User behavior handling failed: ${errorMessage}` 
            };
        }
    }

    /**
     * Handle standard user - normal behavior
     */
    private async handleStandardUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.info('✅ Standard user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { 
            success: false, 
            error: error || 'Unknown login error for standard user' 
        };
    }

    /**
     * Handle problem user - may have UI issues
     */
    private async handleProblemUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.warn('⚠️ Problem user logged in - may have UI issues');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { 
            success: false, 
            error: error || 'Login failed for problem user' 
        };
    }

    /**
     * Handle locked out user - should always show error
     */
    private async handleLockedOutUser(): Promise<{ success: boolean; error?: string }> {
        const error = await this.getErrorMessage();
        
        if (error && error.toLowerCase().includes('locked')) {
            logger.info('✅ Correctly detected locked out user');
            return { success: false, error };
        }
        
        if (await this.isLoginSuccessful()) {
            return { 
                success: false, 
                error: 'Locked out user was able to login - this is unexpected!' 
            };
        }
        
        return { 
            success: false, 
            error: error || 'Unexpected behavior for locked out user' 
        };
    }

    /**
     * Handle performance glitch user - may take longer to login
     */
    private async handlePerformanceGlitchUser(): Promise<{ success: boolean; error?: string }> {
        try {
            // Extra wait for performance glitch
            await CustomWait.artificialDelay(2000);
            
            if (await this.isLoginSuccessful()) {
                logger.info('✅ Performance glitch user logged in successfully');
                return { success: true };
            }
            
            const error = await this.getErrorMessage();
            if (error) {
                return { success: false, error };
            }
            
            // Additional wait and check
            await CustomWait.artificialDelay(1000);
            
            if (await this.isLoginSuccessful()) {
                logger.info('✅ Performance glitch user logged in after additional wait');
                return { success: true };
            }
            
            return { 
                success: false, 
                error: 'Login timeout for performance glitch user' 
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Error handling performance glitch user', {
                error: errorMessage
            });
            return { 
                success: false, 
                error: `Performance glitch handling failed: ${errorMessage}` 
            };
        }
    }

    /**
     * Handle error user - may encounter random errors
     */
    private async handleErrorUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.info('✅ Error user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        if (error) {
            logger.warn(`⚠️ Error user encountered expected error: ${error}`);
            return { success: false, error };
        }
        
        return { 
            success: false, 
            error: 'Unexpected behavior for error user' 
        };
    }

    /**
     * Handle visual user - for visual testing
     */
    private async handleVisualUser(): Promise<{ success: boolean; error?: string }> {
        if (await this.isLoginSuccessful()) {
            logger.info('✅ Visual user logged in successfully');
            return { success: true };
        }
        
        const error = await this.getErrorMessage();
        return { 
            success: false, 
            error: error || 'Login failed for visual user' 
        };
    }

    /**
     * Validate credentials format
     */
    validateCredentials(user: UserCredentials): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!user.username || user.username.trim() === '') {
            errors.push('Username is required');
        } else if (user.username.trim().length < 2) {
            errors.push('Username must be at least 2 characters');
        }

        if (!user.password || user.password.trim() === '') {
            errors.push('Password is required');
        } else if (user.password.trim().length < 1) {
            errors.push('Password cannot be empty');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get current login state for reporting - SAFE VERSION
     */
    async getLoginState(): Promise<{
        isLoggedIn: boolean;
        currentUrl: string;
        hasError: boolean;
        errorMessage: string;
        pageTitle: string;
    }> {
        try {
            // Use safe error checking with page closure checks
            const [isLoggedIn, currentUrl, pageTitle] = await Promise.all([
                this.isLoginSuccessful(),
                this.page.url(),
                this.page.title().catch(() => 'Unknown')
            ]);

            // Only check for errors if we're still on login page
            let hasError = false;
            let errorMessage = '';
            
            if (!isLoggedIn && currentUrl.includes('/') && !this.page.isClosed()) {
                hasError = await this.isErrorMessageDisplayed();
                errorMessage = await this.getErrorMessage();
            }

            return {
                isLoggedIn,
                currentUrl,
                hasError,
                errorMessage,
                pageTitle
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to get login state', {
                error: errorMessage
            });
            
            return {
                isLoggedIn: false,
                currentUrl: this.page.url(),
                hasError: true,
                errorMessage: 'Error retrieving login state',
                pageTitle: 'Error'
            };
        }
    }

    /**
     * Get the login page ready for screenshot
     */
    async prepareLoginPageForScreenshot(): Promise<boolean> {
        try {
            logger.debug('📸 Preparing login page for screenshot...');
            
            // Navigate to login page if not already there
            if (!this.page.url().includes('/') || await this.isLoginSuccessful()) {
                const navSuccess = await this.navigate();
                if (!navSuccess) {
                    throw new Error('Failed to navigate to login page');
                }
            }
            
            // Wait for page to load completely
            const pageLoaded = await this.waitForLoginPageToLoad();
            if (!pageLoaded) {
                throw new Error('Login page did not load properly');
            }
            
            // Clear any existing inputs
            await this.usernameInput.clear();
            await this.passwordInput.clear();
            
            // Small delay to ensure UI is stable
            await CustomWait.artificialDelay(500);
            
            logger.debug('✅ Login page prepared for screenshot');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to prepare login page for screenshot', {
                error: errorMessage
            });
            return false;
        }
    }

    /**
     * Complete login flow with user-specific handling
     */
    async completeLoginFlow(user: UserCredentials): Promise<LoginResult> {
        try {
            logger.info(`🚀 Starting complete login flow for: ${user.username}`);
            
            const validation = this.validateCredentials(user);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: `Invalid credentials: ${validation.errors.join(', ')}`
                };
            }

            // Navigate to login page
            const navSuccess = await this.navigate();
            if (!navSuccess) {
                return {
                    success: false,
                    error: 'Failed to navigate to login page'
                };
            }

            // Perform login
            const loginSuccess = await this.login(user.username, user.password);
            if (!loginSuccess) {
                const errorMsg = await this.getErrorMessage();
                return {
                    success: false,
                    error: errorMsg || 'Login failed for unknown reason'
                };
            }

            // Handle user-specific behavior
            const userBehavior = await this.handleUserSpecificBehavior(user);
            
            // Only get login state if needed and safe to do so
            let loginState = null;
            if (!this.page.isClosed()) {
                loginState = await this.getLoginState();
            }
            
            return {
                success: userBehavior.success,
                error: userBehavior.error,
                loginState
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Login flow failed for ${user.username}`, { error: errorMessage });
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Logout if user is logged in (useful for cleanup)
     */
    async logout(): Promise<boolean> {
        try {
            if (await this.isLoginSuccessful()) {
                logger.info('🚪 Logging out user...');
                
                await CustomWait.clickWithRetry(this.burgerMenu);
                await CustomWait.clickWithRetry(this.logoutButton);
                
                // Wait for redirect to login page
                const logoutSuccess = await CustomWait.waitForCondition(
                    this.page,
                    async () => this.page.url().includes('/') && !(await this.isLoginSuccessful()),
                    10000,
                    500,
                    'Logout to complete'
                ).then(() => true).catch(() => false);

                if (logoutSuccess) {
                    logger.info('✅ User logged out successfully');
                    return true;
                } else {
                    logger.warn('⚠️ Logout may not have completed fully');
                    return false;
                }
            } else {
                logger.debug('ℹ️ User is not logged in, no logout needed');
                return true;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to logout', {
                error: errorMessage
            });
            return false;
        }
    }

    /**
     * Reset app state (useful for cleanup between tests)
     */
    async resetAppState(): Promise<boolean> {
        try {
            if (await this.isLoginSuccessful()) {
                logger.info('🔄 Resetting app state...');
                
                await this.page.goto('/inventory.html', { waitUntil: 'networkidle' });
                await CustomWait.clickWithRetry(this.burgerMenu);
                await CustomWait.clickWithRetry(this.resetButton);
                
                // Small delay for reset to take effect
                await CustomWait.artificialDelay(1000);
                
                // Close menu
                await this.page.keyboard.press('Escape');
                
                logger.info('✅ App state reset successfully');
                return true;
            } else {
                logger.debug('ℹ️ Not logged in, no app state reset needed');
                return true;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to reset app state', {
                error: errorMessage
            });
            return false;
        }
    }

    /**
     * Get comprehensive page status for debugging - SAFE VERSION
     */
    async getPageStatus(): Promise<{
        isOnLoginPage: boolean;
        isLoggedIn: boolean;
        hasError: boolean;
        errorMessage: string;
        url: string;
        pageTitle: string;
        elementsLoaded: boolean;
    }> {
        try {
            // Check page closure first
            if (this.page.isClosed()) {
                return {
                    isOnLoginPage: false,
                    isLoggedIn: false,
                    hasError: false,
                    errorMessage: 'Page closed',
                    url: 'closed',
                    pageTitle: 'Closed',
                    elementsLoaded: false
                };
            }

            const [isLoggedIn, url, pageTitle] = await Promise.all([
                this.isLoginSuccessful(),
                this.page.url(),
                this.page.title().catch(() => 'Unknown')
            ]);

            const isOnLoginPage = url.includes('/') && !isLoggedIn;

            // Only check for errors and elements if safe to do so
            let hasError = false;
            let errorMessage = '';
            let elementsLoaded = false;

            if (isOnLoginPage && !this.page.isClosed()) {
                [hasError, errorMessage, elementsLoaded] = await Promise.all([
                    this.isErrorMessageDisplayed(),
                    this.getErrorMessage(),
                    this.waitForLoginPageToLoad(5000).catch(() => false)
                ]);
            } else {
                elementsLoaded = true; // Assume loaded if not on login page
            }

            return {
                isOnLoginPage,
                isLoggedIn,
                hasError,
                errorMessage,
                url,
                pageTitle,
                elementsLoaded
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to get page status', {
                error: errorMessage
            });
            
            return {
                isOnLoginPage: false,
                isLoggedIn: false,
                hasError: true,
                errorMessage: 'Error retrieving page status',
                url: this.page.isClosed() ? 'closed' : this.page.url(),
                pageTitle: 'Error',
                elementsLoaded: false
            };
        }
    }

    /**
     * Alternative method using instance methods for consistency with other pages
     */
    async waitForLoginPageToLoadInstance(timeout: number = 15000): Promise<boolean> {
        try {
            logger.debug('🔄 Waiting for login page to load (instance method)...');
            
            // Use instance methods for consistency with other page objects
            await this.customWait.waitForElementInstance('[data-test="username"]', timeout);
            await this.customWait.waitForElementInstance('[data-test="password"]', timeout);
            await this.customWait.waitForElementInstance('[data-test="login-button"]', timeout);
            
            // ✅ FIXED: Use CustomWait static method instead of instance method
            const elementsReady = await CustomWait.waitForCondition(
                this.page,
                async () => {
                    const [usernameEnabled, passwordEnabled, loginEnabled] = await Promise.all([
                        this.usernameInput.isEnabled().catch(() => false),
                        this.passwordInput.isEnabled().catch(() => false),
                        this.loginButton.isEnabled().catch(() => false)
                    ]);
                    return usernameEnabled && passwordEnabled && loginEnabled;
                },
                10000,
                500,
                'Login page elements to be enabled'
            ).then(() => true).catch(() => false);

            if (!elementsReady) {
                throw new Error('Login page elements did not become enabled within timeout');
            }
            
            // Wait for network to be idle using instance method
            await this.customWait.waitForNetworkIdleInstance(5000);
            
            logger.debug('✅ Login page loaded successfully (instance method)');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('❌ Failed to load login page (instance method)', {
                error: errorMessage,
                timeout
            });
            return false;
        }
    }

    /**
     * Helper method to wait for condition using instance pattern
     */
    private async waitForConditionInstance(
        condition: () => Promise<boolean>,
        timeout: number = 10000,
        pollInterval: number = 500,
        description: string = 'Condition'
    ): Promise<boolean> {
        try {
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                if (await condition()) {
                    logger.debug(`✅ Condition met: ${description}`);
                    return true;
                }
                await this.customWait.artificialDelayInstance(pollInterval);
            }
            
            logger.error(`❌ Condition not met within ${timeout}ms: ${description}`);
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`❌ Error waiting for condition: ${description}`, {
                error: errorMessage
            });
            return false;
        }
    }
}