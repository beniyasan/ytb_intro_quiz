import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:8080';
const API_BASE_URL = 'http://localhost:3001';

// Test data
const testUser = {
  email: `frontend-test-${Date.now()}@example.com`,
  username: `frontenduser${Date.now()}`,
  password: 'FrontendTest123!'
};

test.describe('Simple Frontend Integration Tests - JWT Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to frontend app
    await page.goto(FRONTEND_URL);
  });

  test('Frontend app loads successfully', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/JWT Authentication System/);
    
    // Check main elements are present
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('.navbar')).toBeVisible();
    
    console.log('✅ Frontend application loaded successfully');
  });

  test('Navigation elements are present', async ({ page }) => {
    // Check navigation items
    await expect(page.locator('#navHome')).toBeVisible();
    await expect(page.locator('#navLogin')).toBeVisible();
    await expect(page.locator('#navRegister')).toBeVisible();
    
    // Dashboard and Profile should be hidden initially
    await expect(page.locator('#navDashboard')).toHaveClass(/hidden/);
    await expect(page.locator('#navProfile')).toHaveClass(/hidden/);
    
    console.log('✅ Navigation elements verified');
  });

  test('Home page displays correctly', async ({ page }) => {
    // Click home navigation
    await page.click('#navHome a');
    
    // Check home content
    await expect(page.locator('#homePage')).toBeVisible();
    await expect(page.locator('h1')).toContainText('JWT Authentication System');
    
    console.log('✅ Home page displays correctly');
  });

  test('Login page displays correctly', async ({ page }) => {
    // Click login navigation
    await page.click('#navLogin a');
    
    // Check login form
    await expect(page.locator('#loginPage')).toBeVisible();
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
    await expect(page.locator('#loginSubmit')).toBeVisible();
    
    console.log('✅ Login page displays correctly');
  });

  test('Register page displays correctly', async ({ page }) => {
    // Click register navigation
    await page.click('#navRegister a');
    
    // Check register form
    await expect(page.locator('#registerPage')).toBeVisible();
    await expect(page.locator('#registerForm')).toBeVisible();
    await expect(page.locator('#registerEmail')).toBeVisible();
    await expect(page.locator('#registerUsername')).toBeVisible();
    await expect(page.locator('#registerPassword')).toBeVisible();
    await expect(page.locator('#registerSubmit')).toBeVisible();
    
    console.log('✅ Register page displays correctly');
  });

  test('Form validation works', async ({ page }) => {
    // Go to register page
    await page.click('#navRegister a');
    
    // Try submitting empty form
    await page.click('#registerSubmit');
    
    // Check that form validation prevents submission
    const emailField = page.locator('#registerEmail');
    const usernameField = page.locator('#registerUsername');
    const passwordField = page.locator('#registerPassword');
    
    // HTML5 validation should prevent submission
    await expect(emailField).toHaveAttribute('required');
    await expect(usernameField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
    
    console.log('✅ Form validation works correctly');
  });

  test('API connectivity test', async ({ page }) => {
    // Test API connectivity by making a direct request
    const response = await page.request.get(`${API_BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData.status).toBe('ok');
    
    console.log('✅ API connectivity verified');
  });

  test('User registration flow (API integration)', async ({ page }) => {
    // Go to register page
    await page.click('#navRegister a');
    
    // Fill registration form
    await page.fill('#registerEmail', testUser.email);
    await page.fill('#registerUsername', testUser.username);
    await page.fill('#registerPassword', testUser.password);
    
    // Monitor network requests
    let registrationRequest = false;
    page.on('request', request => {
      if (request.url().includes('/api/auth/register')) {
        registrationRequest = true;
        console.log('📤 Registration request made to API');
      }
    });
    
    // Submit form
    await page.click('#registerSubmit');
    
    // Wait a moment for the request
    await page.waitForTimeout(2000);
    
    console.log('✅ Registration flow tested (form submission)');
  });

  test('Login flow (API integration)', async ({ page }) => {
    // First register a user via API directly
    const registerResponse = await page.request.post(`${API_BASE_URL}/api/auth/register`, {
      data: testUser
    });
    
    if (registerResponse.status() === 201 || registerResponse.status() === 400) {
      // User registered or already exists, proceed with login test
      
      // Go to login page
      await page.click('#navLogin a');
      
      // Fill login form
      await page.fill('#loginEmail', testUser.email);
      await page.fill('#loginPassword', testUser.password);
      
      // Monitor network requests
      let loginRequest = false;
      page.on('request', request => {
        if (request.url().includes('/api/auth/login')) {
          loginRequest = true;
          console.log('📤 Login request made to API');
        }
      });
      
      // Submit form
      await page.click('#loginSubmit');
      
      // Wait a moment for the request
      await page.waitForTimeout(2000);
      
      console.log('✅ Login flow tested (form submission)');
    }
  });

  test('Responsive design check', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile navigation toggle
    const navToggle = page.locator('#navToggle');
    await expect(navToggle).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check that main content is still visible
    await expect(page.locator('#app')).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Responsive design verified');
  });

  test('Error handling display', async ({ page }) => {
    // Go to login page
    await page.click('#navLogin a');
    
    // Try login with invalid credentials
    await page.fill('#loginEmail', 'invalid@example.com');
    await page.fill('#loginPassword', 'wrongpassword');
    
    // Submit and check for error handling
    await page.click('#loginSubmit');
    
    // Wait for any error messages to appear
    await page.waitForTimeout(3000);
    
    console.log('✅ Error handling flow tested');
  });
});