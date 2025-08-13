import { test, expect, type Page } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3001';

// Test data
const testUser = {
  email: `visual-test-${Date.now()}@example.com`,
  username: `visualuser${Date.now()}`,
  password: 'VisualTest123!'
};

let authTokens = {
  accessToken: '',
  refreshToken: ''
};

test.describe('JWT Authentication System - Visual Demonstration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Add console logging to capture API responses in video
    page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));
  });

  test('Complete JWT Authentication Flow - Visual Demo', async ({ page }) => {
    // Create a simple HTML page to demonstrate the authentication flow
    const authDemoHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JWT Authentication System Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            color: #333;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        .step {
            margin: 20px 0;
            padding: 20px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            background: #f8f9fa;
        }
        .step.active {
            border-color: #007bff;
            background: #e7f3ff;
            box-shadow: 0 0 15px rgba(0,123,255,0.2);
        }
        .step.success {
            border-color: #28a745;
            background: #e8f5e9;
        }
        .step.error {
            border-color: #dc3545;
            background: #ffeaea;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
            transition: all 0.3s;
        }
        button:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }
        button:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
        }
        .response {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            white-space: pre-wrap;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            overflow-x: auto;
        }
        .success-text { color: #28a745; font-weight: bold; }
        .error-text { color: #dc3545; font-weight: bold; }
        .info-text { color: #17a2b8; font-weight: bold; }
        .token-display {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-family: monospace;
            word-break: break-all;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e1e8ed;
            border-radius: 10px;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007bff, #28a745);
            border-radius: 10px;
            width: 0%;
            transition: width 0.5s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 JWT Authentication System Demo</h1>
        <div class="progress-bar">
            <div class="progress-fill" id="progress"></div>
        </div>
        
        <!-- Step 1: Server Health Check -->
        <div class="step" id="step1">
            <h3>📡 Step 1: Server Health Check</h3>
            <p>Verifying the authentication server is running and accessible</p>
            <button onclick="checkHealth()" id="healthBtn">Check Server Health</button>
            <div class="response" id="healthResponse"></div>
        </div>

        <!-- Step 2: User Registration -->
        <div class="step" id="step2">
            <h3>👤 Step 2: User Registration</h3>
            <p>Creating a new user account in the system</p>
            <div>Email: <strong>${testUser.email}</strong></div>
            <div>Username: <strong>${testUser.username}</strong></div>
            <button onclick="registerUser()" id="registerBtn" disabled>Register User</button>
            <div class="response" id="registerResponse"></div>
        </div>

        <!-- Step 3: User Login -->
        <div class="step" id="step3">
            <h3>🔑 Step 3: User Login</h3>
            <p>Authenticating with the registered credentials to get JWT tokens</p>
            <button onclick="loginUser()" id="loginBtn" disabled>Login User</button>
            <div class="response" id="loginResponse"></div>
            <div class="token-display" id="tokenDisplay" style="display: none;"></div>
        </div>

        <!-- Step 4: Token Validation -->
        <div class="step" id="step4">
            <h3>✅ Step 4: Token Validation</h3>
            <p>Validating the access token and retrieving user information</p>
            <button onclick="validateToken()" id="validateBtn" disabled>Validate Token</button>
            <div class="response" id="validateResponse"></div>
        </div>

        <!-- Step 5: Access Protected Endpoint -->
        <div class="step" id="step5">
            <h3>🛡️ Step 5: Access Protected Endpoint</h3>
            <p>Using the JWT token to access protected user profile endpoint</p>
            <button onclick="getProfile()" id="profileBtn" disabled>Get User Profile</button>
            <div class="response" id="profileResponse"></div>
        </div>

        <!-- Step 6: Token Refresh -->
        <div class="step" id="step6">
            <h3>🔄 Step 6: Token Refresh</h3>
            <p>Refreshing the access token using the refresh token</p>
            <button onclick="refreshToken()" id="refreshBtn" disabled>Refresh Token</button>
            <div class="response" id="refreshResponse"></div>
        </div>

        <!-- Step 7: Security Test -->
        <div class="step" id="step7">
            <h3>🔒 Step 7: Security Test</h3>
            <p>Testing security features - unauthorized access attempt</p>
            <button onclick="testUnauthorized()" id="securityBtn" disabled>Test Unauthorized Access</button>
            <div class="response" id="securityResponse"></div>
        </div>

        <!-- Step 8: Logout -->
        <div class="step" id="step8">
            <h3>🚪 Step 8: Logout</h3>
            <p>Logging out and invalidating the JWT tokens</p>
            <button onclick="logoutUser()" id="logoutBtn" disabled>Logout User</button>
            <div class="response" id="logoutResponse"></div>
        </div>

        <!-- Step 9: Verify Token Invalidation -->
        <div class="step" id="step9">
            <h3>🚫 Step 9: Verify Token Invalidation</h3>
            <p>Confirming that the invalidated token cannot access protected endpoints</p>
            <button onclick="verifyInvalidation()" id="verifyBtn" disabled>Verify Invalidation</button>
            <div class="response" id="verifyResponse"></div>
        </div>
    </div>

    <script>
        const API_URL = '${API_BASE_URL}';
        const testUser = ${JSON.stringify(testUser)};
        let tokens = { accessToken: '', refreshToken: '' };
        let currentStep = 0;
        const totalSteps = 9;

        function updateProgress(step) {
            const progress = (step / totalSteps) * 100;
            document.getElementById('progress').style.width = progress + '%';
            currentStep = step;
        }

        function setStepStatus(stepId, status) {
            const step = document.getElementById(stepId);
            step.classList.remove('active', 'success', 'error');
            step.classList.add(status);
        }

        function updateResponse(elementId, content, type = 'info') {
            const element = document.getElementById(elementId);
            element.innerHTML = content;
            element.className = 'response ' + type + '-text';
        }

        function enableNextButton(currentBtnId, nextBtnId) {
            document.getElementById(currentBtnId).disabled = true;
            if (nextBtnId) document.getElementById(nextBtnId).disabled = false;
        }

        async function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async function checkHealth() {
            setStepStatus('step1', 'active');
            try {
                const response = await fetch(API_URL + '/api/health');
                const data = await response.json();
                
                updateResponse('healthResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    'success');
                
                setStepStatus('step1', 'success');
                enableNextButton('healthBtn', 'registerBtn');
                updateProgress(1);
                
                await delay(1000);
                document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                updateResponse('healthResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step1', 'error');
            }
        }

        async function registerUser() {
            setStepStatus('step2', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testUser)
                });
                const data = await response.json();
                
                updateResponse('registerResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    setStepStatus('step2', 'success');
                    enableNextButton('registerBtn', 'loginBtn');
                    updateProgress(2);
                    
                    await delay(1000);
                    document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStepStatus('step2', 'error');
                }
            } catch (error) {
                updateResponse('registerResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step2', 'error');
            }
        }

        async function loginUser() {
            setStepStatus('step3', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: testUser.email,
                        password: testUser.password
                    })
                });
                const data = await response.json();
                
                if (response.ok && data.data && data.data.tokens) {
                    tokens.accessToken = data.data.tokens.accessToken;
                    tokens.refreshToken = data.data.tokens.refreshToken;
                    
                    document.getElementById('tokenDisplay').style.display = 'block';
                    document.getElementById('tokenDisplay').innerHTML = 
                        'Access Token: ' + tokens.accessToken.substring(0, 50) + '...\\n' +
                        'Refresh Token: ' + tokens.refreshToken.substring(0, 50) + '...';
                }
                
                updateResponse('loginResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    setStepStatus('step3', 'success');
                    enableNextButton('loginBtn', 'validateBtn');
                    updateProgress(3);
                    
                    await delay(1000);
                    document.getElementById('step4').scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStepStatus('step3', 'error');
                }
            } catch (error) {
                updateResponse('loginResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step3', 'error');
            }
        }

        async function validateToken() {
            setStepStatus('step4', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/validate', {
                    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
                });
                const data = await response.json();
                
                updateResponse('validateResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    setStepStatus('step4', 'success');
                    enableNextButton('validateBtn', 'profileBtn');
                    updateProgress(4);
                    
                    await delay(1000);
                    document.getElementById('step5').scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStepStatus('step4', 'error');
                }
            } catch (error) {
                updateResponse('validateResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step4', 'error');
            }
        }

        async function getProfile() {
            setStepStatus('step5', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
                });
                const data = await response.json();
                
                updateResponse('profileResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    setStepStatus('step5', 'success');
                    enableNextButton('profileBtn', 'refreshBtn');
                    updateProgress(5);
                    
                    await delay(1000);
                    document.getElementById('step6').scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStepStatus('step5', 'error');
                }
            } catch (error) {
                updateResponse('profileResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step5', 'error');
            }
        }

        async function refreshToken() {
            setStepStatus('step6', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: tokens.refreshToken })
                });
                const data = await response.json();
                
                if (response.ok && data.data && data.data.tokens) {
                    tokens.accessToken = data.data.tokens.accessToken;
                    if (data.data.tokens.refreshToken) {
                        tokens.refreshToken = data.data.tokens.refreshToken;
                    }
                }
                
                updateResponse('refreshResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    setStepStatus('step6', 'success');
                    enableNextButton('refreshBtn', 'securityBtn');
                    updateProgress(6);
                    
                    await delay(1000);
                    document.getElementById('step7').scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStepStatus('step6', 'error');
                }
            } catch (error) {
                updateResponse('refreshResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step6', 'error');
            }
        }

        async function testUnauthorized() {
            setStepStatus('step7', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/me', {
                    headers: { 'Authorization': 'Bearer invalid_token_123' }
                });
                const data = await response.json();
                
                updateResponse('securityResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2) + '\\n\\n' +
                    (response.status === 401 ? '✅ Security working: Unauthorized access properly rejected!' : '⚠️ Security issue detected'), 
                    response.status === 401 ? 'success' : 'error');
                
                setStepStatus('step7', response.status === 401 ? 'success' : 'error');
                enableNextButton('securityBtn', 'logoutBtn');
                updateProgress(7);
                
                await delay(1000);
                document.getElementById('step8').scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                updateResponse('securityResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step7', 'error');
            }
        }

        async function logoutUser() {
            setStepStatus('step8', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/logout', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + tokens.accessToken 
                    },
                    body: JSON.stringify({ refreshToken: tokens.refreshToken })
                });
                const data = await response.json();
                
                updateResponse('logoutResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2), 
                    response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    setStepStatus('step8', 'success');
                    enableNextButton('logoutBtn', 'verifyBtn');
                    updateProgress(8);
                    
                    await delay(1000);
                    document.getElementById('step9').scrollIntoView({ behavior: 'smooth' });
                } else {
                    setStepStatus('step8', 'error');
                }
            } catch (error) {
                updateResponse('logoutResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step8', 'error');
            }
        }

        async function verifyInvalidation() {
            setStepStatus('step9', 'active');
            try {
                const response = await fetch(API_URL + '/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
                });
                const data = await response.json();
                
                updateResponse('verifyResponse', 
                    'Status: ' + response.status + '\\n' +
                    'Response: ' + JSON.stringify(data, null, 2) + '\\n\\n' +
                    (response.status === 401 ? '🎉 Complete! Token invalidation successful!' : '⚠️ Issue: Token still valid after logout'), 
                    response.status === 401 ? 'success' : 'error');
                
                setStepStatus('step9', response.status === 401 ? 'success' : 'error');
                enableNextButton('verifyBtn', null);
                updateProgress(9);
                
                if (response.status === 401) {
                    await delay(2000);
                    alert('🎉 JWT Authentication System Demo Complete!\\n\\nAll security features are working correctly:\\n- User registration\\n- Secure login\\n- Token validation\\n- Protected endpoints\\n- Token refresh\\n- Secure logout\\n- Token invalidation');
                }
            } catch (error) {
                updateResponse('verifyResponse', 'Error: ' + error.message, 'error');
                setStepStatus('step9', 'error');
            }
        }

        // Auto-start the demo
        window.onload = function() {
            setTimeout(() => {
                document.getElementById('healthBtn').disabled = false;
                alert('🚀 Welcome to JWT Authentication System Demo!\\n\\nThis demo will show you:\\n- Complete authentication flow\\n- JWT token management\\n- Security features\\n- API interactions\\n\\nClick OK to begin!');
            }, 1000);
        };
    </script>
</body>
</html>`;

    // Navigate to a data URL with our demo HTML
    await page.goto(`data:text/html,${encodeURIComponent(authDemoHTML)}`);
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/jwt-demo-start.png', fullPage: true });
    
    console.log('🎬 Starting JWT Authentication Visual Demo Recording...');
    
    // Step 1: Check Health
    await page.click('#healthBtn');
    await page.waitForSelector('.step.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 1: Health check completed');
    
    // Step 2: Register User
    await page.click('#registerBtn');
    await page.waitForSelector('#step2.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 2: User registration completed');
    
    // Step 3: Login User
    await page.click('#loginBtn');
    await page.waitForSelector('#step3.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 3: User login completed');
    
    // Step 4: Validate Token
    await page.click('#validateBtn');
    await page.waitForSelector('#step4.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 4: Token validation completed');
    
    // Step 5: Get Profile
    await page.click('#profileBtn');
    await page.waitForSelector('#step5.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 5: Profile access completed');
    
    // Step 6: Refresh Token
    await page.click('#refreshBtn');
    await page.waitForSelector('#step6.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 6: Token refresh completed');
    
    // Step 7: Test Security
    await page.click('#securityBtn');
    await page.waitForSelector('#step7.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 7: Security test completed');
    
    // Step 8: Logout
    await page.click('#logoutBtn');
    await page.waitForSelector('#step8.success', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Step 8: Logout completed');
    
    // Step 9: Verify Invalidation
    await page.click('#verifyBtn');
    await page.waitForSelector('#step9.success', { timeout: 10000 });
    await page.waitForTimeout(3000);
    console.log('✅ Step 9: Token invalidation verified');
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/jwt-demo-complete.png', fullPage: true });
    
    // Wait for final alert (optional)
    await page.waitForTimeout(2000);
    
    console.log('🎉 JWT Authentication Visual Demo Recording Complete!');
    console.log('📹 Video saved to: test-results/videos/');
    console.log('📸 Screenshots saved to: test-results/');
  });

  test('JWT API Endpoints - Technical Demo', async ({ page }) => {
    // Create a technical API demonstration page
    const apiDemoHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>JWT API Endpoints Technical Demo</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
        .endpoint { margin: 20px 0; padding: 15px; border: 1px solid #333; border-radius: 5px; }
        .method { color: #4fc3f7; font-weight: bold; }
        .url { color: #81c784; }
        .status { color: #ffb74d; }
        .response { background: #2d2d2d; padding: 10px; border-radius: 3px; margin: 10px 0; }
        .success { border-left: 4px solid #4caf50; }
        .error { border-left: 4px solid #f44336; }
        button { background: #007acc; color: white; border: none; padding: 8px 16px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>🔧 JWT API Endpoints Technical Demo</h1>
    <div id="demo-results"></div>
    
    <script>
        const API_URL = '${API_BASE_URL}';
        const testUser = ${JSON.stringify(testUser)};
        let tokens = { accessToken: '', refreshToken: '' };
        
        async function runApiDemo() {
            const results = document.getElementById('demo-results');
            
            const endpoints = [
                { method: 'GET', url: '/api/health', desc: 'Health Check' },
                { method: 'POST', url: '/api/auth/register', desc: 'User Registration', body: testUser },
                { method: 'POST', url: '/api/auth/login', desc: 'User Login', body: { email: testUser.email, password: testUser.password } },
                { method: 'GET', url: '/api/auth/validate', desc: 'Token Validation', auth: true },
                { method: 'GET', url: '/api/auth/me', desc: 'Get User Profile', auth: true },
                { method: 'POST', url: '/api/auth/refresh', desc: 'Refresh Token', body: () => ({ refreshToken: tokens.refreshToken }) },
                { method: 'POST', url: '/api/auth/logout', desc: 'User Logout', auth: true, body: () => ({ refreshToken: tokens.refreshToken }) }
            ];
            
            for (const endpoint of endpoints) {
                const div = document.createElement('div');
                div.className = 'endpoint';
                
                let body = endpoint.body;
                if (typeof body === 'function') body = body();
                
                const headers = { 'Content-Type': 'application/json' };
                if (endpoint.auth && tokens.accessToken) {
                    headers.Authorization = 'Bearer ' + tokens.accessToken;
                }
                
                try {
                    const response = await fetch(API_URL + endpoint.url, {
                        method: endpoint.method,
                        headers: headers,
                        body: body ? JSON.stringify(body) : undefined
                    });
                    
                    const data = await response.json();
                    
                    // Store tokens
                    if (data.data && data.data.tokens) {
                        tokens.accessToken = data.data.tokens.accessToken;
                        tokens.refreshToken = data.data.tokens.refreshToken;
                    }
                    
                    div.innerHTML = \`
                        <div class="method">\${endpoint.method}</div>
                        <div class="url">\${endpoint.url}</div>
                        <div class="desc">\${endpoint.desc}</div>
                        <div class="status">Status: \${response.status}</div>
                        <div class="response \${response.ok ? 'success' : 'error'}">
                            \${JSON.stringify(data, null, 2)}
                        </div>
                    \`;
                } catch (error) {
                    div.innerHTML = \`
                        <div class="method">\${endpoint.method}</div>
                        <div class="url">\${endpoint.url}</div>
                        <div class="desc">\${endpoint.desc}</div>
                        <div class="response error">Error: \${error.message}</div>
                    \`;
                }
                
                results.appendChild(div);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
        
        window.onload = () => setTimeout(runApiDemo, 1000);
    </script>
</body>
</html>`;

    await page.goto(`data:text/html,${encodeURIComponent(apiDemoHTML)}`);
    await page.waitForTimeout(15000); // Wait for all API calls
    
    await page.screenshot({ path: 'test-results/jwt-api-demo.png', fullPage: true });
    console.log('🔧 JWT API Technical Demo Complete');
  });
});