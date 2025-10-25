import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  
  // SIMPLIFIED & RELIABLE SETTINGS
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Fixed - undefined causes CI issues
  
  globalSetup: './src/tests/global-setup.ts',
  globalTeardown: './src/tests/global-teardown.ts',
  
  reporter: [
    ['list'],
    ['./src/utils/testRunner.ts'],
    ['html', { 
      outputFolder: 'playwright-report', 
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results.json' 
    }]
  ],
  
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    // SIMPLIFIED ARTIFACT SETTINGS
    screenshot: 'on',
    video: 'on', 
    trace: 'on',
    
    ignoreHTTPSErrors: true,
    actionTimeout: 30000, // Increased for CI
    navigationTimeout: 45000, // Increased for CI
    viewport: { width: 1280, height: 720 },
    
    // SIMPLIFIED BROWSER ARGS
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,720'
      ]
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
    timeout: 30000 // Increased for CI
  },
});