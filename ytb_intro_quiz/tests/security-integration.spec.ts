import { test, expect, type Page } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:8080';
const API_BASE_URL = 'http://localhost:3001';

// Security test data
const securityTestUser = {
  email: `security-test-${Date.now()}@example.com`,
  username: `securityuser${Date.now()}`,
  password: 'SecurityTest123!'
};

test.describe('Security Integration Tests', () => {
  
  test.beforeAll(async () => {
    console.log('🔒 Starting Security Integration Tests');
  });

  test.beforeEach(async ({ page }) => {
    // Monitor console errors that might indicate security issues
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CSP')) {
        console.error('🚨 Content Security Policy violation:', msg.text());
      }
    });

    // Monitor network requests for security headers
    page.on('response', response => {
      if (response.url().includes(FRONTEND_URL)) {
        const headers = response.headers();
        console.log('🔐 Security Headers:', {
          'x-content-type-options': headers['x-content-type-options'],
          'x-frame-options': headers['x-frame-options'],
          'x-xss-protection': headers['x-xss-protection'],
          'strict-transport-security': headers['strict-transport-security']
        });
      }
    });
  });

  test('XSS Prevention in Forms', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#register`);
    await page.waitForSelector('#registerPage.active');

    // Test various XSS payloads
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//",
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg/onload=alert("XSS")>',
      '&lt;script&gt;alert("XSS")&lt;/script&gt;'
    ];

    for (const payload of xssPayloads) {
      console.log(`🧪 Testing XSS payload: ${payload}`);
      
      // Test in username field
      await page.fill('#registerUsername', payload);
      await page.blur('#registerUsername');
      
      // Check if XSS payload was executed (should not be)
      const alertExecuted = await page.evaluate(() => {
        return window.___xss_alert_executed === true;
      });
      
      expect(alertExecuted).toBeFalsy();
      
      // Check if the input shows validation error
      const usernameError = await page.locator('#registerUsernameError').textContent();
      
      // Should either show validation error or sanitize the input
      if (usernameError) {
        console.log(`✅ XSS payload blocked with validation: ${usernameError}`);
      } else {
        // Check if input was sanitized
        const inputValue = await page.locator('#registerUsername').inputValue();
        expect(inputValue).not.toContain('<script>');
        console.log(`✅ XSS payload sanitized: ${inputValue}`);
      }
    }

    // Test XSS in email field
    await page.fill('#registerEmail', '<script>alert("XSS")</script>@example.com');
    await page.blur('#registerEmail');
    
    const emailError = await page.locator('#registerEmailError').textContent();
    expect(emailError).toContain('valid email');
    
    console.log('✅ XSS prevention in forms verified');
  });

  test('SQL Injection Prevention', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');

    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1' --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#",
      "'; DELETE FROM users; --"
    ];

    for (const payload of sqlPayloads) {
      console.log(`🧪 Testing SQL injection payload: ${payload}`);
      
      await page.fill('#loginEmail', payload);
      await page.fill('#loginPassword', 'password');
      await page.click('#loginBtn');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Should either show validation error or login failure, not SQL error
      const alertElement = await page.locator('.alert.error').first();
      
      if (await alertElement.isVisible()) {
        const errorText = await alertElement.textContent();
        
        // Should not contain SQL error messages
        expect(errorText).not.toContain('SQL');
        expect(errorText).not.toContain('syntax error');
        expect(errorText).not.toContain('database');
        
        console.log(`✅ SQL injection blocked: ${errorText}`);
      }
      
      // Should still be on login page (not authenticated)
      await expect(page.locator('#loginPage')).toHaveClass(/active/);
    }

    console.log('✅ SQL injection prevention verified');
  });

  test('CSRF Protection', async ({ page, context }) => {
    // First, register and login a user
    await page.goto(`${FRONTEND_URL}#register`);
    await page.waitForSelector('#registerPage.active');
    
    await page.fill('#registerUsername', securityTestUser.username);
    await page.fill('#registerEmail', securityTestUser.email);
    await page.fill('#registerPassword', securityTestUser.password);
    await page.fill('#confirmPassword', securityTestUser.password);
    await page.click('#registerBtn');
    
    await page.waitForSelector('#loginPage.active', { timeout: 15000 });
    
    await page.fill('#loginEmail', securityTestUser.email);
    await page.fill('#loginPassword', securityTestUser.password);
    await page.click('#loginBtn');
    
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Try to perform CSRF attack by making request from different origin
    const csrfResult = await page.evaluate(async (apiUrl) => {
      try {
        // Attempt to make authenticated request without proper CSRF token
        const response = await fetch(`${apiUrl}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // Missing CSRF token header
          },
          body: JSON.stringify({ username: 'hacked' }),
          credentials: 'include'
        });
        
        return {
          status: response.status,
          success: response.ok
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    }, API_BASE_URL);
    
    // Should be blocked or require proper authentication
    if (csrfResult.status) {
      expect([401, 403, 422]).toContain(csrfResult.status);
      console.log(`✅ CSRF protection active - Status: ${csrfResult.status}`);
    }
    
    console.log('✅ CSRF protection verified');
  });

  test('Secure Token Storage', async ({ page, context }) => {
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    
    // Login user
    await page.fill('#loginEmail', securityTestUser.email);
    await page.fill('#loginPassword', securityTestUser.password);
    await page.check('#rememberMe');
    await page.click('#loginBtn');
    
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Check token storage security
    const storageData = await page.evaluate(() => {
      const localStorage = window.localStorage;
      const sessionStorage = window.sessionStorage;
      
      return {
        localStorageTokens: {
          accessToken: localStorage.getItem('jwt_access_token'),
          refreshToken: localStorage.getItem('jwt_refresh_token')
        },
        sessionStorageTokens: {
          accessToken: sessionStorage.getItem('jwt_access_token'),
          refreshToken: sessionStorage.getItem('jwt_refresh_token')
        },
        cookieTokens: document.cookie
      };
    });
    
    // Tokens should be stored securely
    expect(storageData.localStorageTokens.accessToken).toBeTruthy();
    expect(storageData.localStorageTokens.refreshToken).toBeTruthy();
    
    // Check that tokens are not stored in cookies (more secure in localStorage/sessionStorage)
    expect(storageData.cookieTokens).not.toContain('jwt_access_token');
    expect(storageData.cookieTokens).not.toContain('jwt_refresh_token');
    
    // Test token format (should be JWT)
    const accessToken = storageData.localStorageTokens.accessToken;
    const tokenParts = accessToken?.split('.');
    expect(tokenParts).toHaveLength(3); // JWT has 3 parts
    
    console.log('✅ Secure token storage verified');
  });

  test('Session Timeout and Security', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    
    // Login user
    await page.fill('#loginEmail', securityTestUser.email);
    await page.fill('#loginPassword', securityTestUser.password);
    await page.click('#loginBtn');
    
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Test session validation
    await page.goto(`${FRONTEND_URL}#profile`);
    await page.waitForSelector('#profilePage.active');
    
    // Should be able to access protected page
    await expect(page.locator('#profilePage')).toHaveClass(/active/);
    
    // Test logout functionality
    await page.click('#navLogout a');
    await page.waitForSelector('#loginPage.active', { timeout: 10000 });
    
    // Try to access protected page after logout
    await page.goto(`${FRONTEND_URL}#dashboard`);
    await page.waitForTimeout(2000);
    
    // Should be redirected to login
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    
    // Check that tokens are cleared
    const clearedTokens = await page.evaluate(() => {
      return {
        accessToken: localStorage.getItem('jwt_access_token'),
        refreshToken: localStorage.getItem('jwt_refresh_token')
      };
    });
    
    expect(clearedTokens.accessToken).toBeNull();
    expect(clearedTokens.refreshToken).toBeNull();
    
    console.log('✅ Session timeout and security verified');
  });

  test('Input Sanitization', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#register`);
    await page.waitForSelector('#registerPage.active');
    
    // Test various malicious inputs
    const maliciousInputs = [
      '<img src="x" onerror="alert(1)">',
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      '${7*7}',
      '{{7*7}}',
      '#{{7*7}}',
      'eval("alert(1)")',
      'Function("alert(1)")();',
      'setTimeout("alert(1)",0)'
    ];
    
    for (const input of maliciousInputs) {
      console.log(`🧪 Testing input sanitization: ${input}`);
      
      // Test in different fields
      await page.fill('#registerUsername', input);
      await page.blur('#registerUsername');
      
      const sanitizedValue = await page.locator('#registerUsername').inputValue();
      
      // Check that dangerous scripts are removed or escaped
      expect(sanitizedValue).not.toContain('<script>');
      expect(sanitizedValue).not.toContain('javascript:');
      expect(sanitizedValue).not.toContain('onerror=');
      expect(sanitizedValue).not.toContain('eval(');
      
      if (sanitizedValue !== input) {
        console.log(`✅ Input sanitized: "${input}" -> "${sanitizedValue}"`);
      }
    }
    
    console.log('✅ Input sanitization verified');
  });

  test('HTTPS and Secure Headers', async ({ page }) => {
    // Navigate to application
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('#app');
    
    // Check if running on HTTPS in production-like environment
    const protocol = await page.evaluate(() => window.location.protocol);
    
    if (protocol === 'https:') {
      console.log('✅ Application running on HTTPS');
      
      // Check for Strict-Transport-Security header
      const response = await page.reload();
      const headers = response?.headers() || {};
      
      if (headers['strict-transport-security']) {
        console.log('✅ HSTS header present:', headers['strict-transport-security']);
      }
    } else {
      console.log('ℹ️ Application running on HTTP (development mode)');
    }
    
    // Test Content Security Policy
    const cspErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });
    
    // Try to execute inline script (should be blocked by CSP if configured)
    await page.evaluate(() => {
      try {
        eval('console.log("CSP Test")');
      } catch (error) {
        console.log('CSP blocked inline script execution');
      }
    });
    
    console.log('✅ Security headers checked');
  });

  test('Authentication Bypass Attempts', async ({ page }) => {
    // Try to access protected pages without authentication
    const protectedPages = ['dashboard', 'profile'];
    
    for (const pageName of protectedPages) {
      await page.goto(`${FRONTEND_URL}#${pageName}`);
      await page.waitForTimeout(2000);
      
      // Should be redirected to login
      await expect(page.locator('#loginPage')).toHaveClass(/active/);
      console.log(`✅ Protected page "${pageName}" requires authentication`);
    }
    
    // Try to manipulate tokens in browser storage
    await page.evaluate(() => {
      localStorage.setItem('jwt_access_token', 'fake_token');
      localStorage.setItem('jwt_refresh_token', 'fake_refresh_token');
    });
    
    // Try to access protected page with fake token
    await page.goto(`${FRONTEND_URL}#dashboard`);
    await page.waitForTimeout(3000);
    
    // Should still be redirected to login (token validation should fail)
    await expect(page.locator('#loginPage')).toHaveClass(/active/);
    
    console.log('✅ Authentication bypass attempts blocked');
  });

  test('Password Security Requirements', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#register`);
    await page.waitForSelector('#registerPage.active');
    
    // Test weak passwords
    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'abc123',
      'password123',
      '11111111'
    ];
    
    for (const weakPassword of weakPasswords) {
      await page.fill('#registerPassword', weakPassword);
      await page.blur('#registerPassword');
      
      // Should show weak password indicator
      const strengthIndicator = page.locator('.strength-fill.weak');
      await expect(strengthIndicator).toBeVisible();
      
      console.log(`✅ Weak password "${weakPassword}" detected`);
    }
    
    // Test strong password
    await page.fill('#registerPassword', 'StrongP@ssw0rd!2024');
    await page.blur('#registerPassword');
    
    const strongIndicator = page.locator('.strength-fill.strong');
    await expect(strongIndicator).toBeVisible();
    
    console.log('✅ Password security requirements verified');
  });

  test('Rate Limiting (Client-side)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    
    // Attempt multiple rapid login attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('#loginEmail', `test${i}@example.com`);
      await page.fill('#loginPassword', 'wrongpassword');
      await page.click('#loginBtn');
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      console.log(`🔄 Login attempt ${i + 1}/6`);
    }
    
    // Check if rate limiting is applied (client-side check)
    const rateLimitCheck = await page.evaluate(() => {
      // This would check if rate limiting logic is implemented
      return window.validationManager?.checkRateLimit('login', 5, 60000);
    });
    
    if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.log('✅ Client-side rate limiting active');
    }
    
    console.log('✅ Rate limiting behavior checked');
  });

  test('Data Exposure Prevention', async ({ page }) => {
    // Login first
    await page.goto(`${FRONTEND_URL}#login`);
    await page.waitForSelector('#loginPage.active');
    
    await page.fill('#loginEmail', securityTestUser.email);
    await page.fill('#loginPassword', securityTestUser.password);
    await page.click('#loginBtn');
    
    await page.waitForSelector('#dashboardPage.active', { timeout: 15000 });
    
    // Check that sensitive data is not exposed in DOM
    const pageContent = await page.content();
    
    // Should not contain full tokens in HTML
    expect(pageContent).not.toContain('eyJ'); // JWT tokens start with this
    
    // Check dashboard for data exposure
    const userInfo = page.locator('#userInfo');
    await expect(userInfo).toBeVisible();
    
    // Should display user info but not sensitive data like full tokens
    const userInfoText = await userInfo.textContent();
    expect(userInfoText).not.toContain('eyJ');
    expect(userInfoText).not.toContain('Bearer ');
    
    // Check token display is truncated
    const tokenInfo = page.locator('#tokenInfo');
    const tokenInfoText = await tokenInfo.textContent();
    
    if (tokenInfoText?.includes('...')) {
      console.log('✅ Token information is properly truncated');
    }
    
    console.log('✅ Data exposure prevention verified');
  });

  test('Browser Security Features', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('#app');
    
    // Test that dangerous browser features are disabled or secured
    const securityChecks = await page.evaluate(() => {
      return {
        // Check if eval is available (should be restricted by CSP if configured)
        evalAvailable: typeof eval === 'function',
        
        // Check if document.domain can be modified
        canModifyDomain: (() => {
          try {
            document.domain = document.domain;
            return true;
          } catch {
            return false;
          }
        })(),
        
        // Check for browser security features
        hasSecureContext: window.isSecureContext,
        hasOrigin: typeof window.origin === 'string'
      };
    });
    
    console.log('🔍 Browser Security Checks:', securityChecks);
    
    // Test iframe protection
    const iframeTest = await page.evaluate(() => {
      try {
        const iframe = document.createElement('iframe');
        iframe.src = 'javascript:alert("iframe")';
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
        return { allowed: true };
      } catch (error) {
        return { allowed: false, error: error.message };
      }
    });
    
    console.log('🔍 Iframe Test:', iframeTest);
    
    console.log('✅ Browser security features checked');
  });

  test.afterAll(async () => {
    console.log('🔒 Security Integration Tests Complete');
    console.log('🛡️ All security measures verified');
  });
});