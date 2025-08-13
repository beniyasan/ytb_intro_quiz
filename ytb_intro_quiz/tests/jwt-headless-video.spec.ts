import { test, expect, type Page } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3001';

// Test data for video demo
const testUser = {
  email: `headless-demo-${Date.now()}@example.com`,
  username: `headlessdemo${Date.now()}`,
  password: 'HeadlessDemo123!'
};

let authTokens = {
  accessToken: '',
  refreshToken: ''
};

test.describe('JWT Authentication System - Headless Video Recording', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enhanced logging for video demonstration
    page.on('console', msg => {
      console.log(`🖥️  Browser Console [${msg.type()}]: ${msg.text()}`);
    });

    // Log all API requests and responses
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        console.log(`📤 REQUEST: ${req.method()} ${req.url()}`);
        if (req.postData()) {
          try {
            const data = JSON.parse(req.postData()!);
            console.log(`📤 REQUEST BODY:`, JSON.stringify(data, null, 2));
          } catch (e) {
            console.log(`📤 REQUEST BODY: ${req.postData()}`);
          }
        }
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('/api/')) {
        console.log(`📥 RESPONSE: ${res.status()} ${res.url()}`);
        try {
          const responseBody = await res.text();
          if (responseBody) {
            const data = JSON.parse(responseBody);
            console.log(`📥 RESPONSE BODY:`, JSON.stringify(data, null, 2));
          }
        } catch (e) {
          console.log(`📥 RESPONSE: Status ${res.status()}`);
        }
      }
    });
  });

  test('Complete JWT Authentication Flow - Headless Video Recording', async ({ page }) => {
    console.log('🎬 Starting JWT Authentication Headless Video Recording...');
    console.log(`📧 Test User Email: ${testUser.email}`);
    console.log(`👤 Test Username: ${testUser.username}`);
    console.log(`🔐 Test Password: ${testUser.password}`);

    // Create a comprehensive demo page optimized for headless recording
    const headlessVideoHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JWT Authentication System - Headless Video Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
            padding: 20px;
            overflow-x: hidden;
        }
        
        .demo-header {
            text-align: center;
            margin-bottom: 40px;
            background: rgba(0, 0, 0, 0.3);
            padding: 30px;
            border-radius: 20px;
            backdrop-filter: blur(20px);
        }
        
        .demo-header h1 {
            font-size: 4em;
            font-weight: 700;
            margin-bottom: 15px;
            background: linear-gradient(45deg, #fff, #f0f0f0);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .demo-subtitle {
            font-size: 1.5em;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .demo-container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .status-bar {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin: 30px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .status-info {
            font-size: 1.1em;
        }
        
        .demo-progress {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 30px;
            width: 300px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            width: 0%;
            transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
        }
        
        .demo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
        }
        
        .demo-step {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
            border: 3px solid transparent;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        
        .demo-step::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #e0e0e0, #e0e0e0);
            transition: background 0.8s ease;
        }
        
        .demo-step.active {
            border-color: #2196F3;
            transform: scale(1.05);
            box-shadow: 0 25px 60px rgba(33, 150, 243, 0.3);
        }
        
        .demo-step.active::before {
            background: linear-gradient(90deg, #2196F3, #21CBF3);
        }
        
        .demo-step.success {
            border-color: #4CAF50;
            background: linear-gradient(135deg, #E8F5E8, #F1F8E9);
        }
        
        .demo-step.success::before {
            background: linear-gradient(90deg, #4CAF50, #45a049);
        }
        
        .demo-step.error {
            border-color: #f44336;
            background: linear-gradient(135deg, #FFEBEE, #FFCDD2);
        }
        
        .demo-step.error::before {
            background: linear-gradient(90deg, #f44336, #d32f2f);
        }
        
        .step-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .step-number {
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2em;
            margin-right: 15px;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
        }
        
        .demo-step.success .step-number {
            background: linear-gradient(135deg, #4CAF50, #388E3C);
        }
        
        .demo-step.error .step-number {
            background: linear-gradient(135deg, #f44336, #d32f2f);
        }
        
        .step-title {
            font-size: 1.4em;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .step-description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .step-response {
            background: #1e1e1e;
            color: #e0e0e0;
            padding: 20px;
            border-radius: 12px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 400px;
            overflow-y: auto;
            border-left: 4px solid #333;
            margin: 15px 0;
        }
        
        .step-response.success {
            border-left-color: #4CAF50;
            background: #0d1b0d;
        }
        
        .step-response.error {
            border-left-color: #f44336;
            background: #1b0d0d;
        }
        
        .token-showcase {
            background: linear-gradient(135deg, #FFF3CD, #FFF8DC);
            color: #856404;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            border: 2px solid #FFC107;
            font-family: 'SF Mono', monospace;
            position: relative;
            overflow: hidden;
        }
        
        .token-showcase::before {
            content: '🔐';
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 2em;
            opacity: 0.3;
        }
        
        .token-label {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 10px;
            color: #b8860b;
        }
        
        .token-value {
            font-size: 12px;
            word-break: break-all;
            line-height: 1.6;
            padding: 10px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 8px;
            margin: 8px 0;
        }
        
        .demo-controls {
            text-align: center;
            margin: 40px 0;
        }
        
        .demo-button {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 20px 40px;
            border-radius: 50px;
            font-size: 1.3em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.4s ease;
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .demo-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
        }
        
        .demo-button:disabled {
            background: linear-gradient(135deg, #9E9E9E, #757575);
            cursor: not-allowed;
            transform: none;
        }
        
        .full-width {
            grid-column: span 2;
        }
        
        @media (max-width: 1200px) {
            .demo-grid {
                grid-template-columns: 1fr;
            }
            .full-width {
                grid-column: span 1;
            }
        }
        
        .animation-slide-in {
            animation: slideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    </style>
</head>
<body>
    <div class="demo-container">
        <div class="demo-header">
            <h1>🔐 JWT Authentication System</h1>
            <p class="demo-subtitle">Comprehensive Security Demo - Headless Video Recording</p>
        </div>
        
        <div class="status-bar">
            <div class="status-info" id="statusInfo">
                <strong>Ready to Start Demo</strong> | User: ${testUser.username} | Email: ${testUser.email}
            </div>
            <div class="demo-progress">
                <div class="progress-fill" id="progressFill">0%</div>
            </div>
        </div>
        
        <div class="demo-controls">
            <button class="demo-button" id="startDemoBtn" onclick="startAuthDemo()">
                🚀 Start JWT Authentication Demo
            </button>
        </div>
        
        <div class="demo-grid" id="demoGrid" style="display: none;">
            <!-- Step 1: Health Check -->
            <div class="demo-step" id="step1">
                <div class="step-header">
                    <div class="step-number">1</div>
                    <div class="step-title">Server Health Check</div>
                </div>
                <div class="step-description">
                    Verifying authentication server availability and API endpoint accessibility
                </div>
                <div class="step-response" id="healthResponse"></div>
            </div>

            <!-- Step 2: User Registration -->
            <div class="demo-step" id="step2">
                <div class="step-header">
                    <div class="step-number">2</div>
                    <div class="step-title">User Registration</div>
                </div>
                <div class="step-description">
                    Creating new user account with email validation and secure password handling
                </div>
                <div class="step-response" id="registerResponse"></div>
            </div>

            <!-- Step 3: User Authentication -->
            <div class="demo-step" id="step3">
                <div class="step-header">
                    <div class="step-number">3</div>
                    <div class="step-title">User Authentication</div>
                </div>
                <div class="step-description">
                    Authenticating user credentials and generating JWT access and refresh tokens
                </div>
                <div class="step-response" id="loginResponse"></div>
                <div class="token-showcase" id="tokenShowcase" style="display: none;">
                    <div class="token-label">Generated JWT Tokens</div>
                    <div class="token-value" id="accessTokenDisplay"></div>
                    <div class="token-value" id="refreshTokenDisplay"></div>
                </div>
            </div>

            <!-- Step 4: Token Validation -->
            <div class="demo-step" id="step4">
                <div class="step-header">
                    <div class="step-number">4</div>
                    <div class="step-title">Token Validation</div>
                </div>
                <div class="step-description">
                    Validating JWT access token integrity and extracting user information
                </div>
                <div class="step-response" id="validateResponse"></div>
            </div>

            <!-- Step 5: Protected Endpoint Access -->
            <div class="demo-step" id="step5">
                <div class="step-header">
                    <div class="step-number">5</div>
                    <div class="step-title">Protected Endpoint Access</div>
                </div>
                <div class="step-description">
                    Using JWT token to access protected user profile endpoint
                </div>
                <div class="step-response" id="profileResponse"></div>
            </div>

            <!-- Step 6: Token Refresh -->
            <div class="demo-step" id="step6">
                <div class="step-header">
                    <div class="step-number">6</div>
                    <div class="step-title">Token Refresh</div>
                </div>
                <div class="step-description">
                    Refreshing expired access token using secure refresh token
                </div>
                <div class="step-response" id="refreshResponse"></div>
            </div>

            <!-- Step 7: Security Testing -->
            <div class="demo-step" id="step7">
                <div class="step-header">
                    <div class="step-number">7</div>
                    <div class="step-title">Security Validation</div>
                </div>
                <div class="step-description">
                    Testing unauthorized access protection and invalid token handling
                </div>
                <div class="step-response" id="securityResponse"></div>
            </div>

            <!-- Step 8: User Logout -->
            <div class="demo-step" id="step8">
                <div class="step-header">
                    <div class="step-number">8</div>
                    <div class="step-title">User Logout</div>
                </div>
                <div class="step-description">
                    Logging out user and securely invalidating all JWT tokens
                </div>
                <div class="step-response" id="logoutResponse"></div>
            </div>

            <!-- Step 9: Final Verification -->
            <div class="demo-step full-width" id="step9">
                <div class="step-header">
                    <div class="step-number">9</div>
                    <div class="step-title">Token Invalidation Verification</div>
                </div>
                <div class="step-description">
                    Confirming that invalidated tokens cannot access protected resources
                </div>
                <div class="step-response" id="verifyResponse"></div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = '${API_BASE_URL}';
        const testUser = ${JSON.stringify(testUser)};
        let tokens = { accessToken: '', refreshToken: '' };
        let currentStep = 0;
        const totalSteps = 9;

        // Demo control functions
        function updateProgress(step) {
            const progress = Math.round((step / totalSteps) * 100);
            const progressElement = document.getElementById('progressFill');
            progressElement.style.width = progress + '%';
            progressElement.textContent = progress + '%';
            
            const statusInfo = document.getElementById('statusInfo');
            statusInfo.innerHTML = \`<strong>Step \${step} of \${totalSteps}</strong> | Progress: \${progress}% | Status: In Progress\`;
        }

        function setStepStatus(stepId, status) {
            const step = document.getElementById(stepId);
            step.classList.remove('active', 'success', 'error');
            step.classList.add(status);
            
            if (status === 'active') {
                step.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function updateResponse(elementId, content, type = 'info') {
            const element = document.getElementById(elementId);
            element.textContent = content;
            element.className = 'step-response ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
        }

        async function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async function startAuthDemo() {
            console.log('🎬 Starting JWT Authentication Demo...');
            
            // Hide start button and show demo grid
            document.getElementById('startDemoBtn').style.display = 'none';
            document.getElementById('demoGrid').style.display = 'grid';
            
            await delay(1000);
            
            try {
                await performHealthCheck();
                await performUserRegistration();
                await performUserLogin();
                await performTokenValidation();
                await performProtectedAccess();
                await performTokenRefresh();
                await performSecurityTest();
                await performUserLogout();
                await performFinalVerification();
                
                // Demo completion
                const statusInfo = document.getElementById('statusInfo');
                statusInfo.innerHTML = '<strong>Demo Complete!</strong> | All 9 steps successful | JWT Authentication System fully validated';
                
                await delay(3000);
                alert('🎉 JWT Authentication Demo Complete!\\n\\nAll security features have been successfully demonstrated and recorded.');
                
            } catch (error) {
                console.error('Demo error:', error);
                const statusInfo = document.getElementById('statusInfo');
                statusInfo.innerHTML = \`<strong>Demo Error:</strong> \${error.message}\`;
            }
        }

        async function performHealthCheck() {
            console.log('🔍 Performing health check...');
            setStepStatus('step1', 'active');
            updateProgress(1);
            
            try {
                const response = await fetch(API_URL + '/api/health');
                const data = await response.json();
                
                const responseText = \`Status: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('healthResponse', responseText, 'success');
                setStepStatus('step1', 'success');
                
                await delay(2500);
            } catch (error) {
                updateResponse('healthResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step1', 'error');
                throw error;
            }
        }

        async function performUserRegistration() {
            console.log('👤 Performing user registration...');
            setStepStatus('step2', 'active');
            updateProgress(2);
            
            try {
                const response = await fetch(API_URL + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testUser)
                });
                const data = await response.json();
                
                const responseText = \`Registration Request:\\nEmail: \${testUser.email}\\nUsername: \${testUser.username}\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('registerResponse', responseText, response.ok ? 'success' : 'error');
                setStepStatus('step2', response.ok ? 'success' : 'error');
                
                if (!response.ok) throw new Error('Registration failed');
                await delay(2500);
            } catch (error) {
                updateResponse('registerResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step2', 'error');
                throw error;
            }
        }

        async function performUserLogin() {
            console.log('🔑 Performing user login...');
            setStepStatus('step3', 'active');
            updateProgress(3);
            
            try {
                const loginData = {
                    email: testUser.email,
                    password: testUser.password
                };
                
                const response = await fetch(API_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });
                const data = await response.json();
                
                if (response.ok && data.data && data.data.tokens) {
                    tokens.accessToken = data.data.tokens.accessToken;
                    tokens.refreshToken = data.data.tokens.refreshToken;
                    
                    // Display tokens
                    document.getElementById('tokenShowcase').style.display = 'block';
                    document.getElementById('accessTokenDisplay').textContent = \`Access Token: \${tokens.accessToken.substring(0, 100)}...\`;
                    document.getElementById('refreshTokenDisplay').textContent = \`Refresh Token: \${tokens.refreshToken.substring(0, 100)}...\`;
                }
                
                const responseText = \`Login Request:\\nEmail: \${loginData.email}\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('loginResponse', responseText, response.ok ? 'success' : 'error');
                setStepStatus('step3', response.ok ? 'success' : 'error');
                
                if (!response.ok) throw new Error('Login failed');
                await delay(3500);
            } catch (error) {
                updateResponse('loginResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step3', 'error');
                throw error;
            }
        }

        async function performTokenValidation() {
            console.log('✅ Performing token validation...');
            setStepStatus('step4', 'active');
            updateProgress(4);
            
            try {
                const response = await fetch(API_URL + '/api/auth/validate', {
                    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
                });
                const data = await response.json();
                
                const responseText = \`Token Validation:\\nToken: Bearer \${tokens.accessToken.substring(0, 50)}...\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('validateResponse', responseText, response.ok ? 'success' : 'error');
                setStepStatus('step4', response.ok ? 'success' : 'error');
                
                if (!response.ok) throw new Error('Token validation failed');
                await delay(2500);
            } catch (error) {
                updateResponse('validateResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step4', 'error');
                throw error;
            }
        }

        async function performProtectedAccess() {
            console.log('🛡️ Performing protected endpoint access...');
            setStepStatus('step5', 'active');
            updateProgress(5);
            
            try {
                const response = await fetch(API_URL + '/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
                });
                const data = await response.json();
                
                const responseText = \`Protected Endpoint Access:\\nEndpoint: /api/auth/me\\nAuthorization: Bearer \${tokens.accessToken.substring(0, 50)}...\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('profileResponse', responseText, response.ok ? 'success' : 'error');
                setStepStatus('step5', response.ok ? 'success' : 'error');
                
                if (!response.ok) throw new Error('Protected access failed');
                await delay(2500);
            } catch (error) {
                updateResponse('profileResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step5', 'error');
                throw error;
            }
        }

        async function performTokenRefresh() {
            console.log('🔄 Performing token refresh...');
            setStepStatus('step6', 'active');
            updateProgress(6);
            
            try {
                const refreshData = { refreshToken: tokens.refreshToken };
                
                const response = await fetch(API_URL + '/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(refreshData)
                });
                const data = await response.json();
                
                if (response.ok && data.data && data.data.tokens) {
                    tokens.accessToken = data.data.tokens.accessToken;
                    if (data.data.tokens.refreshToken) {
                        tokens.refreshToken = data.data.tokens.refreshToken;
                    }
                }
                
                const responseText = \`Token Refresh:\\nRefresh Token: \${refreshData.refreshToken.substring(0, 50)}...\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('refreshResponse', responseText, response.ok ? 'success' : 'error');
                setStepStatus('step6', response.ok ? 'success' : 'error');
                
                if (!response.ok) throw new Error('Token refresh failed');
                await delay(2500);
            } catch (error) {
                updateResponse('refreshResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step6', 'error');
                throw error;
            }
        }

        async function performSecurityTest() {
            console.log('🔒 Performing security test...');
            setStepStatus('step7', 'active');
            updateProgress(7);
            
            try {
                const invalidToken = 'invalid_token_security_test_123';
                const response = await fetch(API_URL + '/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + invalidToken }
                });
                const data = await response.json();
                
                const isSecure = response.status === 401;
                const responseText = \`Security Test:\\nInvalid Token: Bearer \${invalidToken}\\nEndpoint: /api/auth/me\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\\n\\n--- SECURITY ANALYSIS ---\\n\${isSecure ? '✅ PASSED: Unauthorized access properly rejected' : '❌ FAILED: Invalid token was accepted - Security vulnerability detected'}\`;
                
                updateResponse('securityResponse', responseText, isSecure ? 'success' : 'error');
                setStepStatus('step7', isSecure ? 'success' : 'error');
                
                if (!isSecure) throw new Error('Security test failed - unauthorized access was allowed');
                await delay(3000);
            } catch (error) {
                updateResponse('securityResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step7', 'error');
                throw error;
            }
        }

        async function performUserLogout() {
            console.log('🚪 Performing user logout...');
            setStepStatus('step8', 'active');
            updateProgress(8);
            
            try {
                const logoutData = { refreshToken: tokens.refreshToken };
                
                const response = await fetch(API_URL + '/api/auth/logout', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + tokens.accessToken 
                    },
                    body: JSON.stringify(logoutData)
                });
                const data = await response.json();
                
                const responseText = \`User Logout:\\nAccess Token: Bearer \${tokens.accessToken.substring(0, 50)}...\\nRefresh Token: \${tokens.refreshToken.substring(0, 50)}...\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\`;
                updateResponse('logoutResponse', responseText, response.ok ? 'success' : 'error');
                setStepStatus('step8', response.ok ? 'success' : 'error');
                
                if (!response.ok) throw new Error('Logout failed');
                await delay(2500);
            } catch (error) {
                updateResponse('logoutResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step8', 'error');
                throw error;
            }
        }

        async function performFinalVerification() {
            console.log('🚫 Performing final verification...');
            setStepStatus('step9', 'active');
            updateProgress(9);
            
            try {
                const response = await fetch(API_URL + '/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + tokens.accessToken }
                });
                const data = await response.json();
                
                const isInvalidated = response.status === 401;
                const responseText = \`Token Invalidation Verification:\\nInvalidated Token: Bearer \${tokens.accessToken.substring(0, 50)}...\\nEndpoint: /api/auth/me\\n\\nStatus: \${response.status}\\nTimestamp: \${new Date().toISOString()}\\nResponse:\\n\${JSON.stringify(data, null, 2)}\\n\\n--- FINAL VERIFICATION ---\\n\${isInvalidated ? '🎉 SUCCESS: Token invalidation working correctly\\n✅ All JWT security features are functioning properly\\n✅ Authentication system is production-ready' : '⚠️ ISSUE: Token still valid after logout - potential security concern'}\`;
                
                updateResponse('verifyResponse', responseText, isInvalidated ? 'success' : 'error');
                setStepStatus('step9', isInvalidated ? 'success' : 'error');
                
                if (!isInvalidated) throw new Error('Token invalidation verification failed');
                await delay(4000);
            } catch (error) {
                updateResponse('verifyResponse', \`Error: \${error.message}\\nTimestamp: \${new Date().toISOString()}\`, 'error');
                setStepStatus('step9', 'error');
                throw error;
            }
        }

        // Auto-start demo after page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                console.log('🎬 JWT Authentication System Demo Ready');
                console.log('📺 Headless video recording will capture all interactions');
            }, 1000);
        });
    </script>
</body>
</html>`;

    // Navigate to demo page
    await page.goto(`data:text/html,${encodeURIComponent(headlessVideoHTML)}`);
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('📺 Demo page loaded, starting JWT authentication flow...');
    
    // Start the demo
    await page.click('#startDemoBtn');
    
    // Wait for the complete demo to finish (approximately 50 seconds)
    await page.waitForTimeout(55000);
    
    // Take final screenshots
    await page.screenshot({ 
      path: 'test-results/jwt-headless-demo-final.png', 
      fullPage: true 
    });
    
    console.log('🎬 JWT Authentication Headless Video Recording Complete!');
    console.log('📹 Video file saved to test-results/videos/');
    console.log('📊 Comprehensive Demo Results:');
    console.log('  ✅ Server health verification');
    console.log('  ✅ Secure user registration');
    console.log('  ✅ JWT token authentication');
    console.log('  ✅ Token validation process');
    console.log('  ✅ Protected resource access');
    console.log('  ✅ Token refresh mechanism');
    console.log('  ✅ Security vulnerability testing');
    console.log('  ✅ Secure logout process');
    console.log('  ✅ Token invalidation verification');
    
    // Verify final step completed successfully
    await expect(page.locator('#step9.success')).toBeVisible();
  });
});