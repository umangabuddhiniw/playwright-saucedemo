import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    // ✅ FIXED: Only take automatic screenshots on failure
    screenshot: 'only-on-failure',
    
    video: {
      mode: 'on',
    },
    
    trace: 'on',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Timeout settings
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Better context options
    launchOptions: {
      args: ['--window-size=1280,720']
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'], // ✅ Now devices is imported
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  outputDir: 'test-results/',
  timeout: 120000,
  expect: { timeout: 20000 },
  
  // ✅ ADDED: Global setup/teardown if you need them
  // globalSetup: require.resolve('./src/utils/globalSetup.ts'),
  // globalTeardown: require.resolve('./src/utils/globalTeardown.ts'),
});