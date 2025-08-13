import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global Setup for Frontend Integration Tests
 * Prepares the test environment and ensures all services are ready
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Global Setup for Frontend Integration Tests');
  
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:8080';
  const apiURL = process.env.API_URL || 'http://localhost:3001';
  
  console.log('🔧 Configuration:');
  console.log(`   Frontend URL: ${baseURL}`);
  console.log(`   API URL: ${apiURL}`);
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for backend API to be ready
    console.log('⏳ Waiting for API server to be ready...');
    await waitForService(`${apiURL}/api/health`, 'API Server');
    
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend server to be ready...');
    await waitForService(baseURL, 'Frontend Server');
    
    // Verify API endpoints are accessible
    console.log('🔍 Verifying API endpoints...');
    await verifyAPIEndpoints(page, apiURL);
    
    // Verify frontend application loads correctly
    console.log('🔍 Verifying frontend application...');
    await verifyFrontendApplication(page, baseURL);
    
    // Clean up any existing test data
    console.log('🧹 Cleaning up test data...');
    await cleanupTestData(page, apiURL);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Wait for a service to be ready
 */
async function waitForService(url: string, serviceName: string): Promise<void> {
  const maxAttempts = 30;
  const delayMs = 2000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error) {
      console.log(`⏳ ${serviceName} not ready yet (attempt ${attempt}/${maxAttempts})`);
    }
    
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
  
  throw new Error(`${serviceName} failed to start after ${maxAttempts} attempts`);
}

/**
 * Verify API endpoints are working
 */
async function verifyAPIEndpoints(page: any, apiURL: string): Promise<void> {
  const endpoints = [
    '/api/health',
    '/api/auth/validate' // This will return 401 but should not error
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await page.request.get(`${apiURL}${endpoint}`);
      console.log(`   ${endpoint}: ${response.status()}`);
      
      // Health endpoint should return 200
      if (endpoint === '/api/health' && response.status() !== 200) {
        throw new Error(`Health check failed: ${response.status()}`);
      }
    } catch (error) {
      console.warn(`   Warning: ${endpoint} - ${error.message}`);
    }
  }
}

/**
 * Verify frontend application loads and basic functionality works
 */
async function verifyFrontendApplication(page: any, baseURL: string): Promise<void> {
  // Navigate to the application
  await page.goto(baseURL);
  
  // Wait for the app to load
  await page.waitForSelector('#app', { timeout: 30000 });
  
  // Verify basic structure
  const appVisible = await page.locator('#app').isVisible();
  if (!appVisible) {
    throw new Error('Frontend application failed to load - #app element not visible');
  }
  
  // Check for JavaScript errors
  const errors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Wait a bit for any initialization errors
  await page.waitForTimeout(3000);
  
  if (errors.length > 0) {
    console.warn('⚠️ Frontend console errors detected:', errors);
  }
  
  // Verify navigation works
  const navBar = await page.locator('.navbar').isVisible();
  if (!navBar) {
    throw new Error('Navigation bar not found');
  }
  
  console.log('✅ Frontend application verified');
}

/**
 * Clean up any existing test data
 */
async function cleanupTestData(page: any, apiURL: string): Promise<void> {
  // Clear any browser storage that might interfere with tests
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Note: In a real application, you might want to clean up test database records here
  // For this demo, we'll just clear browser storage
  
  console.log('✅ Test data cleanup completed');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default globalSetup;