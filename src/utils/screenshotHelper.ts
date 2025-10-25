import { Page, TestInfo } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export class ScreenshotHelper {
  private screenshots: Array<{filename: string, stepName: string, timestamp: Date}> = [];
  private screenshotCounter = 1;
  private isCI: boolean;

  constructor(
    private page: Page,
    private testName: string,
    private testInfo?: TestInfo,
    private testFile?: string
  ) {
    this.testName = this.sanitizeFilename(testName);
    
    // ✅ CRITICAL: Detect CI environment
    this.isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS;
    
    // ✅ CRITICAL: Auto-detect test file for better organization
    if (!this.testFile) {
      this.testFile = this.determineTestFileFromName(testName);
      logger.info(`🔍 Auto-detected test file: ${this.testFile} for test: ${this.testName} (CI: ${this.isCI})`);
    }

    logger.info(`🏭 ScreenshotHelper initialized - CI: ${this.isCI}, Test: ${this.testName}`);
  }

  /**
   * ✅ COMPATIBLE: Enhanced test file detection for both local and CI
   */
  private determineTestFileFromName(testName: string): string {
    const nameLower = testName.toLowerCase();
    
    // Video tests detection
    if (nameLower.includes('video') || 
        nameLower.includes('complete') || 
        nameLower.includes('ui_issues') || 
        nameLower.includes('error handling') ||
        nameLower.includes('broken images') ||
        nameLower.includes('standard_user') ||
        nameLower.includes('problem_user') ||
        nameLower.includes('error_user') ||
        nameLower.includes('locked_out_user') ||
        nameLower.includes('performance_glitch_user') ||
        nameLower.includes('visual_user')) {
      return 'video-tests.spec.ts';
    } 
    // Purchase tests detection
    else if (nameLower.includes('purchase') || 
             nameLower.includes('checkout') ||
             nameLower.includes('purchaseflow') ||
             nameLower.includes('order') ||
             nameLower.includes('cart')) {
      return 'purchaseFlow.spec.ts';
    }
    
    return 'general-tests.spec.ts';
  }

  /**
   * Sanitize filename by removing invalid characters
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 60);
  }

  /**
   * ✅ COMPATIBLE: Enhanced directory creation for CI environments
   */
  private ensureScreenshotsDirectory(): string {
    const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
    
    try {
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
        logger.info(`📁 Created screenshots directory: ${screenshotsDir}`);
      }
      return screenshotsDir;
    } catch (error) {
      // ✅ CRITICAL: Fallback for CI environments
      if (this.isCI) {
        const ciFallbackDir = '/tmp/playwright-screenshots';
        if (!fs.existsSync(ciFallbackDir)) {
          fs.mkdirSync(ciFallbackDir, { recursive: true });
        }
        logger.info(`🔧 Using CI fallback directory: ${ciFallbackDir}`);
        return ciFallbackDir;
      }
      throw error;
    }
  }

  /**
   * ✅ COMPATIBLE: CI-optimized filename generation
   */
  private generateFilename(stepName: string): { filename: string; filePath: string } {
    const screenshotsDir = this.ensureScreenshotsDirectory();
    const counter = this.screenshotCounter.toString().padStart(2, '0');
    const sanitizedStepName = this.sanitizeFilename(stepName);
    
    const username = this.extractUsername(this.testName);
    const context = this.determineScreenshotContext();
    
    // ✅ CRITICAL: Shorter filenames for CI compatibility
    const filename = this.isCI 
      ? `${username}_${counter}.png`  // Shorter for CI
      : `${username}_${context}_${counter}-${sanitizedStepName}.png`; // Detailed for local
    
    const filePath = path.join(screenshotsDir, filename);
    
    logger.debug(`📄 Generated filename: ${filename} (CI: ${this.isCI})`);
    
    return { filename, filePath };
  }

  /**
   * ✅ FIXED: Enhanced username extraction with exact matching
   */
  private extractUsername(testName: string): string {
    const usernames = [
        'standard_user', 'locked_out_user', 'problem_user', 
        'error_user', 'visual_user', 'performance_glitch_user'
    ];
    
    // Convert test name to lowercase for case-insensitive matching
    const testNameLower = testName.toLowerCase();
    
    console.log(`🔍 Username detection for: "${testName}"`);
    console.log(`🔍 Lowercase version: "${testNameLower}"`);
    
    // Try exact username matching first
    for (const username of usernames) {
        if (testNameLower.includes(username)) {
            console.log(`✅ Exact match found: ${username}`);
            return username;
        }
    }
    
    // Try partial matching for different naming patterns
    for (const username of usernames) {
        const usernameWithoutUnderscore = username.replace(/_/g, '');
        if (testNameLower.includes(usernameWithoutUnderscore)) {
            console.log(`✅ Partial match (no underscore): ${usernameWithoutUnderscore} -> ${username}`);
            return username;
        }
    }
    
    // Try matching base names
    const baseNames = ['standard', 'locked', 'problem', 'error', 'visual', 'performance'];
    for (const baseName of baseNames) {
        if (testNameLower.includes(baseName)) {
            const fullUsername = usernames.find(u => u.includes(baseName));
            if (fullUsername) {
                console.log(`✅ Base name match: ${baseName} -> ${fullUsername}`);
                return fullUsername;
            }
        }
    }
    
    // Final fallback with better logging
    console.log(`❌ Could not detect username from test: "${testName}"`);
    console.log(`🔍 Available usernames: ${usernames.join(', ')}`);
    console.log(`🔍 Test name analysis: ${testNameLower}`);
    
    logger.warn(`⚠️ Could not detect username from test: "${testName}". Using 'unknown_user'`);
    return 'unknown_user';
  }

  /**
   * Enhanced context determination
   */
  private determineScreenshotContext(): string {
    if (!this.testFile) {
      logger.warn('⚠️ No test file provided, using default context');
      return 'general';
    }
    
    const fileLower = this.testFile.toLowerCase();
    const testNameLower = this.testName.toLowerCase();
    
    if (fileLower.includes('video')) {
      if (testNameLower.includes('standard_user') || testNameLower.includes('complete')) {
        return 'complete';
      }
      if (testNameLower.includes('problem_user') || testNameLower.includes('ui_issues')) {
        return 'ui_issues';
      }
      if (testNameLower.includes('error_user') || testNameLower.includes('error handling')) {
        return 'ui_issues';
      }
      if (testNameLower.includes('locked_out_user') || testNameLower.includes('locked')) {
        return 'error';
      }
      if (testNameLower.includes('broken images') || testNameLower.includes('images')) {
        return 'images';
      }
      return 'video';
    } 
    else if (fileLower.includes('purchaseflow') || fileLower.includes('purchase')) {
      return 'purchase';
    }
    
    logger.debug(`🔍 Using general context for test file: ${this.testFile}`);
    return 'general';
  }

  /**
   * ✅ COMPATIBLE: Dual-mode screenshot taking for Local vs CI
   */
  async takeScreenshot(stepName: string): Promise<string> {
    if (this.isCI) {
      return await this.takeScreenshotCI(stepName);
    } else {
      return await this.takeScreenshotLocal(stepName);
    }
  }

  /**
   * ✅ COMPATIBLE: Local-optimized screenshot with full features
   */
  private async takeScreenshotLocal(stepName: string): Promise<string> {
    const { filename, filePath } = this.generateFilename(stepName);

    try {
      logger.info(`📸 [LOCAL] Taking screenshot: ${filename} for step: ${stepName}`);

      await this.page.screenshot({ 
        path: filePath,
        fullPage: true,
        timeout: 15000,
        animations: 'disabled'
      });

      // Attach to HTML report if available
      if (this.testInfo) {
        await this.testInfo.attach(`Screenshot: ${stepName}`, {
          path: filePath,
          contentType: 'image/png'
        });
        logger.debug(`✅ Screenshot attached to test report: ${stepName}`);
      }

      this.screenshots.push({ 
        filename, 
        stepName, 
        timestamp: new Date() 
      });
      this.screenshotCounter++;

      logger.info(`✅ [LOCAL] Screenshot completed: ${filename}`);
      return filename;

    } catch (error) {
      const errorMessage = `Local screenshot failed for ${stepName}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMessage);
      return this.handleScreenshotError(stepName, errorMessage);
    }
  }

  /**
   * ✅ COMPATIBLE: CI-optimized screenshot with reduced features
   */
  private async takeScreenshotCI(stepName: string): Promise<string> {
    const { filename, filePath } = this.generateFilename(stepName);

    try {
      logger.info(`📸 [CI] Taking screenshot: ${filename} for step: ${stepName}`);

      // ✅ CRITICAL: CI-optimized screenshot settings
      await this.page.screenshot({ 
        path: filePath,
        fullPage: false, // Don't use fullPage in CI (causes issues)
        timeout: 10000,  // Shorter timeout for CI
        type: 'jpeg',    // Smaller file size
        quality: 80      // Good quality but smaller
      });

      // ✅ CRITICAL: CI-compatible attachment
      if (this.testInfo) {
        try {
          await this.testInfo.attach(`Screenshot: ${stepName}`, {
            path: filePath,
            contentType: 'image/jpeg'
          });
        } catch (attachError) {
          logger.debug(`⚠️ Could not attach screenshot in CI: ${attachError}`);
        }
      }

      this.screenshots.push({ 
        filename, 
        stepName, 
        timestamp: new Date() 
      });
      this.screenshotCounter++;

      logger.info(`✅ [CI] Screenshot completed: ${filename}`);
      return filename;

    } catch (error) {
      const errorMessage = `CI screenshot failed for ${stepName}: ${error instanceof Error ? error.message : String(error)}`;
      logger.warn(`⚠️ ${errorMessage}`);
      
      // ✅ CRITICAL: In CI, don't throw errors - just return empty filename
      return '';
    }
  }

  /**
   * ✅ COMPATIBLE: Enhanced error handling for both environments
   */
  private async handleScreenshotError(stepName: string, errorMessage: string): Promise<string> {
    // Enhanced error attachment
    if (this.testInfo) {
      await this.testInfo.attach(`SCREENSHOT_ERROR_${stepName}`, {
        body: errorMessage,
        contentType: 'text/plain'
      });
    }
    
    // Try to take a fallback screenshot
    try {
      const fallbackFilename = `ERROR_${Date.now()}.png`;
      const fallbackPath = path.join(this.ensureScreenshotsDirectory(), fallbackFilename);
      
      // ✅ CRITICAL: Ultra-simple fallback for maximum compatibility
      await this.page.screenshot({ 
        path: fallbackPath, 
        fullPage: false,
        timeout: 5000 
      });
      
      logger.info(`🔄 Fallback screenshot saved: ${fallbackFilename}`);
      return fallbackFilename;
    } catch (fallbackError) {
      logger.error(`❌ Even fallback screenshot failed: ${fallbackError}`);
      
      // ✅ CRITICAL: In CI, return empty string instead of throwing
      if (this.isCI) {
        return '';
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Take screenshot at major steps with enhanced logging
   */
  async takeMajorStepScreenshot(stepName: string): Promise<string> {
    logger.info(`🎯 Taking major step screenshot: ${stepName}`);
    return await this.takeScreenshot(`MAJOR_${stepName}`);
  }

  /**
   * Take screenshot only if condition is true with detailed logging
   */
  async takeScreenshotConditional(stepName: string, condition: boolean): Promise<string | null> {
    if (condition) {
      logger.info(`✅ Condition met, taking screenshot: ${stepName}`);
      return await this.takeScreenshot(`CONDITIONAL_${stepName}`);
    }
    logger.debug(`⏭️ Screenshot skipped (condition false): ${stepName}`);
    return null;
  }

  /**
   * Take screenshot before an action
   */
  async takeScreenshotBefore(actionName: string): Promise<string> {
    logger.debug(`⬅️ Taking screenshot before: ${actionName}`);
    return await this.takeScreenshot(`BEFORE_${actionName}`);
  }

  /**
   * Take screenshot after an action
   */
  async takeScreenshotAfter(actionName: string): Promise<string> {
    logger.debug(`➡️ Taking screenshot after: ${actionName}`);
    return await this.takeScreenshot(`AFTER_${actionName}`);
  }

  /**
   * ✅ COMPATIBLE: CI-compatible element screenshot
   */
  async takeElementScreenshot(selector: string, stepName: string): Promise<string> {
    // ✅ CRITICAL: Skip element screenshots in CI (too flaky)
    if (this.isCI) {
      logger.debug(`⏭️ Skipping element screenshot in CI: ${selector}`);
      return await this.takeScreenshot(`ELEMENT_FALLBACK_${stepName}`);
    }

    try {
      const { filename, filePath } = this.generateFilename(`ELEMENT_${stepName}`);

      logger.info(`🎯 Taking element screenshot: ${selector} for step: ${stepName}`);

      // Wait for element to be visible first
      await this.page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });

      await this.page.locator(selector).screenshot({
        path: filePath,
        timeout: 10000
      });

      if (this.testInfo) {
        await this.testInfo.attach(`Element: ${stepName}`, {
          path: filePath,
          contentType: 'image/png'
        });
      }

      this.screenshots.push({ 
        filename, 
        stepName: `element_${stepName}`, 
        timestamp: new Date() 
      });
      this.screenshotCounter++;

      logger.info(`✅ Element screenshot completed: ${filename}`);
      return filename;

    } catch (error) {
      logger.error(`❌ Element screenshot failed for ${selector}: ${error}`);
      return await this.takeScreenshot(`ELEMENT_FALLBACK_${stepName}`);
    }
  }

  /**
   * Enhanced failure screenshot with comprehensive error context
   */
  async takeFailureScreenshot(errorMessage: string): Promise<string> {
    logger.error(`💥 Taking failure screenshot: ${errorMessage}`);
    return await this.takeScreenshot(`FAILURE_${this.sanitizeFilename(errorMessage.substring(0, 50))}`);
  }

  /**
   * ✅ CRITICAL COMPATIBILITY: Main method that returns string[] for resultsCollector
   * Used by ALL your test files
   */
  getScreenshotFilenames(): string[] {
    const filenames = this.screenshots.map(s => s.filename);
    logger.debug(`📊 Returning ${filenames.length} screenshot filenames to resultsCollector`);
    return filenames;
  }

  /**
   * ✅ CRITICAL COMPATIBILITY: Backward compatibility - ensures 100% compatibility
   * Some test files might call this method expecting string[]
   */
  getScreenshotsTaken(): string[] {
    logger.warn('⚠️ getScreenshotsTaken() called - returning filenames array for resultsCollector compatibility');
    return this.getScreenshotFilenames();
  }

  /**
   * ✅ ENHANCED: Filter out empty filenames (CI fallbacks)
   */
  getValidScreenshotFilenames(): string[] {
    const validFilenames = this.screenshots
      .map(s => s.filename)
      .filter(filename => filename && filename.length > 0);
    
    if (validFilenames.length !== this.screenshots.length) {
      logger.warn(`⚠️ Filtered out ${this.screenshots.length - validFilenames.length} empty screenshot filenames`);
    }
    
    return validFilenames;
  }

  /**
   * Clear all stored screenshot references
   */
  clearScreenshots(): void {
    const previousCount = this.screenshots.length;
    this.screenshots = [];
    this.screenshotCounter = 1;
    logger.debug(`🧹 Cleared ${previousCount} screenshot references`);
  }

  /**
   * Get the number of screenshots taken
   */
  getScreenshotCount(): number {
    return this.screenshots.length;
  }

  /**
   * Get the directory where screenshots are stored
   */
  getScreenshotsDirectory(): string {
    if (this.isCI && process.platform === 'linux') {
      return '/tmp/playwright-screenshots'; // CI fallback directory
    }
    return path.join(process.cwd(), 'test-results', 'screenshots');
  }

  /**
   * Get full path for a specific screenshot
   */
  getScreenshotPath(filename: string): string {
    return path.join(this.getScreenshotsDirectory(), filename);
  }

  /**
   * Get all screenshot attachments for the current test
   */
  getScreenshotAttachments(): Array<{name: string, path?: string}> {
    if (!this.testInfo) return [];
    
    return this.testInfo.attachments
      .filter(attachment => attachment.contentType?.includes('image'))
      .map(attachment => ({
        name: attachment.name || 'unknown',
        path: attachment.path
      }));
  }

  /**
   * Check if test has screenshot attachments
   */
  hasScreenshotAttachments(): boolean {
    if (!this.testInfo) return false;
    return this.testInfo.attachments.some(attachment => 
      attachment.contentType?.includes('image')
    );
  }

  /**
   * Enhanced screenshot report generation
   */
  generateScreenshotReport(): string {
    const report = {
      testName: this.testName,
      testFile: this.testFile,
      environment: this.isCI ? 'ci' : 'local',
      totalScreenshots: this.screenshots.length,
      context: this.determineScreenshotContext(),
      username: this.extractUsername(this.testName),
      generatedAt: new Date().toISOString(),
      screenshots: this.screenshots.map(s => ({
        step: s.stepName,
        file: s.filename,
        time: s.timestamp.toISOString(),
        fullPath: this.getScreenshotPath(s.filename)
      }))
    };
    
    logger.info(`📊 Generated screenshot report with ${this.screenshots.length} screenshots (CI: ${this.isCI})`);
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Enhanced screenshot validation with CI compatibility
   */
  validateScreenshotsExist(): { missing: string[]; valid: string[]; totalSize: number } {
    const missing: string[] = [];
    const valid: string[] = [];
    let totalSize = 0;

    this.screenshots.forEach(screenshot => {
      // ✅ CRITICAL: Skip validation for empty CI fallback filenames
      if (!screenshot.filename) {
        return;
      }

      const fullPath = this.getScreenshotPath(screenshot.filename);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
          valid.push(screenshot.filename);
        } catch (error) {
          logger.warn(`⚠️ Could not read file stats for ${screenshot.filename}: ${error}`);
          valid.push(screenshot.filename);
        }
      } else {
        missing.push(screenshot.filename);
      }
    });

    if (missing.length > 0) {
      logger.warn(`⚠️ Missing ${missing.length} screenshot files in ${this.isCI ? 'CI' : 'local'}`);
    } else {
      logger.info(`✅ All ${valid.length} screenshot files exist (CI: ${this.isCI}, Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    return { missing, valid, totalSize };
  }

  /**
   * Get screenshot statistics
   */
  getScreenshotStats(): { total: number; averageSize: number; steps: string[] } {
    const stats = {
      total: this.screenshots.length,
      averageSize: 0,
      steps: this.screenshots.map(s => s.stepName)
    };

    if (this.screenshots.length > 0) {
      const validation = this.validateScreenshotsExist();
      stats.averageSize = validation.totalSize / this.screenshots.length;
    }

    return stats;
  }

  /**
   * Export screenshot data for external reporting
   */
  exportScreenshotData(): any {
    return {
      metadata: {
        testName: this.testName,
        testFile: this.testFile,
        environment: this.isCI ? 'ci' : 'local',
        username: this.extractUsername(this.testName),
        context: this.determineScreenshotContext(),
        totalScreenshots: this.screenshots.length,
        generatedAt: new Date().toISOString()
      },
      screenshots: this.screenshots.map(s => ({
        filename: s.filename,
        stepName: s.stepName,
        timestamp: s.timestamp.toISOString(),
        filePath: this.getScreenshotPath(s.filename),
        exists: s.filename ? fs.existsSync(this.getScreenshotPath(s.filename)) : false
      }))
    };
  }

  /**
   * ✅ NEW: Check if running in CI environment
   */
  isRunningInCI(): boolean {
    return this.isCI;
  }

  /**
   * ✅ NEW: Get environment information
   */
  getEnvironmentInfo(): { isCI: boolean; platform: string; testFile: string } {
    return {
      isCI: this.isCI,
      platform: process.platform,
      testFile: this.testFile || 'unknown'
    };
  }
}