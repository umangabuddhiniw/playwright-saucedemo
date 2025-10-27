// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// ✅ ENHANCED: Better ts-node registration for TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2022',
    esModuleInterop: true,
    skipLibCheck: true
  }
});

export default defineConfig({
  testDir: './src/tests',
  
  // ✅ OPTIMIZED for CI and Local
  fullyParallel: false, // 🎯 Better for CI stability and video recording
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // 🎯 Single worker for reliable video recording
  
  globalSetup: './src/tests/global-setup.ts',
  globalTeardown: './src/tests/global-teardown.ts',
  
  // ✅ ROBUST reporter configuration
  reporter: [
    ['list'],
    ['./src/utils/testRunner.ts'],
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
  
  // ✅ ULTIMATE FIX: Video and screenshot configuration for CI
  use: {
    baseURL: 'https://www.saucedemo.com',
    
    // 🎯 CRITICAL FIX: Video configuration - ALWAYS RECORD VIDEOS
    video: {
      mode: 'on', // 🎯 CHANGED: Always record videos in both CI and local
      size: { width: 1280, height: 720 }
    },
    
    // 🎯 CRITICAL: Screenshot configuration
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    
    // 🎯 CRITICAL: Trace configuration
    trace: process.env.CI ? 'retain-on-failure' : 'on',
    
    // Network and navigation - OPTIMIZED for CI video recording
    ignoreHTTPSErrors: true,
    actionTimeout: process.env.CI ? 60000 : 30000, // 🎯 Higher timeout for CI video recording
    navigationTimeout: process.env.CI ? 90000 : 45000, // 🎯 Higher timeout for CI video recording
    viewport: { width: 1280, height: 720 },

    // 🎯 ULTIMATE FIX: Launch options for CI video recording and rendering
    launchOptions: {
      args: process.env.CI ? [
        // 🎯 CRITICAL: CI-specific optimizations for video recording
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows', 
        '--disable-renderer-backgrounding',
        '--window-size=1280,720',
        '--force-device-scale-factor=1',
        
        // 🎯 CRITICAL: Graphics optimizations for video recording
        '--use-gl=egl',
        '--enable-webgl',
        '--disable-software-rasterizer',
        '--disable-gpu-sandbox',
        '--enable-accelerated-2d-canvas',
        '--enable-gpu-rasterization',
        
        // 🎯 CRITICAL: Performance optimizations for video
        '--disable-frame-rate-limit',
        '--disable-vsync',
        '--max-active-webgl-contexts=100',
        '--disable-partial-raster',
        '--disable-skia-runtime-opts',
        
        // 🎯 CRITICAL: Memory optimizations
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ] : [
        // Local development settings
        '--window-size=1280,720',
        '--disable-web-security',
        '--enable-gpu-rasterization',
        '--enable-accelerated-2d-canvas'
      ],
      
      // 🎯 CRITICAL: Slower execution for reliable video recording
      slowMo: process.env.CI ? 300 : 100,
      
      // 🎯 CRITICAL: Headless mode configuration
      headless: process.env.CI ? true : false
    }
  },

  // 🎯 OPTIMIZED: Chromium-only project configuration for video recording
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        
        // 🎯 ENHANCED: CI-specific settings for video recording
        ...(process.env.CI && {
          launchOptions: {
            args: [
              '--no-sandbox',
              '--disable-dev-shm-usage',
              '--disable-web-security',
              '--window-size=1280,720',
              '--force-device-scale-factor=1',
              '--use-gl=egl',
              '--enable-webgl',
              '--enable-accelerated-2d-canvas',
              '--enable-gpu-rasterization',
              '--disable-software-rasterizer',
              '--disable-frame-rate-limit',
              '--disable-vsync'
            ],
            slowMo: 300,
            headless: true
          }
        })
      },
    }
  ],

  // 🎯 CRITICAL: Output directory for videos and artifacts
  outputDir: 'test-results/',
  
  // 🎯 ULTIMATE FIX: Timeout configuration for video recording
  timeout: process.env.CI ? 240000 : 180000, // 🎯 4 minutes for CI, 3 minutes for local
  
  expect: { 
    timeout: process.env.CI ? 45000 : 30000 // 🎯 Higher expect timeout for CI video recording
  },
});

// 🎯 ENHANCED: Configuration logging
console.log('🎯 ULTIMATE PLAYWRIGHT CONFIGURATION - VIDEO GUARANTEED:', {
  ci: !!process.env.CI,
  video: {
    mode: 'on', // 🎯 CHANGED: Always record videos
    recording: 'GUARANTEED - ALWAYS ON'
  },
  timeouts: {
    action: process.env.CI ? 60000 : 30000,
    navigation: process.env.CI ? 90000 : 45000,
    test: process.env.CI ? 240000 : 180000,
    expect: process.env.CI ? 45000 : 30000
  },
  workers: process.env.CI ? 1 : 1,
  parallel: false,
  browsers: ['chromium'],
  videoRecording: 'GUARANTEED IN BOTH CI AND LOCAL'
});