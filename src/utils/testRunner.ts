import { ReportGenerator, TestResult } from './reportGenerator';
import { logger } from './logger';

// Global report generator instance with singleton pattern
class GlobalReporter {
    private static instance: ReportGenerator;

    static getInstance(): ReportGenerator {
        if (!GlobalReporter.instance) {
            GlobalReporter.instance = new ReportGenerator();
        }
        return GlobalReporter.instance;
    }
}

export const globalReportGenerator = GlobalReporter.getInstance();

// Function to add test result with proper typing and validation
export function addTestResult(result: TestResult): void {
    try {
        // Enhanced validation with more specific error messages
        if (!result.testName?.trim()) {
            throw new Error('Test result must have a non-empty testName');
        }
        if (!result.username?.trim()) {
            throw new Error('Test result must have a non-empty username');
        }
        if (!result.status || !['passed', 'failed', 'skipped'].includes(result.status)) {
            throw new Error(`Test result must have a valid status (passed, failed, or skipped), got: ${result.status}`);
        }
        if (result.duration < 0) {
            throw new Error('Test result duration cannot be negative');
        }

        // ✅ ADDED: Debug logging for screenshots
        logger.info(`📸 Adding test result with ${result.screenshots?.length || 0} screenshots:`, {
            testName: result.testName,
            screenshotCount: result.screenshots?.length,
            screenshotFiles: result.screenshots
        });

        globalReportGenerator.addResult(result);
        logger.info(`✅ Test result added: ${result.username} - ${result.testName} (${result.status})`);
    } catch (error) {
        logger.error('❌ Failed to add test result:', error);
        throw error;
    }
}

// Function to generate all reports with error handling
export function generateAllReports(): {
    htmlReportPath: string;
    jsonReportPath: string;
    consoleSummary: void;
} {
    try {
        logger.info('Starting report generation...');
        
        // ✅ ADDED: Debug current results before generating
        const currentResults = getCurrentResults();
        logger.info(`📊 Generating reports for ${currentResults.length} test results`);
        
        currentResults.forEach((result, index) => {
            logger.info(`   Test ${index + 1}: ${result.testName} - ${result.screenshots?.length || 0} screenshots`);
        });

        const htmlReportPath = globalReportGenerator.generateHTMLReport();
        const jsonReportPath = globalReportGenerator.saveJSONReport();
        const consoleSummary = globalReportGenerator.generateConsoleSummary();

        logger.info('✅ All reports generated successfully');
        
        return {
            htmlReportPath,
            jsonReportPath,
            consoleSummary
        };
    } catch (error) {
        logger.error('❌ Failed to generate reports:', error);
        throw error;
    }
}

// Function to get current test results
export function getCurrentResults(): TestResult[] {
    return globalReportGenerator.getResults();
}

// Function to clear all results
export function clearAllResults(): void {
    globalReportGenerator.clearResults();
    logger.info('🧹 All test results cleared');
}

// Function to get report statistics
export function getReportStats(): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: string;
    totalScreenshots: number; // ✅ ADDED: Track screenshots
} {
    const results = getCurrentResults();
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    
    // ✅ ADDED: Count total screenshots
    const totalScreenshots = results.reduce((acc, result) => 
        acc + (result.screenshots?.length || 0), 0
    );

    return {
        total,
        passed,
        failed,
        skipped,
        successRate,
        totalScreenshots // ✅ ADDED
    };
}

// ✅ ADDED: Function to specifically check screenshot status
export function getScreenshotStatus(): {
    testsWithScreenshots: number;
    testsWithoutScreenshots: number;
    totalScreenshots: number;
} {
    const results = getCurrentResults();
    const testsWithScreenshots = results.filter(r => r.screenshots && r.screenshots.length > 0).length;
    const testsWithoutScreenshots = results.length - testsWithScreenshots;
    const totalScreenshots = results.reduce((acc, result) => 
        acc + (result.screenshots?.length || 0), 0
    );

    logger.info(`📸 Screenshot Status: ${testsWithScreenshots} tests with screenshots, ${testsWithoutScreenshots} without, ${totalScreenshots} total screenshots`);

    return {
        testsWithScreenshots,
        testsWithoutScreenshots,
        totalScreenshots
    };
}

// Export the global reporter for direct access if needed
export { globalReportGenerator as reporter };