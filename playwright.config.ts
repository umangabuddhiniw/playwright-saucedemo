import { defineConfig, devices } from '@playwright/test';

// CRITICAL FIX: This ensures TypeScript files are compiled in CI
require('ts-node').register({
  transpileOnly: true, // Skip type checking to avoid errors
  compilerOptions: {
    module: 'commonjs'
  }
});

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
    
    // Enhanced screenshot configuration
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // Video configuration
    video: process.env.CI ? 'retain-on-failure' : 'on',
    
    // Trace configuration
    trace: process.env.CI ? 'on-first-retry' : 'on',
    
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    
    // Add viewport here for all projects
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        
        launchOptions: {
          slowMo: process.env.CI ? 0 : 100,
          args: [
            '--window-size=1280,720',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },
  ],

  outputDir: 'test-results/',
  timeout: 120000,
  expect: { 
    timeout: 25000 
  },
});