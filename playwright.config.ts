// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// Register TypeScript for configuration files
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

export default defineConfig({
  testDir: './src/tests',
  
  // ✅ Optimized parallel execution
  fullyParallel: false, // Set to false for more reliable test execution
  forbidOnly: !!process.env.CI, // Fail if test.only is used in CI
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // Single worker in CI for stability
  
  // ✅ Global setup and teardown
  globalSetup: './src/tests/global-setup.ts',
  globalTeardown: './src/tests/global-teardown.ts',
  
  // ✅ Comprehensive reporting
  reporter: [
    ['list'], // Console output
    ['./src/utils/testRunner.ts'], // Custom test runner
    ['html', { 
      outputFolder: 'playwright-report', 
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit-results.xml' 
    }]
  ],
  
  // ✅ Global test configuration
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    // Artifacts configuration
    screenshot: process.env.CI ? 'on' : 'only-on-failure', // Save screenshots only on failure in CI
    video: process.env.CI ? 'retain-on-failure' : 'on', // Save videos only on failure in CI
    trace: process.env.CI ? 'retain-on-failure' : 'on', // Save traces only on failure in CI
    
    // Network and navigation settings
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    viewport: { width: 1280, height: 720 },

    // ✅ CRITICAL FIX: Enhanced CI-specific rendering configuration
    launchOptions: {
      args: process.env.CI ? [
        // GitHub Actions CI-specific flags for proper rendering
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--window-size=1280,720',
        '--force-device-scale-factor=1', // ✅ Prevents scaling issues
        '--disable-gpu', // ✅ Essential for headless rendering in CI
        '--disable-software-rasterizer',
        '--disable-font-subpixel-positioning',
        '--enable-font-antialiasing',
        '--disable-webgl',
        '--disable-canvas-aa',
        '--disable-2d-canvas-clip-aa',
        '--disable-gl-drawing-for-tests',
      ] : [
        // Local environment (your working setup)
        '--window-size=1280,720',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ]
    }
  },

  // ✅ Project configurations
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        
        // Artifacts per project
        screenshot: process.env.CI ? 'on' : 'only-on-failure',
        video: process.env.CI ? 'retain-on-failure' : 'on',
        trace: process.env.CI ? 'retain-on-failure' : 'on',
        
        // Browser launch options
        launchOptions: {
          slowMo: process.env.CI ? 100 : 50, // ✅ Slower for CI rendering stability
        }
      },
    },
    
  ],

  // ✅ Output and timeout configurations
  outputDir: 'test-results/',
  
  // Global timeouts
  timeout: 120000, // Global test timeout
  expect: { 
    timeout: 25000 // Expect assertions timeout
  },

});

// Configuration validation
console.log('🎯 Playwright Configuration Loaded:', {
  testDir: './src/tests',
  ciMode: !!process.env.CI,
  workers: process.env.CI ? 1 : 'default',
  retries: process.env.CI ? 2 : 0,
  baseURL: 'https://www.saucedemo.com'
});