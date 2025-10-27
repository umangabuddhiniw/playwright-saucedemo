// src/tests/global-teardown.ts
import { testRunner } from '../utils/testRunner';
import { generateReports, getCombinedStats } from '../utils/results-collector';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export default async function globalTeardown(): Promise<void> {
  try {
    console.log('🔚 Global teardown: Starting final cleanup and report generation...');
    
    // 🔥 CRITICAL FIX: Force report generation in GitHub since TestRunner.onEnd() may not be called
    const testRunnerStatus = testRunner.getStatus();
    console.log(`📊 TestRunner status: ${testRunnerStatus.totalResults} results collected`);
    
    if (testRunnerStatus.totalResults > 0) {
      console.log('🚀 Global teardown: Forcing report generation via TestRunner...');
      const reports = testRunner.generateAllReports();
      
      if (reports.htmlReportPath && reports.jsonReportPath) {
        console.log('✅ Global teardown: Reports generated successfully:', {
          html: reports.htmlReportPath,
          json: reports.jsonReportPath
        });
      } else {
        console.log('⚠️ Global teardown: TestRunner report generation returned empty paths');
        
        // Fallback: Try results-collector as backup
        console.log('🔄 Global teardown: Trying results-collector as fallback...');
        generateReports();
      }
    } else {
      console.log('⚠️ Global teardown: No test results found in TestRunner');
      console.log('🔄 Global teardown: Trying results-collector as alternative...');
      generateReports();
    }

    // Log final statistics
    const stats = getCombinedStats();
    console.log('📈 Final Test Statistics:', JSON.stringify(stats, null, 2));

    // Log the directory structure
    console.log(`
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
└── test-results.json              # JSON test results

playwright-report/                 # ✅ HTML reports (alternative location)
├── data/
├── index.html
└── trace/
    `);

    // Verify files were actually created
    console.log('🔍 Verifying generated files...');
    try {
      const reportsDir = path.join(process.cwd(), 'test-results', 'reports');
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir);
        console.log(`📄 Generated report files: ${files.join(', ')}`);
      } else {
        console.log('❌ Reports directory not found!');
      }
      
      // Check for videos - FIXED: Added proper type annotation
      const testResultsDir = path.join(process.cwd(), 'test-results');
      if (fs.existsSync(testResultsDir)) {
        const videoDirs = fs.readdirSync(testResultsDir)
          .filter((dir: string) => dir.includes('-video-'));
        console.log(`🎥 Video directories found: ${videoDirs.length}`);
        
        if (videoDirs.length > 0) {
          console.log(`📹 Video dirs: ${videoDirs.join(', ')}`);
        }
      } else {
        console.log('❌ test-results directory not found!');
      }
      
    } catch (fileError) {
      console.log('🔍 File verification failed:', fileError);
    }

    logger.info('Global teardown completed', {
      totalTests: stats.combined.totalTests,
      successRate: stats.combined.successRate,
      environment: stats.combined.environment,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    logger.error('Global teardown failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Ensure process exits with error code in CI
    if (process.env.CI) {
      process.exit(1);
    }
  }
}