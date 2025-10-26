// src/utils/testRunner.ts
import fs from 'fs';
import path from 'path';
import { Reporter } from '@playwright/test/reporter';
import { logger } from './logger';
import { reportGenerator } from './reportGenerator';

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
    
    // ✅ FIXED: Reset report generator for new test run
    reportGenerator.resetForNewRun();
    
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

      // ✅ FIXED: Use SINGLE report generator instead of duplicate logic
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

    // ✅ FIXED: Generate reports using SINGLE source
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
      
      // ✅ FIXED: Also add to SINGLE report generator
      reportGenerator.addResult({
        testName: result.testName,
        username: result.username,
        status: result.status,
        duration: result.duration,
        timestamp: result.timestamp,
        errorMessage: result.errorMessage,
        screenshots: result.screenshots,
        testId: `${result.testFile}-${result.testName}`,
        browser: result.browser,
        testFile: result.testFile
      });
      
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

  // ✅ FIXED: Use reportGenerator for ALL report generation
  generateAllReports(): { htmlReportPath: string; jsonReportPath: string } {
    try {
      console.log('🚀 TestRunner: Generating all reports via ReportGenerator...');
      console.log(`📊 Current test results: ${this.testResults.length}`);
      
      this.logToFile('debug.log', 
        `Starting generation of all reports with ${this.testResults.length} test results`
      );

      if (this.testResults.length === 0) {
        console.warn('⚠️ TestRunner: No test results available for report generation');
        this.logToFile('debug.log', 'No test results available for report generation');
        return { htmlReportPath: '', jsonReportPath: '' };
      }

      // ✅ FIXED: Use SINGLE report generator
      const reports = reportGenerator.generateComprehensiveReport();

      if (reports.htmlPath && reports.jsonPath) {
        console.log('🎉 TestRunner: All reports generated successfully via ReportGenerator', {
          htmlReport: reports.htmlPath,
          jsonReport: reports.jsonPath,
          totalTests: this.testResults.length
        });

        this.logToFile('test-execution.log', 
          `All reports generated successfully - HTML: ${reports.htmlPath}, JSON: ${reports.jsonPath}`
        );

        // Log directory structure
        this.logDirectoryStructure();

        logger.info('Test reports generated successfully', {
          htmlReport: reports.htmlPath,
          jsonReport: reports.jsonPath,
          totalTests: this.testResults.length
        });
      } else {
        console.error('❌ TestRunner: Reports failed to generate via ReportGenerator');
        this.logToFile('errors.log', 'Reports failed to generate via ReportGenerator');
      }

      return { 
        htmlReportPath: reports.htmlPath || '', 
        jsonReportPath: reports.jsonPath || '' 
      };
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
├── reports/                       # ✅ HTML and JSON reports (SINGLE SOURCE)
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