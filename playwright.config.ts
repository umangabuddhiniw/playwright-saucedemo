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
    
    screenshot: 'on',
    video: 'on', 
    trace: 'on',
    
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    viewport: { width: 1280, height: 720 },

    // CRITICAL FIX: CI-specific rendering configuration
    launchOptions: {
      args: process.env.CI ? [
        // GitHub CI-specific flags for proper rendering
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--window-size=1280,720',
        '--force-device-scale-factor=1', // ✅ Prevents scaling issues
        '--disable-gpu', // ✅ Essential for headless rendering
        '--disable-software-rasterizer',
        '--disable-font-subpixel-positioning',
        '--enable-font-antialiasing',
      ] : [
        // Local environment (your working setup)
        '--window-size=1280,720',
        '--disable-web-security',
      ]
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        
        screenshot: 'on',
        video: 'on',
        
        launchOptions: {
          slowMo: process.env.CI ? 100 : 50, // ✅ Slower for CI rendering
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