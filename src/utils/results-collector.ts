// src/utils/results-collector.ts
import { testRunner, TestResult } from './testRunner';
import { logger } from './logger';

export interface TestResultData {
  testFile: string;
  testName: string;
  username: string;
  browser: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: string;
  screenshots: string[];
  errorMessage?: string;
  startTime?: Date;
  endTime?: Date;
}

class ResultsCollector {
  private results: TestResultData[] = [];

  constructor() {
    console.log('🔄 ResultsCollector initialized - Compatible with TestRunner Reporter');
  }

  // ✅ Instance method for backward compatibility
  addResult(result: TestResultData): void {
    try {
      console.log(`📊 Adding test result: ${result.testName} - ${result.status}`);
      
      // Basic validation
      if (!result.testName || !result.status) {
        console.warn('⚠️ Invalid result data - missing required fields');
        return;
      }

      // ✅ FIXED: Preserve the original username from the result
      const originalUsername = result.username || 'unknown';
      
      // Convert duration string to number for TestRunner
      const duration = parseInt(result.duration) || 0;

      // Also add to TestRunner for report generation
      const testRunnerResult: TestResult = {
        testName: result.testName,
        username: originalUsername,
        status: result.status,
        duration: duration,
        timestamp: new Date(),
        testFile: result.testFile || 'unknown',
        errorMessage: result.errorMessage,
        screenshots: Array.isArray(result.screenshots) ? result.screenshots : [],
        browser: result.browser || 'unknown'
      };

      // Add to both collectors for compatibility
      testRunner.addTestResult(testRunnerResult);

      // Set defaults for optional fields
      const processedResult: TestResultData = {
        testFile: result.testFile || 'unknown',
        testName: result.testName,
        username: originalUsername,
        browser: result.browser || 'unknown',
        status: result.status,
        duration: result.duration || '0',
        screenshots: Array.isArray(result.screenshots) ? result.screenshots : [],
        errorMessage: result.errorMessage,
        startTime: result.startTime || new Date(),
        endTime: result.endTime || new Date()
      };

      // Add to local collection
      this.results.push(processedResult);
      
      console.log('✅ Test result added to both collectors:', {
        testName: processedResult.testName,
        username: processedResult.username,
        status: processedResult.status,
        duration: processedResult.duration,
        screenshots: processedResult.screenshots.length,
        totalResults: this.results.length
      });
      
      // Log to Winston for persistence
      logger.info('Test result collected', {
        testName: processedResult.testName,
        username: processedResult.username,
        status: processedResult.status,
        duration: processedResult.duration,
        screenshots: processedResult.screenshots.length
      });
      
    } catch (error) {
      console.error('❌ Error adding test result to collector:', error);
      logger.error('Failed to add test result', {
        testName: result.testName,
        username: result.username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  getStats() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';

    const stats = {
      total,
      passed,
      failed,
      skipped,
      successRate,
      timestamp: new Date().toISOString()
    };

    console.log('📈 Collector Statistics:', stats);
    return stats;
  }

  getAllResults(): TestResultData[] {
    console.log(`📋 Returning ${this.results.length} test results from local collector`);
    return [...this.results];
  }

  getResultsByStatus(status: 'passed' | 'failed' | 'skipped'): TestResultData[] {
    const filtered = this.results.filter(result => result.status === status);
    console.log(`📋 Returning ${filtered.length} ${status} results from local collector`);
    return filtered;
  }

  clear(): void {
    const previousCount = this.results.length;
    this.results = [];
    console.log(`🧹 Cleared ${previousCount} results from local collector`);
    
    logger.info('Results collector cleared', {
      previousResults: previousCount
    });
  }

  exportToJSON(): string {
    try {
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalResults: this.results.length,
          environment: process.env.NODE_ENV || 'development',
          collector: 'results-collector'
        },
        summary: this.getStats(),
        results: this.results
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      console.log(`💾 Exported ${this.results.length} results to JSON from local collector`);
      
      return jsonString;
      
    } catch (error) {
      console.error('❌ Failed to export JSON from local collector:', error);
      return '{}';
    }
  }

  healthCheck() {
    const health = {
      isWorking: true,
      totalResults: this.results.length,
      testRunnerResults: testRunner.getResults().length,
      lastUpdated: new Date().toISOString(),
      hasRecentActivity: this.results.length > 0
    };

    console.log('🔍 Collector Health Check:', health);
    return health;
  }

  // ✅ Public getter for results count
  getResultsCount(): number {
    return this.results.length;
  }

  // ✅ Method to get results by username
  getResultsByUsername(username: string): TestResultData[] {
    const filtered = this.results.filter(result => result.username === username);
    console.log(`📋 Returning ${filtered.length} results for user: ${username}`);
    return filtered;
  }
}

// ✅ Static methods for TestRunner integration
export class ResultsCollectorStatic {
  static collectTestResult(
    testName: string,
    username: string,
    status: 'passed' | 'failed' | 'skipped',
    duration: number,
    testFile: string,
    options: {
      errorMessage?: string;
      screenshots?: string[];
      browser?: string;
    } = {}
  ): void {
    const result: TestResult = {
      testName,
      username,
      status,
      duration,
      timestamp: new Date(),
      testFile,
      errorMessage: options.errorMessage,
      screenshots: options.screenshots || [],
      browser: options.browser
    };

    testRunner.addTestResult(result);
    
    logger.info('Test result collected via static method', {
      testName,
      username,
      status,
      duration,
      testFile
    });

    console.log(`✅ Static collector: Added test result for ${testName} - User: ${username}`);
  }

  static generateReports(): { htmlReportPath: string; jsonReportPath: string } {
    logger.info('Generating test reports via ResultsCollector');
    const reports = testRunner.generateAllReports();
    
    console.log('📊 Reports generated via ResultsCollector:', {
      htmlReport: reports.htmlReportPath,
      jsonReport: reports.jsonReportPath
    });
    
    return reports;
  }

  static clearPreviousResults(): void {
    testRunner.clearResults();
    logger.info('Previous test results cleared via ResultsCollector');
    
    console.log('🧹 Previous results cleared via ResultsCollector static method');
  }

  static getTestRunnerResults(): TestResult[] {
    return testRunner.getResults();
  }

  static getCombinedStats() {
    const testRunnerStats = testRunner.getStats();
    const localResultsCount = resultsCollector.getResultsCount();
    const localHealth = resultsCollector.healthCheck();
    
    // Get unique usernames for better reporting
    const uniqueUsernames = [...new Set(resultsCollector.getAllResults().map(r => r.username))];
    
    return {
      testRunner: testRunnerStats,
      localCollector: {
        totalResults: localResultsCount,
        health: localHealth,
        uniqueUsernames: uniqueUsernames
      },
      combined: {
        totalTests: testRunnerStats.total,
        successRate: testRunnerStats.successRate,
        environment: process.env.CI ? 'GitHub Actions' : 'Local Development',
        usersTested: uniqueUsernames.length
      }
    };
  }

  // ✅ Static method to verify username preservation
  static verifyUsernamePreservation(): { preserved: boolean; issues: string[] } {
    const issues: string[] = [];
    const testRunnerResults = testRunner.getResults();
    const localResults = resultsCollector.getAllResults();
    
    // Check for username mismatches between TestRunner and local collector
    testRunnerResults.forEach(trResult => {
      const localMatch = localResults.find(lr => lr.testName === trResult.testName);
      if (localMatch && localMatch.username !== trResult.username) {
        issues.push(`Username mismatch for test "${trResult.testName}": TestRunner="${trResult.username}", Local="${localMatch.username}"`);
      }
    });

    const preserved = issues.length === 0;
    
    if (!preserved) {
      console.warn('⚠️ Username preservation issues detected:', issues);
    } else {
      console.log('✅ All usernames properly preserved across collectors');
    }
    
    return { preserved, issues };
  }
}

// ✅ Create a single global instance for backward compatibility
export const resultsCollector = new ResultsCollector();

// ✅ Export static methods for direct use
export const collectTestResult = ResultsCollectorStatic.collectTestResult;
export const generateReports = ResultsCollectorStatic.generateReports;
export const clearPreviousResults = ResultsCollectorStatic.clearPreviousResults;
export const getTestRunnerResults = ResultsCollectorStatic.getTestRunnerResults;
export const getCombinedStats = ResultsCollectorStatic.getCombinedStats;
export const verifyUsernamePreservation = ResultsCollectorStatic.verifyUsernamePreservation;

// ✅ Export the instance methods for backward compatibility
export { ResultsCollector };