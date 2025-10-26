// src/utils/testRunner.ts
import fs from 'fs';
import path from 'path';
import { Reporter } from '@playwright/test/reporter';
import { logger } from './logger';

export interface TestResult {
  testName: string;
  username: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: Date;
  errorMessage?: string;
  screenshots: string[];
  testFile: string;
  browser?: string;
}

class TestRunner implements Reporter {
  private testResults: TestResult[] = [];
  private reportsDir = path.join(process.cwd(), 'test-results', 'reports');
  private logsDir = path.join(process.cwd(), 'test-results', 'logs');
  private screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
  private startTime: Date = new Date();

  constructor() {
    this.ensureDirectories();
    console.log('🚀 TestRunner initialized as Playwright Reporter');
  }

  private ensureDirectories(): void {
    try {
      const directories = [
        this.reportsDir,
        this.logsDir,
        this.screenshotsDir,
        path.join(process.cwd(), 'playwright-report')
      ];

      directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      });

      // Initialize log files
      this.initializeLogFiles();
      
    } catch (error) {
      console.error('❌ TestRunner: Failed to create directories:', error);
    }
  }

  private initializeLogFiles(): void {
    const logFiles = [
      { name: 'debug.log', content: `Debug Log Started: ${new Date().toISOString()}\n` },
      { name: 'errors.log', content: `Errors Log Started: ${new Date().toISOString()}\n` },
      { name: 'test-execution.log', content: `Test Execution Log Started: ${new Date().toISOString()}\n` }
    ];

    logFiles.forEach(logFile => {
      const logPath = path.join(this.logsDir, logFile.name);
      if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, logFile.content);
        console.log(`📝 Initialized log file: ${logFile.name}`);
      }
    });
  }

  private logToFile(filename: string, message: string): void {
    try {
      const logPath = path.join(this.logsDir, filename);
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
    } catch (error) {
      console.error('❌ Failed to write to log file:', error);
    }
  }

  // ✅ Playwright Reporter Methods
  onBegin(config: any, suite: any) {
    console.log(`🚀 Starting test run with ${suite.allTests().length} tests`);
    this.logToFile('test-execution.log', `Test run started: ${new Date().toISOString()}`);
    this.logToFile('test-execution.log', `Total tests: ${suite.allTests().length}`);
    
    logger.info('Test run started', {
      totalTests: suite.allTests().length,
      timestamp: this.startTime.toISOString()
    });
  }

  onTestBegin(test: any) {
    console.log(`▶️ Starting test: ${test.title}`);
    this.logToFile('test-execution.log', `Test started: ${test.title}`);
  }

  onTestEnd(test: any, result: any) {
    try {
      // ✅ FIXED: Extract username from test title with all user types
      const username = this.extractUsername(test.title) || 'standard_user';
      
      // Extract browser from project name
      const browser = test.parent?.project()?.name || 'chromium';
      
      // Get screenshots from attachments
      const screenshots = result.attachments
        ?.filter((att: any) => att.contentType === 'image/png')
        .map((att: any) => att.path || att.name) || [];

      const testResult: TestResult = {
        testName: test.title,
        username: username,
        status: result.status,
        duration: result.duration,
        timestamp: new Date(),
        testFile: test.location?.file || 'unknown',
        errorMessage: result.error?.message || result.errors?.[0]?.message,
        screenshots: screenshots,
        browser: browser
      };

      this.addTestResult(testResult);
      
    } catch (error) {
      console.error('❌ Error processing test end:', error);
      this.logToFile('errors.log', `Test end processing error: ${error}`);
    }
  }

  onEnd(result: any) {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();
    
    console.log(`🎯 Test run completed: ${result.status}`);
    console.log(`⏱️ Total duration: ${Math.round(totalDuration / 1000)}s`);
    
    this.logToFile('test-execution.log', `Test run completed: ${result.status} at ${endTime.toISOString()}`);
    this.logToFile('test-execution.log', `Total duration: ${Math.round(totalDuration / 1000)}s`);

    // Generate all reports
    this.generateAllReports();

    logger.info('Test run completed', {
      status: result.status,
      totalTests: this.testResults.length,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalDuration: `${Math.round(totalDuration / 1000)}s`
    });
  }

  // ✅ Helper methods
  private extractUsername(testTitle: string): string | null {
    // ✅ FIXED: Added visual_user to the regex pattern
    const usernameMatch = testTitle.match(/(standard_user|locked_out_user|problem_user|error_user|performance_glitch_user|visual_user)/i);
    return usernameMatch ? usernameMatch[1] : null;
  }

  // ✅ Method to clear results for new test run
  clearResults(): void {
    const previousCount = this.testResults.length;
    this.testResults = [];
    console.log(`🧹 TestRunner: Cleared ${previousCount} previous test results for new run`);
    
    this.logToFile('test-execution.log', `Cleared ${previousCount} previous test results`);
    
    logger.info('TestRunner cleared for new test run', {
      previousResults: previousCount,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Method to get current status
  getStatus(): { totalResults: number; reportsDir: string; logsDir: string } {
    return {
      totalResults: this.testResults.length,
      reportsDir: this.reportsDir,
      logsDir: this.logsDir
    };
  }

  addTestResult(result: TestResult): void {
    try {
      console.log('📊 TestRunner: Adding test result', {
        testName: result.testName,
        status: result.status,
        username: result.username,
        duration: result.duration
      });

      this.testResults.push(result);
      
      // Log the test result
      this.logToFile('test-execution.log', 
        `Test: ${result.testName} | Status: ${result.status} | User: ${result.username} | Duration: ${result.duration}ms | File: ${result.testFile}`
      );

      console.log(`✅ TestRunner: Total results: ${this.testResults.length}`);
      
    } catch (error) {
      console.error('❌ TestRunner: Failed to add test result:', error);
      this.logToFile('errors.log', `Failed to add test result: ${error}`);
      
      logger.error('Failed to add test result', {
        testName: result.testName,
        username: result.username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  generateHTMLReport(): string {
    try {
      if (this.testResults.length === 0) {
        console.warn('⚠️ TestRunner: No test results available for HTML report');
        this.logToFile('debug.log', 'No test results available for HTML report generation');
        return '';
      }

      console.log('🔄 TestRunner: Generating HTML report...');
      this.logToFile('debug.log', 'Starting HTML report generation');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const htmlReportPath = path.join(this.reportsDir, `test-report-${timestamp}.html`);
      
      const htmlContent = this.generateHTMLContent();
      fs.writeFileSync(htmlReportPath, htmlContent, 'utf8');
      
      console.log('✅ TestRunner: HTML report generated successfully', {
        path: htmlReportPath,
        totalTests: this.testResults.length
      });

      this.logToFile('test-execution.log', 
        `HTML report generated: ${htmlReportPath} with ${this.testResults.length} tests`
      );
      
      return htmlReportPath;
    } catch (error) {
      console.error('❌ TestRunner: Failed to generate HTML report:', error);
      this.logToFile('errors.log', `HTML report generation failed: ${error}`);
      return '';
    }
  }

  generateJSONReport(): string {
    try {
      if (this.testResults.length === 0) {
        console.warn('⚠️ TestRunner: No test results available for JSON report');
        this.logToFile('debug.log', 'No test results available for JSON report generation');
        return '';
      }

      console.log('🔄 TestRunner: Generating JSON report...');
      this.logToFile('debug.log', 'Starting JSON report generation');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonReportPath = path.join(this.reportsDir, `test-report-${timestamp}.json`);
      
      const reportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalTests: this.testResults.length,
          environment: process.env.NODE_ENV || 'development',
          reportType: 'custom-test-runner',
          ci: !!process.env.CI,
          status: this.getSummary()
        },
        summary: {
          ...this.getSummary(),
          uniqueUsernames: [...new Set(this.testResults.map(r => r.username))]
        },
        testResults: this.testResults
      };
      
      fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2), 'utf8');
      
      console.log('✅ TestRunner: JSON report generated successfully', {
        path: jsonReportPath,
        totalTests: this.testResults.length
      });

      this.logToFile('test-execution.log', 
        `JSON report generated: ${jsonReportPath} with ${this.testResults.length} tests`
      );
      
      return jsonReportPath;
    } catch (error) {
      console.error('❌ TestRunner: Failed to generate JSON report:', error);
      this.logToFile('errors.log', `JSON report generation failed: ${error}`);
      return '';
    }
  }

  generateAllReports(): { htmlReportPath: string; jsonReportPath: string } {
    try {
      console.log('🚀 TestRunner: Generating all reports...');
      console.log(`📊 Current test results: ${this.testResults.length}`);
      
      this.logToFile('debug.log', 
        `Starting generation of all reports with ${this.testResults.length} test results`
      );

      if (this.testResults.length === 0) {
        console.warn('⚠️ TestRunner: No test results available for report generation');
        this.logToFile('debug.log', 'No test results available for report generation');
        return { htmlReportPath: '', jsonReportPath: '' };
      }

      const htmlReportPath = this.generateHTMLReport();
      const jsonReportPath = this.generateJSONReport();

      if (htmlReportPath && jsonReportPath) {
        console.log('🎉 TestRunner: All reports generated successfully', {
          htmlReport: htmlReportPath,
          jsonReport: jsonReportPath,
          totalTests: this.testResults.length
        });

        this.logToFile('test-execution.log', 
          `All reports generated successfully - HTML: ${htmlReportPath}, JSON: ${jsonReportPath}`
        );

        // Log directory structure
        this.logDirectoryStructure();

        logger.info('Test reports generated successfully', {
          htmlReport: htmlReportPath,
          jsonReport: jsonReportPath,
          totalTests: this.testResults.length
        });
      } else {
        console.error('❌ TestRunner: Some reports failed to generate');
        this.logToFile('errors.log', 'Some reports failed to generate');
      }

      return { htmlReportPath, jsonReportPath };
    } catch (error) {
      console.error('❌ TestRunner: Failed to generate all reports:', error);
      this.logToFile('errors.log', `Failed to generate all reports: ${error}`);
      return { htmlReportPath: '', jsonReportPath: '' };
    }
  }

  private logDirectoryStructure(): void {
    const structure = `
📁 Final Test Results Directory Structure:
test-results/
├── reports/                       # ✅ HTML and JSON reports
│   ├── test-report-*.html
│   └── test-report-*.json
├── logs/                          # Winston logs
│   ├── debug.log
│   ├── errors.log
│   └── test-execution.log
├── screenshots/                   # Manual screenshots
│   └── *.png
├── *-video-*/                     # Video recordings
│   └── video.webm
└── test-results.json              # Playwright JSON results

playwright-report/                 # ✅ Playwright HTML reports
├── data/
├── index.html
└── trace/
    `;
    
    console.log(structure);
    this.logToFile('debug.log', 'Directory structure created successfully');
  }

  private generateHTMLContent(): string {
    const summary = this.getSummary();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Test Execution Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
        .header h1 { color: #333; margin-bottom: 10px; font-size: 2.5em; }
        .header p { color: #666; font-size: 1.1em; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.08); transition: transform 0.3s ease; }
        .summary-card:hover { transform: translateY(-5px); }
        .summary-card.total { border-top: 5px solid #3498db; }
        .summary-card.passed { border-top: 5px solid #27ae60; }
        .summary-card.failed { border-top: 5px solid #e74c3c; }
        .summary-card.skipped { border-top: 5px solid #f39c12; }
        .summary-card.rate { border-top: 5px solid #9b59b6; }
        .summary-card h3 { color: #555; margin-bottom: 10px; font-size: 1em; text-transform: uppercase; letter-spacing: 1px; }
        .summary-card .number { font-size: 2.2em; font-weight: bold; margin: 10px 0; }
        .total .number { color: #3498db; }
        .passed .number { color: #27ae60; }
        .failed .number { color: #e74c3c; }
        .skipped .number { color: #f39c12; }
        .rate .number { color: #9b59b6; }
        .test-results { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .test-results h2 { color: #333; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #eee; }
        .test-card { border-left: 5px solid #ddd; margin-bottom: 20px; padding: 20px; background: #fafafa; border-radius: 8px; transition: all 0.3s ease; }
        .test-card:hover { background: #f8f9fa; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .test-card.passed { border-left-color: #27ae60; background: #f0fff4; }
        .test-card.failed { border-left-color: #e74c3c; background: #fff0f0; }
        .test-card.skipped { border-left-color: #f39c12; background: #fffbf0; }
        .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; }
        .test-name { font-weight: bold; font-size: 1.2em; color: #333; flex: 1; }
        .test-status { padding: 6px 12px; border-radius: 20px; color: white; font-size: 0.85em; font-weight: bold; }
        .status-passed { background: #27ae60; }
        .status-failed { background: #e74c3c; }
        .status-skipped { background: #f39c12; }
        .test-details { color: #666; font-size: 0.95em; }
        .test-details p { margin: 5px 0; }
        .screenshots { margin-top: 15px; }
        .screenshot-list { list-style: none; margin-top: 8px; }
        .screenshot-list li { background: #e9ecef; padding: 5px 10px; margin: 3px 0; border-radius: 4px; font-family: monospace; font-size: 0.85em; }
        .error-message { background: #ffeaa7; padding: 12px; border-radius: 6px; margin-top: 10px; font-family: monospace; font-size: 0.9em; border-left: 4px solid #fdcb6e; }
        .duration { color: #7f8c8d; font-size: 0.9em; }
        .environment-info { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
        @media (max-width: 768px) {
            .test-header { flex-direction: column; align-items: flex-start; }
            .test-status { margin-top: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Custom Test Execution Report</h1>
            <p>Comprehensive test results generated on ${new Date().toISOString()}</p>
            <div class="environment-info">
                <strong>Environment:</strong> ${process.env.CI ? 'GitHub Actions' : 'Local Development'} | 
                <strong>Node.js:</strong> ${process.version} | 
                <strong>Platform:</strong> ${process.platform}
            </div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card total">
                <h3>Total Tests</h3>
                <div class="number">${summary.total}</div>
                <p>Executed Tests</p>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="number">${summary.passed}</div>
                <p>Successful Tests</p>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="number">${summary.failed}</div>
                <p>Failed Tests</p>
            </div>
            <div class="summary-card skipped">
                <h3>Skipped</h3>
                <div class="number">${summary.skipped}</div>
                <p>Skipped Tests</p>
            </div>
            <div class="summary-card rate">
                <h3>Success Rate</h3>
                <div class="number">${summary.successRate}%</div>
                <p>Overall Success</p>
            </div>
        </div>

        <div class="test-results">
            <h2>Detailed Test Results</h2>
            ${this.testResults.map(result => `
                <div class="test-card ${result.status}">
                    <div class="test-header">
                        <span class="test-name">${this.escapeHtml(result.testName)}</span>
                        <span class="test-status status-${result.status}">${result.status.toUpperCase()}</span>
                    </div>
                    <div class="test-details">
                        <p><strong>👤 User:</strong> ${this.escapeHtml(result.username)} | <strong>🌐 Browser:</strong> ${result.browser || 'chromium'} | <strong>⏱️ Duration:</strong> <span class="duration">${result.duration}ms</span></p>
                        <p><strong>📁 File:</strong> ${this.escapeHtml(result.testFile)}</p>
                        <p><strong>📅 Timestamp:</strong> ${result.timestamp.toISOString()}</p>
                        ${result.screenshots.length > 0 ? `
                            <div class="screenshots">
                                <strong>📸 Screenshots (${result.screenshots.length}):</strong>
                                <ul class="screenshot-list">
                                    ${result.screenshots.slice(0, 5).map(screenshot => 
                                        `<li>${this.escapeHtml(screenshot)}</li>`
                                    ).join('')}
                                    ${result.screenshots.length > 5 ? `<li>... and ${result.screenshots.length - 5} more screenshots</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        ${result.errorMessage ? `
                            <div class="error-message">
                                <strong>❌ Error:</strong> ${this.escapeHtml(result.errorMessage)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private getSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      passed,
      failed,
      skipped,
      successRate
    };
  }

  getResults(): TestResult[] {
    return [...this.testResults];
  }

  // ✅ Get statistics for results collector compatibility
  getStats() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';
    const totalScreenshots = this.testResults.reduce((sum, r) => sum + (r.screenshots?.length || 0), 0);

    return {
      total,
      passed,
      failed,
      skipped,
      successRate,
      totalScreenshots,
      timestamp: new Date().toISOString()
    };
  }
}

export default TestRunner;

// Global instance for backward compatibility
export const testRunner = new TestRunner();

// Export functions for direct use
export function addTestResult(result: TestResult): void {
  testRunner.addTestResult(result);
}

export function generateAllReports(): { htmlReportPath: string; jsonReportPath: string } {
  return testRunner.generateAllReports();
}

export function clearTestResults(): void {
  testRunner.clearResults();
}

export function getTestRunnerStatus(): { totalResults: number; reportsDir: string; logsDir: string } {
  return testRunner.getStatus();
}

console.log('🎯 TestRunner module loaded as Playwright Reporter');