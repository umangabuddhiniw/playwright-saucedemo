import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests',
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  
  globalSetup: './src/tests/global-setup.ts',
  globalTeardown: './src/tests/global-teardown.ts',
  
  // 🔥 FIXED: Use TypeScript reporter in both environments
  reporter: [
    ['list'],
    ['./src/utils/testRunner.ts'],  // ✅ TypeScript in both local and CI
    ['html', { 
      outputFolder: 'playwright-report', 
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit-results.xml' 
    }]
  ],
  
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 }
    },
    
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    trace: process.env.CI ? 'retain-on-failure' : 'on',
    
    ignoreHTTPSErrors: true,
    actionTimeout: process.env.CI ? 60000 : 30000,
    navigationTimeout: process.env.CI ? 90000 : 45000,
    viewport: { width: 1280, height: 720 },

    launchOptions: {
      args: process.env.CI ? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--window-size=1280,720'
      ] : [
        '--window-size=1280,720',
        '--disable-web-security'
      ],
      slowMo: process.env.CI ? 100 : 50,
      headless: process.env.CI ? true : false
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    }
  ],

  outputDir: 'test-results/',
  
  timeout: process.env.CI ? 240000 : 180000,
  expect: { 
    timeout: process.env.CI ? 45000 : 30000 
  },
});

console.log('🎯 PLAYWRIGHT CONFIGURATION LOADED:', {
  ci: !!process.env.CI,
  video: 'on',
  workers: process.env.CI ? 1 : 1
});