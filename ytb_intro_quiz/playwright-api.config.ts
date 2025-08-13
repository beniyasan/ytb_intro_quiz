import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for API testing
 * Assumes the auth server is already running on localhost:3001
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/api-test-results.json' }]
  ],
  
  /* Test match patterns - only run our specific API tests */
  testMatch: '**/auth-api-comprehensive.spec.ts',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers - for API tests we only need one */
  projects: [
    {
      name: 'api-tests',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  /* Timeout settings */
  timeout: 30000,
  expect: {
    timeout: 10000
  },

  /* Global setup/teardown */
  globalTimeout: 600000, // 10 minutes for all tests
  
  /* No webServer needed - assuming external server is running */
});