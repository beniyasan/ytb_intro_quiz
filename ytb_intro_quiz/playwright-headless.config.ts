import { defineConfig, devices } from '@playwright/test';

/**
 * Headless Frontend Integration Test Configuration
 * Configuration for running tests in headless mode without browser dependencies
 */
export default defineConfig({
  testDir: './tests',
  
  /* Test file patterns */
  testMatch: [
    'simple-integration.spec.ts'
  ],
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  
  /* Retry configuration */
  retries: 1,
  
  /* Workers */
  workers: 1,
  
  /* Reporter configuration */
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'test-results/headless-integration/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/headless-integration/results.json' 
    }]
  ],
  
  /* Output directory */
  outputDir: 'test-results/headless-integration/artifacts',
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:8080',
    
    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',
    
    /* Capture screenshot */
    screenshot: 'only-on-failure',
    
    /* Record video */
    video: 'retain-on-failure',
    
    /* Browser viewport */
    viewport: { width: 1280, height: 720 },
    
    /* Headless mode */
    headless: true,
    
    /* Context options */
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },

  /* Configure projects */
  projects: [
    {
      name: 'chromium-headless',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],

  /* Test timeout */
  timeout: 30000,
  
  /* Expect timeout */
  expect: {
    timeout: 5000
  },
});