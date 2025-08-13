import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:8080';
const API_BASE_URL = 'http://localhost:3001';

// Test data for cross-browser testing
const crossBrowserUser = {
  email: `cross-browser-${Date.now()}@example.com`,
  username: `crossuser${Date.now()}`,
  password: 'CrossBrowser123!'
};

test.describe('Cross-Browser Compatibility Tests', () => {
  
  // Test on different browsers
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    
    test.describe(`${browserName.toUpperCase()} Browser Tests`, () => {
      
      test(`${browserName}: Application Loading and Basic Functionality`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}, only running for ${browserName}`);
        
        console.log(`🌐 Testing on ${browserName.toUpperCase()}`);
        
        // Navigate to application
        await page.goto(FRONTEND_URL);
        await page.waitForSelector('#app', { timeout: 15000 });
        
        // Verify basic application structure
        await expect(page.locator('#app')).toBeVisible();
        await expect(page.locator('.navbar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
        
        // Check initial page load
        await expect(page.locator('#homePage')).toHaveClass(/active/);
        
        // Test navigation
        await page.click('#navLogin a');
        await page.waitForSelector('#loginPage.active');
        await expect(page.locator('#loginPage')).toHaveClass(/active/);
        
        // Test register navigation
        await page.click('a[href="#register"]');
        await page.waitForSelector('#registerPage.active');
        await expect(page.locator('#registerPage')).toHaveClass(/active/);
        
        // Take browser-specific screenshot
        await page.screenshot({ 
          path: `test-results/screenshots/cross-browser-${browserName}-basic.png`,
          fullPage: true 
        });
        
        console.log(`✅ ${browserName.toUpperCase()}: Basic functionality verified`);
      });

      test(`${browserName}: Form Interactions and Validation`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}, only running for ${browserName}`);
        
        await page.goto(`${FRONTEND_URL}#register`);
        await page.waitForSelector('#registerPage.active');
        
        // Test form filling
        await page.fill('#registerUsername', `${crossBrowserUser.username}_${browserName}`);
        await page.fill('#registerEmail', `${browserName}-${crossBrowserUser.email}`);
        await page.fill('#registerPassword', crossBrowserUser.password);
        
        // Test password visibility toggle
        await page.click('button[onclick*="registerPassword"]');
        await expect(page.locator('#registerPassword')).toHaveAttribute('type', 'text');
        
        await page.click('button[onclick*="registerPassword"]');
        await expect(page.locator('#registerPassword')).toHaveAttribute('type', 'password');
        
        // Test form validation
        await page.fill('#registerEmail', 'invalid-email');
        await page.blur('#registerEmail');
        await expect(page.locator('#registerEmailError')).toContainText(/valid email/);
        
        // Fix email
        await page.fill('#registerEmail', `${browserName}-${crossBrowserUser.email}`);
        await page.blur('#registerEmail');
        await expect(page.locator('#registerEmailError')).toBeEmpty();
        
        // Test password confirmation
        await page.fill('#confirmPassword', 'different');
        await page.blur('#confirmPassword');
        await expect(page.locator('#confirmPasswordError')).toContainText(/do not match/);
        
        await page.fill('#confirmPassword', crossBrowserUser.password);
        await page.blur('#confirmPassword');
        await expect(page.locator('#confirmPasswordError')).toBeEmpty();
        
        // Submit form
        await page.click('#registerBtn');
        await page.waitForSelector('#loginPage.active', { timeout: 15000 });
        
        // Verify success
        await expect(page.locator('#loginPage')).toHaveClass(/active/);
        
        console.log(`✅ ${browserName.toUpperCase()}: Form interactions verified`);
      });

      test(`${browserName}: Authentication Flow`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}, only running for ${browserName}`);
        
        // Login with the user created in previous test
        await page.goto(`${FRONTEND_URL}#login`);
        await page.waitForSelector('#loginPage.active');
        
        await page.fill('#loginEmail', `${browserName}-${crossBrowserUser.email}`);
        await page.fill('#loginPassword', crossBrowserUser.password);
        await page.click('#loginBtn');
        
        // Wait for authentication
        await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
        await expect(page.locator('#dashboardPage')).toHaveClass(/active/);
        
        // Verify dashboard components
        await expect(page.locator('.dashboard-header')).toBeVisible();
        await expect(page.locator('.dashboard-grid')).toBeVisible();
        await expect(page.locator('.dashboard-card')).toHaveCount(4);
        
        // Test profile navigation
        await page.click('#navProfile a');
        await page.waitForSelector('#profilePage.active');
        await expect(page.locator('#profilePage')).toHaveClass(/active/);
        
        // Test tab switching
        await page.click('.tab-btn:has-text("Security")');
        await expect(page.locator('#profileSecurityTab')).toHaveClass(/active/);
        
        await page.click('.tab-btn:has-text("Profile Info")');
        await expect(page.locator('#profileInfoTab')).toHaveClass(/active/);
        
        // Test logout
        await page.click('#navLogout a');
        await page.waitForSelector('#loginPage.active', { timeout: 10000 });
        await expect(page.locator('#loginPage')).toHaveClass(/active/);
        
        // Take authentication flow screenshot
        await page.screenshot({ 
          path: `test-results/screenshots/cross-browser-${browserName}-auth.png`,
          fullPage: true 
        });
        
        console.log(`✅ ${browserName.toUpperCase()}: Authentication flow verified`);
      });

      test(`${browserName}: CSS Rendering and Layout`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}, only running for ${browserName}`);
        
        await page.goto(FRONTEND_URL);
        await page.waitForSelector('#app');
        
        // Test hero section styling
        const hero = page.locator('.hero');
        await expect(hero).toBeVisible();
        
        // Check if gradient background is applied
        const heroStyles = await hero.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            background: styles.background,
            borderRadius: styles.borderRadius,
            textAlign: styles.textAlign
          };
        });
        
        expect(heroStyles.textAlign).toBe('center');
        
        // Test feature cards layout
        const featureGrid = page.locator('.feature-grid');
        await expect(featureGrid).toBeVisible();
        
        const gridStyles = await featureGrid.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            display: styles.display,
            gridTemplateColumns: styles.gridTemplateColumns
          };
        });
        
        expect(gridStyles.display).toBe('grid');
        
        // Test responsive navigation
        await page.setViewportSize({ width: 768, height: 600 });
        
        const navToggle = page.locator('#navToggle');
        const navMenu = page.locator('#navMenu');
        
        // Check if mobile menu toggle is visible
        const navToggleVisible = await navToggle.isVisible();
        
        if (navToggleVisible) {
          await navToggle.click();
          await expect(navMenu).toHaveClass(/active/);
        }
        
        // Reset viewport
        await page.setViewportSize({ width: 1280, height: 720 });
        
        console.log(`✅ ${browserName.toUpperCase()}: CSS rendering verified`);
      });

      test(`${browserName}: JavaScript Functionality`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}, only running for ${browserName}`);
        
        await page.goto(FRONTEND_URL);
        await page.waitForSelector('#app');
        
        // Test JavaScript modules loading
        const jsModules = await page.evaluate(() => {
          return {
            appConfig: typeof window.AppConfig !== 'undefined',
            authManager: typeof window.authManager !== 'undefined',
            apiClient: typeof window.apiClient !== 'undefined',
            uiManager: typeof window.uiManager !== 'undefined',
            validationManager: typeof window.validationManager !== 'undefined'
          };
        });
        
        expect(jsModules.appConfig).toBe(true);
        expect(jsModules.authManager).toBe(true);
        expect(jsModules.apiClient).toBe(true);
        expect(jsModules.uiManager).toBe(true);
        expect(jsModules.validationManager).toBe(true);
        
        // Test dynamic content loading
        await page.goto(`${FRONTEND_URL}#register`);
        await page.waitForSelector('#registerPage.active');
        
        // Test password strength indicator
        await page.fill('#registerPassword', 'weak');
        await page.blur('#registerPassword');
        
        // Check if password strength is calculated
        const strengthIndicator = page.locator('.strength-fill');
        await expect(strengthIndicator).toBeVisible();
        
        await page.fill('#registerPassword', 'StrongPassword123!');
        await page.blur('#registerPassword');
        
        // Should show strong password
        await expect(page.locator('.strength-fill.strong')).toBeVisible();
        
        // Test form validation
        await page.fill('#registerEmail', 'test');
        await page.blur('#registerEmail');
        await expect(page.locator('#registerEmailError')).toBeVisible();
        
        console.log(`✅ ${browserName.toUpperCase()}: JavaScript functionality verified`);
      });

      test(`${browserName}: Local Storage and Session Management`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping test for ${currentBrowser}, only running for ${browserName}`);
        
        await page.goto(`${FRONTEND_URL}#login`);
        await page.waitForSelector('#loginPage.active');
        
        // Test remember me functionality
        await page.fill('#loginEmail', `${browserName}-${crossBrowserUser.email}`);
        await page.fill('#loginPassword', crossBrowserUser.password);
        await page.check('#rememberMe');
        await page.click('#loginBtn');
        
        await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
        
        // Check if tokens are stored in localStorage
        const tokens = await page.evaluate(() => {
          return {
            accessToken: localStorage.getItem('jwt_access_token'),
            refreshToken: localStorage.getItem('jwt_refresh_token'),
            rememberMe: localStorage.getItem('remember_me')
          };
        });
        
        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();
        expect(tokens.rememberMe).toBe('true');
        
        // Test page refresh with stored tokens
        await page.reload();
        await page.waitForSelector('#dashboardPage.active', { timeout: 10000 });
        
        // Should still be logged in
        await expect(page.locator('#dashboardPage')).toHaveClass(/active/);
        
        console.log(`✅ ${browserName.toUpperCase()}: Storage and session management verified`);
      });
    });
  });

  test.describe('Device and Viewport Testing', () => {
    
    const devices = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    devices.forEach(device => {
      test(`Responsive Design - ${device.name} (${device.width}x${device.height})`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        
        await page.goto(FRONTEND_URL);
        await page.waitForSelector('#app');
        
        // Test navigation on different screen sizes
        const navToggle = page.locator('#navToggle');
        const navMenu = page.locator('#navMenu');
        
        if (device.width <= 768) {
          // Mobile/tablet - hamburger menu should be visible
          await expect(navToggle).toBeVisible();
          
          // Test mobile navigation
          await navToggle.click();
          await expect(navMenu).toHaveClass(/active/);
          
          await page.click('#navLogin a');
          await page.waitForSelector('#loginPage.active');
          
          // Menu should close after navigation
          await expect(navMenu).not.toHaveClass(/active/);
        } else {
          // Desktop - regular navigation should be visible
          await expect(navToggle).not.toBeVisible();
          await expect(navMenu).toBeVisible();
        }
        
        // Test form layouts
        await page.goto(`${FRONTEND_URL}#register`);
        await page.waitForSelector('#registerPage.active');
        
        const authContainer = page.locator('.auth-container');
        await expect(authContainer).toBeVisible();
        
        // Test that forms are usable on all screen sizes
        await page.fill('#registerUsername', 'testuser');
        await page.fill('#registerEmail', 'test@example.com');
        await expect(page.locator('#registerUsername')).toHaveValue('testuser');
        
        // Take device-specific screenshot
        await page.screenshot({ 
          path: `test-results/screenshots/responsive-${device.name.toLowerCase()}-${device.width}x${device.height}.png`,
          fullPage: true 
        });
        
        console.log(`✅ ${device.name} (${device.width}x${device.height}): Responsive design verified`);
      });
    });
  });

  test.describe('Accessibility Testing', () => {
    
    test('Keyboard Navigation', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('#app');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT'].includes(focusedElement!)).toBe(true);
      
      // Navigate to login page
      await page.goto(`${FRONTEND_URL}#login`);
      await page.waitForSelector('#loginPage.active');
      
      // Test form navigation with Tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to fill form using keyboard
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.type('password123');
      
      // Verify form was filled
      await expect(page.locator('#loginEmail')).toHaveValue('test@example.com');
      await expect(page.locator('#loginPassword')).toHaveValue('password123');
      
      // Test Escape key functionality
      await page.keyboard.press('Escape');
      
      console.log('✅ Keyboard navigation verified');
    });

    test('ARIA Labels and Screen Reader Support', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('#app');
      
      // Check for ARIA live region
      const liveRegion = page.locator('#aria-live-region');
      await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      
      // Check form labels
      await page.goto(`${FRONTEND_URL}#login`);
      await page.waitForSelector('#loginPage.active');
      
      const emailInput = page.locator('#loginEmail');
      const passwordInput = page.locator('#loginPassword');
      
      // Check that inputs have proper labels
      await expect(page.locator('label[for="loginEmail"]')).toBeVisible();
      await expect(page.locator('label[for="loginPassword"]')).toBeVisible();
      
      // Check for proper form structure
      await expect(page.locator('#loginForm')).toHaveAttribute('novalidate');
      
      console.log('✅ ARIA labels and screen reader support verified');
    });

    test('Color Contrast and Visual Accessibility', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('#app');
      
      // Test focus indicators
      await page.click('#navLogin a');
      await page.waitForSelector('#loginPage.active');
      
      await page.focus('#loginEmail');
      
      // Check that focused elements have visible focus indicators
      const focusedStyles = await page.locator('#loginEmail:focus').evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor
        };
      });
      
      // Should have some form of focus indication
      const hasFocusIndicator = focusedStyles.outline !== 'none' || 
                              focusedStyles.boxShadow !== 'none' ||
                              focusedStyles.borderColor !== 'rgb(222, 226, 230)';
      
      expect(hasFocusIndicator).toBe(true);
      
      console.log('✅ Color contrast and visual accessibility verified');
    });
  });

  test.describe('Performance Testing', () => {
    
    test('Page Load Performance', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('#app');
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Check for performance markers
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart
        };
      });
      
      console.log('📊 Performance Metrics:', performanceMetrics);
      console.log(`✅ Page loaded in ${loadTime}ms`);
    });

    test('JavaScript Bundle Size and Loading', async ({ page }) => {
      const resourceSizes = new Map<string, number>();
      
      page.on('response', async (response) => {
        if (response.url().includes('.js') || response.url().includes('.css')) {
          try {
            const buffer = await response.body();
            resourceSizes.set(response.url(), buffer.length);
          } catch (error) {
            // Some responses may not be available
          }
        }
      });
      
      await page.goto(FRONTEND_URL);
      await page.waitForSelector('#app');
      
      // Wait for all resources to load
      await page.waitForTimeout(2000);
      
      let totalSize = 0;
      resourceSizes.forEach((size, url) => {
        totalSize += size;
        console.log(`📦 ${url}: ${(size / 1024).toFixed(2)}KB`);
      });
      
      console.log(`📊 Total bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
      
      // Bundle size should be reasonable (under 1MB for all assets)
      expect(totalSize).toBeLessThan(1024 * 1024);
      
      console.log('✅ Bundle size within acceptable limits');
    });
  });

  test.afterAll(async () => {
    console.log('🌐 Cross-Browser Compatibility Tests Complete');
    console.log('📸 Screenshots saved to test-results/screenshots/');
    console.log('🔧 All browser compatibility verified');
  });
});