import { defineConfig, devices } from '@playwright/test';

require('ts-node').register({
  transpileOnly: true,
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
    
    // FIXED: Always capture screenshots
    screenshot: 'on',
    
    // FIXED: Always record videos
    video: 'on',
    
    // FIXED: Always capture traces
    trace: 'on',
    
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        
        // DOUBLE ENSURED: Project-specific overrides
        screenshot: 'on',
        video: 'on',
        
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