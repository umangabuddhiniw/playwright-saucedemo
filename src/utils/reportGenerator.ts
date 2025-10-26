// src/utils/reportGenerator.ts
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface TestResult {
    testName: string;
    username: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    timestamp: Date;
    errorMessage?: string;
    screenshots: string[];
    testId?: string;
    browser?: string;
    testFile?: string;
    itemsAdded?: number;
    itemsRemoved?: number;
    totalSteps?: number;
    environment?: string;
}

export class ReportGenerator {
    private results: TestResult[] = [];
    private screenshotsSourceDir: string;
    private availableScreenshotsCache: string[] | null = null;
    private screenshotCache: Map<string, string | null> = new Map();
    private reportGenerated: boolean = false;
    private static instance: ReportGenerator;

    public static getInstance(): ReportGenerator {
        if (!ReportGenerator.instance) {
            ReportGenerator.instance = new ReportGenerator();
        }
        return ReportGenerator.instance;
    }

    private constructor() {
        this.screenshotsSourceDir = this.findScreenshotDir();
        this.ensureDirectories();
        console.log('🚀 ReportGenerator initialized (Singleton)');
        console.log('📁 Screenshots directory:', this.screenshotsSourceDir);
    }

    // ✅ ADDED: Missing method - Reset for new test run
    resetForNewRun(): void {
        const previousCount = this.results.length;
        this.results = [];
        this.reportGenerated = false;
        this.availableScreenshotsCache = null;
        this.screenshotCache.clear();
        console.log(`🔄 ReportGenerator reset for new test run (cleared ${previousCount} results)`);
    }

    // ✅ ADDED: Missing method - Generate HTML Report (legacy method)
    generateHTMLReport(): string {
        console.log('📊 Generating HTML report (legacy method)');
        const reportPaths = this.generateComprehensiveReport();
        return reportPaths.htmlPath;
    }

    // ✅ ADDED: Missing method - Save JSON Report (legacy method)
    saveJSONReport(): string {
        console.log('📊 Generating JSON report (legacy method)');
        const reportPaths = this.generateComprehensiveReport();
        return reportPaths.jsonPath;
    }

    // ✅ ADDED: Missing method - Generate Console Summary
    generateConsoleSummary(): void {
        if (this.results.length === 0) {
            console.log('❌ No test results to summarize');
            return;
        }

        const stats = this.calculateStatistics();
        
        console.log('\n' + '='.repeat(80));
        console.log('📋 TEST EXECUTION SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total: ${stats.total} | ✅ Passed: ${stats.passed} | ❌ Failed: ${stats.failed} | ⚠️ Skipped: ${stats.skipped}`);
        console.log(`Success Rate: ${stats.successRate}%`);
        
        // Additional statistics
        console.log(`Screenshots: ${stats.usedScreenshots}/${stats.totalScreenshots} used`);
        console.log('='.repeat(80));
    }

    private findScreenshotDir(): string {
        const possibleDirs = [
            path.join(process.cwd(), 'test-results', 'screenshots'),
            path.join(process.cwd(), 'screenshots'),
            path.join(process.cwd(), 'test-results')
        ];
        
        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                try {
                    const files = fs.readdirSync(dir);
                    const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
                    if (pngFiles.length > 0) {
                        console.log(`📁 Using screenshots directory: ${dir} (${pngFiles.length} PNG files)`);
                        return dir;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        const defaultDir = path.join(process.cwd(), 'test-results', 'screenshots');
        if (!fs.existsSync(defaultDir)) {
            fs.mkdirSync(defaultDir, { recursive: true });
            console.log(`📁 Created screenshots directory: ${defaultDir}`);
        }
        return defaultDir;
    }

    private ensureDirectories(): void {
        const reportsDir = path.join(process.cwd(), 'test-results', 'reports');
        const logsDir = path.join(process.cwd(), 'test-results', 'logs');
        
        [reportsDir, logsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    addResult(result: TestResult): void {
        console.log(`🔍 ReportGenerator.addResult() called for: ${result.testName}`);
        
        if (!result.testName?.trim()) {
            throw new Error('Test result must have a testName');
        }
        if (!result.username?.trim()) {
            throw new Error('Test result must have a username');
        }

        // Auto-detect test file if not provided
        if (!result.testFile) {
            result.testFile = this.determineTestFileFromName(result.testName);
        }

        console.log(`📸 Adding result to ReportGenerator: ${result.testName}`, {
            username: result.username,
            status: result.status,
            screenshots: result.screenshots?.length || 0,
            testFile: result.testFile
        });

        this.results.push(result);
        this.availableScreenshotsCache = null; // Clear cache
        
        console.log(`✅ ReportGenerator now has ${this.results.length} results`);
    }

    // ✅ ADDED: Generate single comprehensive report
    generateComprehensiveReport(): { htmlPath: string; jsonPath: string } {
        console.log('🔍 ReportGenerator.generateComprehensiveReport() called');
        console.log(`🔍 Current results count: ${this.results.length}`);
        
        if (this.reportGenerated) {
            console.log('⚠️ Report already generated for this test run');
            return this.getLatestReportPaths();
        }

        if (this.results.length === 0) {
            console.log('❌ No test results to generate report');
            console.log('❌ This means addResult() was never called or results were not passed correctly');
            return { htmlPath: '', jsonPath: '' };
        }

        console.log(`📊 Generating comprehensive report for ${this.results.length} tests`);

        // Clean old reports before generating new ones
        this.cleanOldReports();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportDir = path.join(process.cwd(), 'test-results', 'reports');
        
        console.log(`🔍 Report directory: ${reportDir}`);
        console.log(`🔍 Timestamp: ${timestamp}`);
        
        // Generate HTML report
        const htmlPath = path.join(reportDir, `test-report-${timestamp}.html`);
        console.log(`🔍 HTML path: ${htmlPath}`);
        
        try {
            const htmlContent = this.generateHTMLContent();
            fs.writeFileSync(htmlPath, htmlContent);
            console.log(`✅ HTML report created: ${htmlPath}`);
        } catch (error) {
            console.error(`❌ Failed to create HTML report: ${error}`);
            return { htmlPath: '', jsonPath: '' };
        }
        
        // Generate JSON report
        const jsonPath = path.join(reportDir, `test-report-${timestamp}.json`);
        console.log(`🔍 JSON path: ${jsonPath}`);
        
        try {
            const jsonContent = this.generateJSONContent();
            fs.writeFileSync(jsonPath, jsonContent);
            console.log(`✅ JSON report created: ${jsonPath}`);
        } catch (error) {
            console.error(`❌ Failed to create JSON report: ${error}`);
            return { htmlPath: '', jsonPath: '' };
        }

        this.reportGenerated = true;
        
        console.log('✅ Comprehensive reports generated:', {
            html: htmlPath,
            json: jsonPath,
            totalTests: this.results.length
        });

        return { htmlPath, jsonPath };
    }

    // ✅ ADDED: Clean old reports to avoid clutter
    private cleanOldReports(): void {
        const reportsDir = path.join(process.cwd(), 'test-results', 'reports');
        if (!fs.existsSync(reportsDir)) {
            console.log(`📁 Reports directory doesn't exist yet: ${reportsDir}`);
            return;
        }

        try {
            const files = fs.readdirSync(reportsDir);
            const reportFiles = files.filter(f => f.startsWith('test-report-'));
            console.log(`🔍 Found ${reportFiles.length} existing report files`);
            
            // Keep only the latest 5 reports, delete older ones
            if (reportFiles.length > 5) {
                const sortedFiles = reportFiles.sort().reverse();
                const filesToDelete = sortedFiles.slice(5);
                
                filesToDelete.forEach(file => {
                    const filePath = path.join(reportsDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted old report: ${file}`);
                });
                
                console.log(`🧹 Cleaned up ${filesToDelete.length} old reports`);
            }
        } catch (error) {
            console.log('⚠️ Could not clean old reports:', error);
        }
    }

    // ✅ ADDED: Get latest report paths
    private getLatestReportPaths(): { htmlPath: string; jsonPath: string } {
        const reportsDir = path.join(process.cwd(), 'test-results', 'reports');
        if (!fs.existsSync(reportsDir)) {
            console.log(`❌ Reports directory not found: ${reportsDir}`);
            return { htmlPath: '', jsonPath: '' };
        }

        try {
            const files = fs.readdirSync(reportsDir);
            const htmlFiles = files.filter(f => f.endsWith('.html') && f.startsWith('test-report-')).sort().reverse();
            const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('test-report-')).sort().reverse();

            const htmlPath = htmlFiles.length > 0 ? path.join(reportsDir, htmlFiles[0]) : '';
            const jsonPath = jsonFiles.length > 0 ? path.join(reportsDir, jsonFiles[0]) : '';

            console.log(`🔍 Latest HTML: ${htmlPath}`);
            console.log(`🔍 Latest JSON: ${jsonPath}`);

            return { htmlPath, jsonPath };
        } catch (error) {
            console.error('Error getting latest report paths:', error);
            return { htmlPath: '', jsonPath: '' };
        }
    }

    private determineTestFileFromName(testName: string): string {
        const nameLower = testName.toLowerCase();
        
        if (nameLower.includes('video') || nameLower.includes('complete') || 
            nameLower.includes('ui_issues') || nameLower.includes('error') ||
            nameLower.includes('standard_user') || nameLower.includes('problem_user') ||
            nameLower.includes('error_user') || nameLower.includes('locked_out_user')) {
            return 'video-tests.spec.ts';
        } else if (nameLower.includes('purchase') || nameLower.includes('checkout')) {
            return 'purchaseFlow.spec.ts';
        }
        
        return 'general-tests.spec.ts';
    }

    private getAvailableScreenshots(): string[] {
        if (this.availableScreenshotsCache) {
            return this.availableScreenshotsCache;
        }

        if (!fs.existsSync(this.screenshotsSourceDir)) {
            console.log(`❌ Screenshots directory not found: ${this.screenshotsSourceDir}`);
            return [];
        }

        try {
            const screenshots = fs.readdirSync(this.screenshotsSourceDir)
                .filter(file => file.toLowerCase().endsWith('.png'))
                .sort();

            this.availableScreenshotsCache = screenshots;
            console.log(`🔍 Found ${screenshots.length} screenshots in directory`);
            return screenshots;
        } catch (error) {
            console.error(`❌ Error reading screenshots: ${error}`);
            return [];
        }
    }

    private getScreenshotsForTest(result: TestResult): string[] {
        const allScreenshots = this.getAvailableScreenshots();
        const username = result.username.toLowerCase();
        
        if (allScreenshots.length === 0) {
            return [];
        }

        // Get user-specific screenshots
        const userScreenshots = allScreenshots.filter(screenshot => 
            screenshot.toLowerCase().includes(username)
        );

        console.log(`🔍 Found ${userScreenshots.length} screenshots for user: ${username}`);

        if (userScreenshots.length === 0) {
            return [];
        }

        return this.orderScreenshots(userScreenshots);
    }

    private orderScreenshots(screenshots: string[]): string[] {
        return screenshots.sort((a, b) => {
            const getSequence = (filename: string): number => {
                const patterns = [
                    filename.match(/_(\d+)-/),
                    filename.match(/^(\d+)_/),
                    filename.match(/_(\d+)_/)
                ];
                
                for (const match of patterns) {
                    if (match) return parseInt(match[1]);
                }
                return 999;
            };
            
            const aSeq = getSequence(a);
            const bSeq = getSequence(b);
            
            return aSeq !== bSeq ? aSeq - bSeq : a.localeCompare(b);
        });
    }

    private getScreenshotBase64(screenshotFilename: string): string | null {
        if (this.screenshotCache.has(screenshotFilename)) {
            return this.screenshotCache.get(screenshotFilename) || null;
        }

        const screenshotPath = path.join(this.screenshotsSourceDir, screenshotFilename);
        
        if (!fs.existsSync(screenshotPath)) {
            console.log(`❌ Screenshot not found: ${screenshotPath}`);
            this.screenshotCache.set(screenshotFilename, null);
            return null;
        }

        try {
            const imageBuffer = fs.readFileSync(screenshotPath);
            const base64 = imageBuffer.toString('base64');
            
            if (this.screenshotCache.size < 100) {
                this.screenshotCache.set(screenshotFilename, base64);
            }
            
            return base64;
        } catch (error) {
            console.error(`❌ Error reading screenshot: ${error}`);
            this.screenshotCache.set(screenshotFilename, null);
            return null;
        }
    }

    private generateHTMLContent(): string {
        const stats = this.calculateStatistics();
        const sortedResults = this.getSortedResults();

        const resultsHTML = sortedResults.map(result => 
            this.generateResultHTML(result)
        ).join('');

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
                <div class="number">${stats.total}</div>
                <p>Executed Tests</p>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="number">${stats.passed}</div>
                <p>Successful Tests</p>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="number">${stats.failed}</div>
                <p>Failed Tests</p>
            </div>
            <div class="summary-card skipped">
                <h3>Skipped</h3>
                <div class="number">${stats.skipped}</div>
                <p>Skipped Tests</p>
            </div>
            <div class="summary-card rate">
                <h3>Success Rate</h3>
                <div class="number">${stats.successRate}%</div>
                <p>Overall Success</p>
            </div>
        </div>

        <div class="test-results">
            <h2>Detailed Test Results</h2>
            ${resultsHTML}
        </div>
    </div>
</body>
</html>`;
    }

    private generateJSONContent(): string {
        const stats = this.calculateStatistics();
        const reportData = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalTests: stats.total,
                passed: stats.passed,
                failed: stats.failed,
                skipped: stats.skipped,
                successRate: stats.successRate
            },
            results: this.results.map(result => ({
                testName: result.testName,
                username: result.username,
                status: result.status,
                duration: result.duration,
                timestamp: result.timestamp.toISOString(),
                errorMessage: result.errorMessage,
                screenshotCount: this.getScreenshotsForTest(result).length,
                testFile: result.testFile
            }))
        };

        return JSON.stringify(reportData, null, 2);
    }

    private generateResultHTML(result: TestResult): string {
        const availableScreenshots = this.getScreenshotsForTest(result);
        
        const screenshotElements = availableScreenshots.length > 0 
            ? `<div class="screenshots">
                <strong>Screenshots:</strong>
                <ul class="screenshot-list">
                    ${availableScreenshots.map(screenshot => 
                        `<li>${screenshot}</li>`
                    ).join('')}
                </ul>
               </div>`
            : '';

        return `
        <div class="test-card ${result.status}">
            <div class="test-header">
                <span class="test-name">${result.testName}</span>
                <span class="test-status status-${result.status}">${result.status.toUpperCase()}</span>
            </div>
            <div class="test-details">
                <p><strong>👤 User:</strong> ${result.username} | <strong>🌐 Browser:</strong> ${result.browser || 'chromium'} | <strong>⏱️ Duration:</strong> <span class="duration">${result.duration}ms</span></p>
                <p><strong>📁 File:</strong> ${result.testFile || 'unknown'}</p>
                <p><strong>📅 Timestamp:</strong> ${result.timestamp.toISOString()}</p>
                ${result.errorMessage ? `<div class="error-message">${this.escapeHtml(result.errorMessage)}</div>` : ''}
                ${screenshotElements}
            </div>
        </div>`;
    }

    private calculateStatistics() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;
        const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

        const totalScreenshots = this.getAvailableScreenshots().length;
        const usedScreenshots = this.results.reduce((total, result) => 
            total + this.getScreenshotsForTest(result).length, 0
        );

        return {
            total, passed, failed, skipped, successRate,
            totalScreenshots, usedScreenshots
        };
    }

    private getSortedResults(): TestResult[] {
        return [...this.results].sort((a, b) => {
            const fileCompare = (a.testFile || '').localeCompare(b.testFile || '');
            return fileCompare !== 0 ? fileCompare : a.username.localeCompare(b.username);
        });
    }

    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    getResults(): TestResult[] {
        console.log(`🔍 ReportGenerator.getResults() called - returning ${this.results.length} results`);
        return [...this.results];
    }

    clearResults(): void {
        const previousCount = this.results.length;
        this.results = [];
        this.availableScreenshotsCache = null;
        this.screenshotCache.clear();
        this.reportGenerated = false;
        console.log(`🧹 Cleared all results and caches (was ${previousCount} results)`);
    }
}

// ✅ FIXED: Use singleton instance
export const reportGenerator = ReportGenerator.getInstance();