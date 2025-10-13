import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export class ScreenshotHelper {
  private screenshots: string[] = [];
  private screenshotCounter = 1;

  constructor(
    private page: Page,
    private testName: string
  ) {}

  async takeScreenshot(stepName: string): Promise<string> {
    try {
      // Screenshots are stored in test-results/screenshots directory
      const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
        logger.info(`Created screenshots directory: ${screenshotsDir}`);
      }

      const timestamp = Date.now();
      const filename = `${this.testName}_${stepName}_${timestamp}.png`;
      const filePath = path.join(screenshotsDir, filename);

      await this.page.screenshot({ 
        path: filePath,
        fullPage: true 
      });

      // Store only the filename for HTML report
      this.screenshots.push(filename);
      this.screenshotCounter++;

      logger.info(`Screenshot saved: ${filename}`);
      return filename; // ✅ Return the filename for confirmation
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
      throw error; // ✅ Re-throw to handle in test
    }
  }

  getScreenshotsTaken(): string[] {
    return [...this.screenshots]; // ✅ Return copy to prevent mutation
  }

  clearScreenshots(): void {
    this.screenshots = [];
    this.screenshotCounter = 1;
  }

  // ✅ New method to get screenshot count for debugging
  getScreenshotCount(): number {
    return this.screenshots.length;
  }
}