import { defineConfig, devices } from '@playwright/test';

/**
 * Frontend Integration Test Configuration
 * Comprehensive Playwright configuration for JWT Authentication System frontend testing
 */
export default defineConfig({
  testDir: './tests',
  
  /* Test file patterns for frontend integration tests */
  testMatch: [
    'frontend-integration.spec.ts',
    'cross-browser.spec.ts',
    'security-integration.spec.ts'
  ],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI for more stable results */
  workers: process.env.CI ? 2 : undefined,
  
  /* Reporter configuration for comprehensive reporting */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/frontend-integration-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results/frontend-integration-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/frontend-integration-junit.xml' 
    }],
    ['list'],
    ['dot']
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL for frontend application */
    baseURL: process.env.FRONTEND_URL || 'http://localhost:8080',
    
    /* Collect trace on first retry of the failed test */
    trace: 'retain-on-failure',
    
    /* Record video for failed tests */
    video: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Global timeout for all tests */
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors for development */
    ignoreHTTPSErrors: true,
    
    /* Viewport settings */
    viewport: { width: 1280, height: 720 },
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  /* Global test timeout */
  timeout: 60000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },

  /* Configure projects for major browsers and scenarios */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    /* Desktop Chrome - Primary testing browser */
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup'],
    },

    /* Desktop Firefox */
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox']
      },
      dependencies: ['setup'],
    },

    /* Desktop Safari/WebKit */
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari']
      },
      dependencies: ['setup'],
    },

    /* Mobile Chrome */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5']
      },
      dependencies: ['setup'],
    },

    /* Mobile Safari */
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12']
      },
      dependencies: ['setup'],
    },

    /* Tablet testing */
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro']
      },
      dependencies: ['setup'],
    },

    /* High DPI testing */
    {
      name: 'Desktop Chrome HiDPI',
      use: { 
        ...devices['Desktop Chrome HiDPI']
      },
      dependencies: ['setup'],
    },

    /* Edge browser testing */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
      dependencies: ['setup'],
    },

    /* Security-focused testing */
    {
      name: 'Security Tests',
      testMatch: '**/security-integration.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional security-focused settings
        javaScriptEnabled: true,
        acceptDownloads: false,
      },
      dependencies: ['setup'],
    },

    /* Performance testing */
    {
      name: 'Performance Tests',
      testMatch: '**/frontend-integration.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance monitoring settings
        trace: 'on',
        video: 'on',
      },
      dependencies: ['setup'],
    },

    /* Accessibility testing */
    {
      name: 'Accessibility Tests',
      testMatch: '**/cross-browser.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Accessibility-focused settings
        reducedMotion: 'reduce',
        forcedColors: 'none',
      },
      dependencies: ['setup'],
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Output directory for test artifacts */
  outputDir: 'test-results/artifacts',

  /* Web Server configuration - start frontend server if not running */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3001', // Backend API
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        PORT: '3001',
        NODE_ENV: 'test'
      }
    },
    {
      command: 'npx http-server public -p 8080 -c-1 --cors',
      url: 'http://localhost:8080', // Frontend static server
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
    }
  ],

  /* Metadata for test reporting */
  metadata: {
    testType: 'Frontend Integration Tests',
    framework: 'Playwright',
    application: 'JWT Authentication System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    baseURL: process.env.FRONTEND_URL || 'http://localhost:8080',
    apiURL: process.env.API_URL || 'http://localhost:3001'
  }
});

/* Environment-specific configuration overrides */
if (process.env.CI) {
  // CI-specific settings
  module.exports.use = {
    ...module.exports.use,
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  };
}

if (process.env.DEBUG === 'true') {
  // Debug mode settings
  module.exports.use = {
    ...module.exports.use,
    headless: false,
    slowMo: 500,
    video: 'on',
    screenshot: 'on',
    trace: 'on'
  };
}