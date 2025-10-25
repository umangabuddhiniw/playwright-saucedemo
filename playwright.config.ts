import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  globalSetup: './src/tests/global-setup.ts',
  globalTeardown: './src/tests/global-teardown.ts',
  
  reporter: [
    ['list'],
    ['./src/utils/testRunner.ts'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'on',
    trace: process.env.CI ? 'on-first-retry' : 'on',
    
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,  // Increased from 20000
    navigationTimeout: 45000,  // Increased from 30000
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

  // Global timeouts
  timeout: 180000,  // Increased from 120000
  expect: { 
    timeout: 30000  // Increased from 25000
  },
});