import { defineConfig, devices } from '@playwright/test';

/**
 * Simple Frontend Integration Test Configuration
 * Minimal configuration for JWT Authentication System frontend testing without webServer
 */
export default defineConfig({
  testDir: './tests',
  
  /* Test file patterns */
  testMatch: [
    'frontend-integration.spec.ts'
  ],
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for better debugging
  
  /* Retry configuration */
  retries: 1,
  
  /* Workers */
  workers: 1, // Single worker for debugging
  
  /* Reporter configuration */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/frontend-integration/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/frontend-integration/results.json' 
    }],
    ['list']
  ],
  
  /* Output directory */
  outputDir: 'test-results/frontend-integration/artifacts',
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like await page.goto('/') */
    baseURL: 'http://localhost:8080',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Capture screenshot after each test failure */
    screenshot: 'only-on-failure',
    
    /* Record video for failed tests */
    video: 'retain-on-failure',
    
    /* Browser viewport */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Context options */
    contextOptions: {
      // Grant permissions
      permissions: ['geolocation'],
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use visible browser for debugging
        headless: false,
      },
    },
  ],

  /* Test timeout */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000
  },
});