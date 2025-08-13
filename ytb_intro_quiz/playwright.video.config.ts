import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for video recording demos
 * This configuration enables headed browser mode and video recording
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false, // Disable parallel for cleaner video recording
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* No retries for video demos */
  retries: 0,
  /* Single worker for video recording */
  workers: 1,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'test-results/video-demo-report' }],
    ['json', { outputFile: 'test-results/video-demo-results.json' }]
  ],
  
  /* Shared settings optimized for video recording */
  use: {
    /* Base URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Always collect trace for video demos */
    trace: 'on',

    /* Always take screenshots */
    screenshot: 'on',
    
    /* Enable video recording for all tests */
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 }
    },

    /* Run in headed mode so we can see what's happening */
    headless: false,

    /* Slow down actions for better video visibility */
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    /* Viewport for optimal video recording */
    viewport: { width: 1280, height: 720 },
  },

  /* Configure projects for video recording */
  projects: [
    {
      name: 'video-demo-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Override headless setting
        headless: false,
        // Slow motion for better video recording
        slowMo: 1000
      },
    }
  ],

  /* Output directories */
  outputDir: 'test-results/videos',
  
  /* Global setup and teardown */
  globalSetup: undefined,
  globalTeardown: undefined,

  /* No web server - we'll start it manually */
  webServer: undefined,
});