import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:8080'; // Frontend server URL
const API_BASE_URL = 'http://localhost:3001';  // Backend API URL

// Test data
const testUser = {
  email: `frontend-test-${Date.now()}@example.com`,
  username: `frontenduser${Date.now()}`,
  password: 'FrontendTest123!'
};

let authTokens = {
  accessToken: '',
  refreshToken: ''
};

test.describe('Frontend Integration Tests - JWT Authentication System', () => {
  
  test.beforeAll(async () => {
    console.log('🧪 Starting Frontend Integration Tests');
    console.log('📍 Frontend URL:', FRONTEND_URL);
    console.log('📍 API URL:', API_BASE_URL);
    console.log('👤 Test User:', testUser.email);
  });

  test.beforeEach(async ({ page }) => {
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Browser Error: ${msg.text()}`);
      }
    });

    // Set up request/response logging
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('Frontend Application Loading and Initial State', async ({ page }) => {
    // Navigate to frontend application
    await page.goto(FRONTEND_URL);
    
    // Wait for application to load
    await page.waitForSelector('#app', { timeout: 10000 });
    
    // Check page title
    await expect(page).toHaveTitle(/JWT Authentication System/);
    
    // Verify initial page is home
    await expect(page.locator('#homePage')).toBeVisible();
    await expect(page.locator('#homePage')).toHaveClass(/active/);
    
    // Verify navigation elements
    await expect(page.locator('.nav-brand')).toContainText('JWT Auth System');
    await expect(page.locator('#navHome')).toBeVisible();
    await expect(page.locator('#navLogin')).toBeVisible();
    await expect(page.locator('#navRegister')).toBeVisible();
    
    // Verify private navigation items are hidden
    await expect(page.locator('#navDashboard')).toHaveClass(/hidden/);
    await expect(page.locator('#navProfile')).toHaveClass(/hidden/);
    await expect(page.locator('#navLogout')).toHaveClass(/hidden/);
    
    // Check hero section
    await expect(page.locator('.hero-title')).toContainText('JWT Authentication System');
    await expect(page.locator('.hero-subtitle')).toBeVisible();
    
    // Check feature cards
    await expect(page.locator('.feature-card')).toHaveCount(4);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/frontend-initial-load.png', fullPage: true });
    
    console.log('✅ Frontend application loaded successfully');
  });

  test('Navigation and Page Transitions', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('#app');
    
    // Test navigation to login page
    await page.click('#navLogin a');
    await page.waitForSelector('#loginPage.active');
    
    // Verify login page is active
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    await expect(page.locator('#homePage')).not.toHaveClass(/active/);
    
    // Check URL hash
    await expect(page).toHaveURL(/#login$/);
    
    // Verify login form elements
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
    
    // Test navigation to register page
    await page.click('a[href="#register"]');
    await page.waitForSelector('#registerPage.active');
    
    // Verify register page is active
    await expect(page.locator('#registerPage')).toHaveClass(/active/);
    await expect(page.locator('#loginPage')).not.toHaveClass(/active/);
    
    // Check URL hash
    await expect(page).toHaveURL(/#register$/);
    
    // Verify register form elements
    await expect(page.locator('#registerForm')).toBeVisible();
    await expect(page.locator('#registerUsername')).toBeVisible();
    await expect(page.locator('#registerEmail')).toBeVisible();
    await expect(page.locator('#registerPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    
    // Test back navigation
    await page.goBack();
    await page.waitForSelector('#loginPage.active');
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    
    // Test forward navigation
    await page.goForward();
    await page.waitForSelector('#registerPage.active');
    await expect(page.locator('#registerPage')).toHaveClass(/active/);
    
    // Test home navigation
    await page.click('#navHome a');
    await page.waitForSelector('#homePage.active');
    await expect(page.locator('#homePage')).toHaveClass(/active/);
    
    console.log('✅ Navigation and page transitions working correctly');
  });

  test('User Registration Process', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#register`);
    await page.waitForSelector('#registerPage.active');
    
    // Fill registration form
    await page.fill('#registerUsername', testUser.username);
    await page.fill('#registerEmail', testUser.email);
    await page.fill('#registerPassword', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    
    // Verify password strength indicator
    await expect(page.locator('.strength-fill')).toBeVisible();
    await expect(page.locator('.strength-text')).toContainText(/Strong password|Good password/);
    
    // Test form validation
    await page.fill('#registerEmail', 'invalid-email');
    await page.blur('#registerEmail');
    await expect(page.locator('#registerEmailError')).toContainText(/valid email/);
    
    // Fix email and continue
    await page.fill('#registerEmail', testUser.email);
    await page.blur('#registerEmail');
    await expect(page.locator('#registerEmailError')).toBeEmpty();
    
    // Test password mismatch
    await page.fill('#confirmPassword', 'different-password');
    await page.blur('#confirmPassword');
    await expect(page.locator('#confirmPasswordError')).toContainText(/do not match/);
    
    // Fix password and continue
    await page.fill('#confirmPassword', testUser.password);
    await page.blur('#confirmPassword');
    await expect(page.locator('#confirmPasswordError')).toBeEmpty();
    
    // Submit registration
    await page.click('#registerBtn');
    
    // Wait for loading state
    await expect(page.locator('#registerBtn')).toBeDisabled();
    await expect(page.locator('.btn-loader')).toBeVisible();
    
    // Wait for registration completion
    await page.waitForSelector('#loginPage.active', { timeout: 15000 });
    
    // Verify redirect to login page
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    
    // Check for success toast
    await expect(page.locator('.toast.success')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/registration-success.png', fullPage: true });
    
    console.log('✅ User registration completed successfully');
  });

  test('User Login Process', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    
    // Fill login form with incorrect credentials
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', 'wrong-password');
    await page.click('#loginBtn');
    
    // Wait for error response
    await page.waitForSelector('.alert.error, #loginAlert.error', { timeout: 10000 });
    
    // Verify error message
    const alertVisible = await page.locator('.alert.error, #loginAlert.error').isVisible();
    expect(alertVisible).toBe(true);
    
    // Clear form and try with correct credentials
    await page.fill('#loginPassword', testUser.password);
    
    // Check remember me option
    await page.check('#rememberMe');
    
    // Submit login
    await page.click('#loginBtn');
    
    // Wait for loading state
    await expect(page.locator('#loginBtn')).toBeDisabled();
    await expect(page.locator('.btn-loader')).toBeVisible();
    
    // Wait for successful login (redirect to dashboard)
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Verify redirect to dashboard
    await expect(page.locator('#dashboardPage')).toHaveClass(/active/);
    await expect(page).toHaveURL(/#dashboard$/);
    
    // Verify navigation items changed
    await expect(page.locator('#navLogin')).toHaveClass(/hidden/);
    await expect(page.locator('#navRegister')).toHaveClass(/hidden/);
    await expect(page.locator('#navDashboard')).not.toHaveClass(/hidden/);
    await expect(page.locator('#navProfile')).not.toHaveClass(/hidden/);
    await expect(page.locator('#navLogout')).not.toHaveClass(/hidden/);
    
    // Check for success toast
    await expect(page.locator('.toast.success')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/login-success.png', fullPage: true });
    
    console.log('✅ User login completed successfully');
  });

  test('Dashboard Functionality', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Verify dashboard components
    await expect(page.locator('.dashboard-header h2')).toContainText('User Dashboard');
    
    // Check dashboard cards
    await expect(page.locator('.dashboard-card')).toHaveCount(4);
    
    // Verify user info card
    const userInfoCard = page.locator('.dashboard-card').first();
    await expect(userInfoCard.locator('.card-header h3')).toContainText('User Information');
    await expect(userInfoCard.locator('#userInfo')).toBeVisible();
    
    // Check if user data is populated
    await expect(userInfoCard.locator('.user-detail')).toHaveCount.greaterThan(0);
    
    // Verify token info card
    const tokenInfoCard = page.locator('.dashboard-card').nth(1);
    await expect(tokenInfoCard.locator('.card-header h3')).toContainText('Token Information');
    await expect(tokenInfoCard.locator('#tokenInfo')).toBeVisible();
    
    // Verify quick actions card
    const actionsCard = page.locator('.dashboard-card').nth(2);
    await expect(actionsCard.locator('.card-header h3')).toContainText('Quick Actions');
    await expect(actionsCard.locator('.action-buttons')).toBeVisible();
    
    // Verify action buttons
    await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh Token")')).toBeVisible();
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    
    // Verify security status card
    const securityCard = page.locator('.dashboard-card').nth(3);
    await expect(securityCard.locator('.card-header h3')).toContainText('Security Status');
    await expect(securityCard.locator('#securityStatus')).toBeVisible();
    
    // Test refresh token functionality
    await page.click('button:has-text("Refresh Token")');
    
    // Wait for potential toast notification
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/dashboard-view.png', fullPage: true });
    
    console.log('✅ Dashboard functionality verified');
  });

  test('Profile Management', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Navigate to profile page
    await page.click('#navProfile a');
    await page.waitForSelector('#profilePage.active');
    
    // Verify profile page
    await expect(page.locator('#profilePage')).toHaveClass(/active/);
    await expect(page.locator('.profile-header h2')).toContainText('Profile Management');
    
    // Verify tabs
    await expect(page.locator('.profile-tabs')).toBeVisible();
    await expect(page.locator('.tab-btn:has-text("Profile Info")')).toHaveClass(/active/);
    
    // Verify profile info tab is active
    await expect(page.locator('#profileInfoTab')).toHaveClass(/active/);
    
    // Check if form is populated with user data
    const usernameInput = page.locator('#profileUsername');
    const emailInput = page.locator('#profileEmail');
    
    await expect(usernameInput).toHaveValue(testUser.username);
    await expect(emailInput).toHaveValue(testUser.email);
    
    // Test profile update
    const updatedUsername = `${testUser.username}_updated`;
    await usernameInput.fill(updatedUsername);
    
    // Submit profile update
    await page.click('#updateProfileBtn');
    
    // Wait for loading state
    await expect(page.locator('#updateProfileBtn')).toBeDisabled();
    
    // Wait for update completion
    await page.waitForTimeout(3000);
    
    // Check for success toast
    await expect(page.locator('.toast.success')).toBeVisible();
    
    // Switch to security tab
    await page.click('.tab-btn:has-text("Security")');
    await page.waitForSelector('#profileSecurityTab.active');
    
    // Verify security tab
    await expect(page.locator('#profileSecurityTab')).toHaveClass(/active/);
    await expect(page.locator('#profileInfoTab')).not.toHaveClass(/active/);
    
    // Test password change form
    await expect(page.locator('#passwordForm')).toBeVisible();
    await expect(page.locator('#currentPassword')).toBeVisible();
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmNewPassword')).toBeVisible();
    
    // Fill password change form
    await page.fill('#currentPassword', testUser.password);
    await page.fill('#newPassword', 'NewPassword123!');
    await page.fill('#confirmNewPassword', 'NewPassword123!');
    
    // Test password validation
    await page.fill('#confirmNewPassword', 'DifferentPassword');
    await page.blur('#confirmNewPassword');
    await expect(page.locator('#confirmNewPasswordError')).toContainText(/do not match/);
    
    // Fix password and submit
    await page.fill('#confirmNewPassword', 'NewPassword123!');
    await page.click('#changePasswordBtn');
    
    // Wait for loading state
    await expect(page.locator('#changePasswordBtn')).toBeDisabled();
    
    // Wait for completion
    await page.waitForTimeout(3000);
    
    // Check for success toast
    await expect(page.locator('.toast.success')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/profile-management.png', fullPage: true });
    
    console.log('✅ Profile management functionality verified');
  });

  test('Token Management and Security', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', 'NewPassword123!'); // Updated password from previous test
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Test protected route access
    await page.goto(`${FRONTEND_URL}#profile`);
    await page.waitForSelector('#profilePage.active');
    
    // Should be able to access profile page when authenticated
    await expect(page.locator('#profilePage')).toHaveClass(/active/);
    
    // Test token validation by checking dashboard data
    await page.goto(`${FRONTEND_URL}#dashboard`);
    await page.waitForSelector('#dashboardPage.active');
    
    // Wait for dashboard to load user data
    await page.waitForTimeout(2000);
    
    // Verify token info is displayed
    const tokenInfo = page.locator('#tokenInfo');
    await expect(tokenInfo).toBeVisible();
    
    // Test manual token refresh
    await page.click('button:has-text("Refresh Token")');
    
    // Wait for refresh to complete
    await page.waitForTimeout(3000);
    
    // Verify token info is still displayed (should be updated)
    await expect(tokenInfo).toBeVisible();
    
    console.log('✅ Token management and security verified');
  });

  test('Form Validation and Security', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#register`);
    await page.waitForSelector('#registerPage.active');
    
    // Test XSS prevention in forms
    const xssPayload = '<script>alert("xss")</script>';
    
    await page.fill('#registerUsername', xssPayload);
    await page.blur('#registerUsername');
    
    // Verify XSS payload is not executed and shows validation error
    await expect(page.locator('#registerUsernameError')).toBeVisible();
    
    // Test SQL injection prevention
    const sqlPayload = "'; DROP TABLE users; --";
    await page.fill('#registerEmail', sqlPayload);
    await page.blur('#registerEmail');
    
    // Should show email validation error
    await expect(page.locator('#registerEmailError')).toContainText(/valid email/);
    
    // Test password complexity requirements
    await page.fill('#registerPassword', '123');
    await page.blur('#registerPassword');
    
    // Should show password strength indicator as weak
    await expect(page.locator('.strength-fill.weak')).toBeVisible();
    
    // Test strong password
    await page.fill('#registerPassword', 'StrongPassword123!');
    await page.blur('#registerPassword');
    
    // Should show strong password indicator
    await expect(page.locator('.strength-fill.strong')).toBeVisible();
    
    // Test required field validation
    await page.fill('#registerUsername', '');
    await page.blur('#registerUsername');
    await expect(page.locator('#registerUsernameError')).toContainText(/required/);
    
    console.log('✅ Form validation and security features verified');
  });

  test('Mobile Responsiveness', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('#app');
    
    // Test mobile navigation
    const navToggle = page.locator('#navToggle');
    const navMenu = page.locator('#navMenu');
    
    // Navigation menu should be hidden initially
    await expect(navMenu).not.toHaveClass(/active/);
    
    // Click hamburger menu
    await navToggle.click();
    
    // Menu should become visible
    await expect(navMenu).toHaveClass(/active/);
    
    // Click menu item
    await page.click('#navLogin a');
    
    // Menu should close and navigate to login
    await expect(navMenu).not.toHaveClass(/active/);
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    
    // Test form layouts on mobile
    await expect(page.locator('.auth-container')).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/screenshots/mobile-view.png', fullPage: true });
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Mobile responsiveness verified');
  });

  test('Error Handling and Recovery', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('#app');
    
    // Test API error handling by attempting login with network failure
    // We'll simulate this by trying to login when backend might be unavailable
    
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    
    // Fill form with invalid credentials to test error handling
    await page.fill('#loginEmail', 'nonexistent@example.com');
    await page.fill('#loginPassword', 'wrongpassword');
    await page.click('#loginBtn');
    
    // Wait for error response
    await page.waitForSelector('.alert.error', { timeout: 15000 });
    
    // Verify error message is shown
    await expect(page.locator('.alert.error')).toBeVisible();
    
    // Test recovery by trying valid credentials
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', 'NewPassword123!');
    await page.click('#loginBtn');
    
    // Should successfully login
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    await expect(page.locator('#dashboardPage')).toHaveClass(/active/);
    
    console.log('✅ Error handling and recovery verified');
  });

  test('Logout Process', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', 'NewPassword123!');
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Click logout
    await page.click('#navLogout a');
    
    // Wait for logout to complete
    await page.waitForSelector('#loginPage.active', { timeout: 10000 });
    
    // Verify redirect to login page
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    
    // Verify navigation items changed back
    await expect(page.locator('#navLogin')).not.toHaveClass(/hidden/);
    await expect(page.locator('#navRegister')).not.toHaveClass(/hidden/);
    await expect(page.locator('#navDashboard')).toHaveClass(/hidden/);
    await expect(page.locator('#navProfile')).toHaveClass(/hidden/);
    await expect(page.locator('#navLogout')).toHaveClass(/hidden/);
    
    // Check for success toast
    await expect(page.locator('.toast.success')).toBeVisible();
    
    // Test that protected pages are no longer accessible
    await page.goto(`${FRONTEND_URL}#dashboard`);
    
    // Should be redirected to login with warning
    await page.waitForSelector('#loginPage.active');
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    await expect(page.locator('.toast.warning')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/logout-complete.png', fullPage: true });
    
    console.log('✅ Logout process verified');
  });

  test('Session Management and Auto-refresh', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', 'NewPassword123!');
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Wait on dashboard to let token potentially refresh
    await page.waitForTimeout(5000);
    
    // Verify still authenticated
    await expect(page.locator('#dashboardPage')).toHaveClass(/active/);
    
    // Test page visibility changes (simulate tab switching)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Should still be authenticated
    await expect(page.locator('#dashboardPage')).toHaveClass(/active/);
    
    console.log('✅ Session management and auto-refresh verified');
  });

  test('Complete User Journey - End to End', async ({ page }) => {
    console.log('🎯 Starting complete user journey test...');
    
    // Step 1: Visit home page
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('#homePage.active');
    await page.screenshot({ path: 'test-results/screenshots/journey-01-home.png' });
    
    // Step 2: Navigate to register
    await page.click('button:has-text("Register")');
    await page.waitForSelector('#registerPage.active');
    await page.screenshot({ path: 'test-results/screenshots/journey-02-register.png' });
    
    // Step 3: Complete registration
    const journeyUser = {
      email: `journey-test-${Date.now()}@example.com`,
      username: `journeyuser${Date.now()}`,
      password: 'JourneyTest123!'
    };
    
    await page.fill('#registerUsername', journeyUser.username);
    await page.fill('#registerEmail', journeyUser.email);
    await page.fill('#registerPassword', journeyUser.password);
    await page.fill('#confirmPassword', journeyUser.password);
    await page.click('#registerBtn');
    await page.waitForSelector('#loginPage.active', { timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/journey-03-register-success.png' });
    
    // Step 4: Login
    await page.fill('#loginEmail', journeyUser.email);
    await page.fill('#loginPassword', journeyUser.password);
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/journey-04-login-success.png' });
    
    // Step 5: Explore dashboard
    await page.waitForTimeout(2000); // Let dashboard load
    await page.screenshot({ path: 'test-results/screenshots/journey-05-dashboard.png', fullPage: true });
    
    // Step 6: Update profile
    await page.click('#navProfile a');
    await page.waitForSelector('#profilePage.active');
    await page.fill('#profileUsername', `${journeyUser.username}_updated`);
    await page.click('#updateProfileBtn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/screenshots/journey-06-profile-update.png' });
    
    // Step 7: Change password
    await page.click('.tab-btn:has-text("Security")');
    await page.waitForSelector('#profileSecurityTab.active');
    await page.fill('#currentPassword', journeyUser.password);
    await page.fill('#newPassword', 'UpdatedPassword123!');
    await page.fill('#confirmNewPassword', 'UpdatedPassword123!');
    await page.click('#changePasswordBtn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/screenshots/journey-07-password-change.png' });
    
    // Step 8: Return to dashboard
    await page.click('#navDashboard a');
    await page.waitForSelector('#dashboardPage.active');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/journey-08-dashboard-return.png' });
    
    // Step 9: Logout
    await page.click('#navLogout a');
    await page.waitForSelector('#loginPage.active', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/journey-09-logout.png' });
    
    // Step 10: Login with new password
    await page.fill('#loginEmail', journeyUser.email);
    await page.fill('#loginPassword', 'UpdatedPassword123!');
    await page.click('#loginBtn');
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    await page.screenshot({ path: 'test-results/screenshots/journey-10-final-login.png' });
    
    console.log('✅ Complete user journey test successful');
  });

  test.afterAll(async () => {
    console.log('🏁 Frontend Integration Tests Complete');
    console.log('📸 Screenshots saved to test-results/screenshots/');
    console.log('📋 Test reports available in test-results/');
  });
});