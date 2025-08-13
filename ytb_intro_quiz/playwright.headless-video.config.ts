import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for headless video recording
 * This configuration works in environments without GUI dependencies
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/headless-video-report' }],
    ['json', { outputFile: 'test-results/headless-video-results.json' }]
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    
    // Enable video recording even in headless mode
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 }
    },

    // Run in headless mode (no GUI dependencies required)
    headless: true,

    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    viewport: { width: 1920, height: 1080 },
  },

  projects: [
    {
      name: 'headless-video-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
        // Add slow motion for better video recording
        slowMo: 500
      },
    }
  ],

  outputDir: 'test-results/videos',
});