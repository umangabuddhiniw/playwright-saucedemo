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

        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;
        const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST EXECUTION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed} | ⚠️ Skipped: ${skipped}`);
        console.log(`Success Rate: ${successRate}%`);
        
        // Additional statistics
        const totalScreenshots = this.getAvailableScreenshots().length;
        const usedScreenshots = this.results.reduce((total, result) => 
            total + this.getScreenshotsForTest(result).length, 0
        );
        
        console.log(`Screenshots: ${usedScreenshots}/${totalScreenshots} used`);
        console.log('='.repeat(60));
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
    <title>SauceDemo Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 300; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #f8f9fa; }
        .summary-card { background: white; padding: 25px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary-card.total { border-top: 4px solid #3498db; }
        .summary-card.passed { border-top: 4px solid #2ecc71; }
        .summary-card.failed { border-top: 4px solid #e74c3c; }
        .summary-card.skipped { border-top: 4px solid #f39c12; }
        .summary-card .count { font-size: 2.5em; font-weight: bold; color: #2c3e50; }
        .results-table { width: 100%; border-collapse: collapse; }
        .results-table th { background: #34495e; color: white; padding: 15px; text-align: left; }
        .results-table td { padding: 15px; border-bottom: 1px solid #ecf0f1; vertical-align: top; }
        .results-table tr:hover { background: #f8f9fa; }
        .test-file { font-family: 'Courier New', monospace; background: #e8f4fd; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; }
        .user-badge { background: #e8f4fd; color: #2980b9; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; }
        .status-passed { color: #27ae60; font-weight: bold; }
        .status-failed { color: #e74c3c; font-weight: bold; }
        .status-skipped { color: #f39c12; font-weight: bold; }
        .screenshot-gallery { display: flex; gap: 8px; flex-wrap: wrap; }
        .screenshot { width: 80px; height: 60px; object-fit: cover; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; }
        .screenshot:hover { border-color: #3498db; transform: scale(1.05); }
        .no-screenshots { color: #7f8c8d; font-style: italic; }
        .error-message { color: #e74c3c; font-size: 0.85em; background: #fdeded; padding: 8px; border-radius: 4px; margin-top: 5px; }
        .modal { display: none; position: fixed; z-index: 1000; padding-top: 50px; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.9); }
        .modal-content { margin: auto; display: block; width: 80%; max-width: 700px; border-radius: 8px; }
        .close { position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer; }
        .close:hover { color: #bbb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 SauceDemo Test Report</h1>
            <p>Complete test execution results</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card total"><h3>Total Tests</h3><p class="count">${stats.total}</p></div>
            <div class="summary-card passed"><h3>Passed</h3><p class="count">${stats.passed}</p></div>
            <div class="summary-card failed"><h3>Failed</h3><p class="count">${stats.failed}</p></div>
            <div class="summary-card skipped"><h3>Skipped</h3><p class="count">${stats.skipped}</p></div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; display: inline-block;">
                <strong>Success Rate:</strong> 
                <span style="font-size: 1.5em; font-weight: bold; color: #27ae60; margin-left: 10px;">${stats.successRate}%</span>
            </div>
        </div>

        <table class="results-table">
            <thead>
                <tr>
                    <th>Test File</th>
                    <th>Test Details</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Screenshots</th>
                </tr>
            </thead>
            <tbody>${resultsHTML}</tbody>
        </table>
    </div>

    <div id="screenshotModal" class="modal">
        <span class="close">&times;</span>
        <img class="modal-content" id="modalImage">
        <div id="caption" style="text-align: center; color: white; padding: 10px;"></div>
    </div>

    <script>
        const modal = document.getElementById("screenshotModal");
        const modalImg = document.getElementById("modalImage");
        const captionText = document.getElementById("caption");
        const closeBtn = document.getElementsByClassName("close")[0];

        document.querySelectorAll('.screenshot').forEach(img => {
            img.onclick = function() {
                modal.style.display = "block";
                modalImg.src = this.src;
                captionText.innerHTML = this.getAttribute('data-filename') || 'Screenshot';
            }
        });

        closeBtn.onclick = function() { modal.style.display = "none"; }
        modal.onclick = function(event) { if (event.target === modal) modal.style.display = "none"; }
        document.onkeydown = function(event) { if (event.key === "Escape") modal.style.display = "none"; }
    </script>
</body>
</html>`;
    }

    private generateJSONContent(): string {
        const reportData = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalTests: this.results.length,
                passed: this.results.filter(r => r.status === 'passed').length,
                failed: this.results.filter(r => r.status === 'failed').length,
                skipped: this.results.filter(r => r.status === 'skipped').length,
                successRate: this.results.length > 0 ? 
                    ((this.results.filter(r => r.status === 'passed').length / this.results.length) * 100).toFixed(1) : '0'
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
            ? availableScreenshots.map((screenshot, index) => {
                const base64Image = this.getScreenshotBase64(screenshot);
                return base64Image 
                    ? `<img src="data:image/png;base64,${base64Image}" alt="Step ${index + 1}" class="screenshot" title="${screenshot}" data-filename="${screenshot}">`
                    : `<div style="color: #e74c3c; font-size: 0.8em;">Failed: ${screenshot}</div>`;
            }).join('')
            : '<span class="no-screenshots">No screenshots</span>';

        return `
        <tr>
            <td><span class="test-file">${result.testFile || 'unknown'}</span></td>
            <td>
                <strong>${result.testName}</strong>
                <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                    ${availableScreenshots.length} screenshots
                </div>
                ${result.errorMessage ? `<div class="error-message">${this.escapeHtml(result.errorMessage)}</div>` : ''}
            </td>
            <td><span class="user-badge">${result.username}</span></td>
            <td class="status-${result.status}">
                ${result.status.toUpperCase()} 
                ${result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️'}
            </td>
            <td>${(result.duration / 1000).toFixed(1)}s</td>
            <td><div class="screenshot-gallery">${screenshotElements}</div></td>
        </tr>`;
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