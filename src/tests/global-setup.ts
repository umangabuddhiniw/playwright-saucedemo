import { FullConfig } from '@playwright/test';
import { resultsCollector } from '../utils/results-collector';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup function that runs once before all tests
 * This ensures the test environment is properly configured
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  try {
    console.log('🎯 ====================================');
    console.log('🔄 Global Setup: Initializing test environment...');
    console.log('🎯 ====================================');
    
    // Log basic environment information
    const isCI = process.env.CI === 'true';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    console.log(`🏷️  Environment: ${nodeEnv} ${isCI ? '(CI)' : '(Local)'}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`🖥️  Platform: ${process.platform}`);
    
    // Ensure all required directories exist
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const requiredDirs = [
      testResultsDir,
      path.join(testResultsDir, 'reports'),
      path.join(testResultsDir, 'logs'), 
      path.join(testResultsDir, 'screenshots'),
      path.join(process.cwd(), 'playwright-report'),
      path.join(process.cwd(), 'test-results-json') // For JSON reports
    ];
    
    console.log('📂 Creating/verifying directories...');
    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ Created: ${path.relative(process.cwd(), dir)}`);
      } else {
        console.log(`   📁 Exists: ${path.relative(process.cwd(), dir)}`);
      }
    });
    
    // ✅ FIXED: Safe results collector clearing
    console.log('🧹 Clearing previous test results...');
    try {
      // Check if resultsCollector exists and has clear method
      if (resultsCollector && typeof (resultsCollector as any).clear === 'function') {
        (resultsCollector as any).clear();
        console.log('   ✅ ResultsCollector cleared for new run');
      } else if (resultsCollector && typeof (resultsCollector as any).reset === 'function') {
        (resultsCollector as any).reset();
        console.log('   ✅ ResultsCollector reset for new run');
      } else {
        console.log('   ℹ️  ResultsCollector clear method not available, continuing...');
      }
    } catch (clearError) {
      console.log('   ⚠️  Could not clear results collector:', (clearError as Error).message);
      // Don't fail the setup for this
    }
    
    // ✅ FIXED: Safe test runner initialization (if it exists)
    console.log('🚀 Initializing test runner...');
    try {
      // Dynamically import testRunner to avoid circular dependencies
      const { testRunner } = await import('../utils/testRunner');
      if (testRunner && typeof (testRunner as any).initialize === 'function') {
        await (testRunner as any).initialize();
        console.log('   ✅ TestRunner initialized');
      } else {
        console.log('   ℹ️  TestRunner initialization not required');
      }
    } catch (runnerError) {
      console.log('   ⚠️  TestRunner not available or initialization failed:', (runnerError as Error).message);
      // Don't fail the setup if testRunner doesn't exist
    }
    
    // Create a setup completion marker with comprehensive info
    const setupCompletePath = path.join(testResultsDir, 'global-setup-complete.json');
    const setupInfo = {
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
      isCI: isCI,
      platform: process.platform,
      nodeVersion: process.version,
      setup: 'completed',
      directories: requiredDirs.map(dir => path.relative(process.cwd(), dir)),
      config: {
        workers: config.workers,
        timeout: config.globalTimeout,
        reporter: config.reporter.map((r: any) => 
          Array.isArray(r) ? r[0] : typeof r === 'string' ? r : 'custom'
        )
      }
    };
    
    fs.writeFileSync(setupCompletePath, JSON.stringify(setupInfo, null, 2));
    console.log('   ✅ Setup completion marker created');
    
    // Log successful setup completion
    logger.info('Global setup completed successfully', {
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
      isCI: isCI,
      directoriesCreated: requiredDirs.length,
      config: {
        workers: config.workers,
        timeout: config.globalTimeout
      }
    });
    
    console.log('🎯 ====================================');
    console.log('✅ Global Setup: Completed successfully!');
    console.log('📊 Configuration:');
    console.log(`   ├── Workers: ${config.workers}`);
    console.log(`   ├── Timeout: ${config.globalTimeout || 'Not set'}`);
    console.log(`   ├── Reporters: ${config.reporter.length}`);
    console.log(`   └── Directories: ${requiredDirs.length}`);
    console.log('🎯 ====================================');
    
  } catch (error) {
    console.error('🎯 ====================================');
    console.error('❌ Global Setup: CRITICAL FAILURE');
    console.error('🎯 ====================================');
    console.error('Error details:', error);
    
    // Log the error with as much context as possible
    logger.error('Global setup failed catastrophically', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isCI: process.env.CI === 'true'
    });
    
    // Create an error marker file
    try {
      const errorDir = path.join(process.cwd(), 'test-results');
      if (!fs.existsSync(errorDir)) {
        fs.mkdirSync(errorDir, { recursive: true });
      }
      
      const errorPath = path.join(errorDir, 'global-setup-failed.json');
      const errorInfo = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        setup: 'failed'
      };
      
      fs.writeFileSync(errorPath, JSON.stringify(errorInfo, null, 2));
      console.error('📄 Error details saved to: global-setup-failed.json');
    } catch (fileError) {
      console.error('❌ Could not save error details:', fileError);
    }
    
    // Re-throw the error to fail the test run
    throw error;
  }
}

// Export for potential manual testing
export { globalSetup };