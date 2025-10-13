// utils/results-collector.ts
export interface TestResultData {
  testFile: string;
  testName: string;
  username: string;
  browser: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: string;
  screenshots: string[];
  errorMessage?: string;
}

export class ResultsCollector {
  private results: TestResultData[] = [];

  addResult(result: TestResultData) {
    console.log(`📝 Recording result: ${result.testName} - ${result.status}`);
    this.results.push(result);
  }

  getReportData() {
    const passedTests = this.results.filter(r => r.status === 'PASSED').length;
    
    return {
      timestamp: new Date().toLocaleString(),
      totalTests: this.results.length,
      passedTests: passedTests,
      failedTests: this.results.filter(r => r.status === 'FAILED').length,
      skippedTests: this.results.filter(r => r.status === 'SKIPPED').length,
      successRate: this.results.length > 0 ? (passedTests / this.results.length) * 100 : 0,
      testResults: this.results
    };
  }

  // Optional: Clear between test runs
  clear() {
    this.results = [];
  }
}

// Global instance - accessible from anywhere
export const resultsCollector = new ResultsCollector();