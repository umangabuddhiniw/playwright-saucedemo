// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// ✅ CRITICAL: Register ts-node for custom TypeScript reporters
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

export default defineConfig({
  testDir: './src/tests',
  
  // ✅ OPTIMIZED: Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  
  globalSetup: './src/tests/global-setup.ts',
  globalTeardown: './src/tests/global-teardown.ts',
  
  // ✅ FIXED: Enable BOTH reporting systems
  reporter: [
    ['list'], // Console output
    
    // ✅ YOUR CUSTOM REPORTER (generates test-results/reports/)
    ['./src/utils/testRunner.ts'],
    
    // ✅ PLAYWRIGHT HTML (generates playwright-report/)
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    
    // ✅ PLAYWRIGHT JSON (generates test-results.json)
    ['json', { 
      outputFile: 'test-results/test-results.json'
    }],
    
    // ✅ JUNIT for CI
    ['junit', { 
      outputFile: 'test-results/junit-results.xml'
    }]
  ],
  
  // ✅ FIXED: Guaranteed artifact capture
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    // Artifact settings
    screenshot: 'on',
    video: 'on', 
    trace: 'on',
    
    // Network and navigation
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    viewport: { width: 1280, height: 720 },

    // Enhanced launch options
    launchOptions: {
      args: process.env.CI ? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows', 
        '--disable-renderer-backgrounding',
        '--window-size=1280,720',
        '--force-device-scale-factor=1',
        '--disable-gpu',
      ] : [
        '--window-size=1280,720',
        '--disable-web-security',
      ],
      slowMo: process.env.CI ? 100 : 50,
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  outputDir: 'test-results/',
  timeout: 120000,
  expect: { 
    timeout: 25000
  },
});

console.log('🎯 DUAL REPORT SYSTEM CONFIGURED:', {
  customReports: 'test-results/reports/ (via testRunner.ts)',
  playwrightReports: 'playwright-report/ (built-in)',
  screenshots: 'ALWAYS (on)',
  videos: 'ALWAYS (on)',
  traces: 'ALWAYS (on)'
});