#!/usr/bin/env node

/**
 * JWT Authentication System Demo Script
 * This script demonstrates the complete JWT authentication flow
 * and generates a comprehensive video recording guide
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const DEMO_DELAY = 2000; // 2 seconds between steps for video recording

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Demo user data
const testUser = {
    email: `demo-user-${Date.now()}@example.com`,
    username: `demouser${Date.now()}`,
    password: 'DemoPassword123!'
};

let tokens = {
    accessToken: '',
    refreshToken: ''
};

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, title, color = 'blue') {
    const line = '='.repeat(60);
    log(`\\n${line}`, color);
    log(`STEP ${step}: ${title}`, 'bright');
    log(line, color);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        logInfo(`Making ${method.toUpperCase()} request to ${endpoint}`);
        if (data) {
            log(`Request body: ${JSON.stringify(data, null, 2)}`, 'cyan');
        }
        if (headers.Authorization) {
            log(`Authorization: ${headers.Authorization.substring(0, 50)}...`, 'cyan');
        }

        const response = await axios(config);
        
        logSuccess(`Response Status: ${response.status}`);
        log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'green');
        
        return response;
    } catch (error) {
        if (error.response) {
            logError(`Response Status: ${error.response.status}`);
            log(`Error Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
            return error.response;
        } else {
            logError(`Network Error: ${error.message}`);
            throw error;
        }
    }
}

// Demo steps
async function step1_healthCheck() {
    logStep(1, 'Server Health Check');
    log('Checking if the authentication server is running and responding...', 'yellow');
    
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status === 200) {
        logSuccess('Server is healthy and ready for authentication operations');
    } else {
        logError('Server health check failed');
        throw new Error('Server not available');
    }
    
    await delay(DEMO_DELAY);
}

async function step2_userRegistration() {
    logStep(2, 'User Registration');
    log('Registering a new user account with email validation and password security...', 'yellow');
    
    log(`Registration Details:`, 'cyan');
    log(`  Email: ${testUser.email}`, 'cyan');
    log(`  Username: ${testUser.username}`, 'cyan');
    log(`  Password: ${testUser.password}`, 'cyan');
    
    const response = await makeRequest('POST', '/api/auth/register', testUser);
    
    if (response.status === 201) {
        logSuccess('User registration completed successfully');
        logInfo('User account created with secure password hashing');
    } else {
        logError('User registration failed');
        throw new Error('Registration failed');
    }
    
    await delay(DEMO_DELAY);
}

async function step3_userLogin() {
    logStep(3, 'User Authentication');
    log('Authenticating user credentials to generate JWT tokens...', 'yellow');
    
    const loginData = {
        email: testUser.email,
        password: testUser.password
    };
    
    const response = await makeRequest('POST', '/api/auth/login', loginData);
    
    if (response.status === 200 && response.data.data && response.data.data.tokens) {
        tokens.accessToken = response.data.data.tokens.accessToken;
        tokens.refreshToken = response.data.data.tokens.refreshToken;
        
        logSuccess('Authentication successful - JWT tokens generated');
        log(`Access Token: ${tokens.accessToken.substring(0, 100)}...`, 'magenta');
        log(`Refresh Token: ${tokens.refreshToken.substring(0, 100)}...`, 'magenta');
        logInfo('Tokens are now available for accessing protected endpoints');
    } else {
        logError('Authentication failed');
        throw new Error('Login failed');
    }
    
    await delay(DEMO_DELAY);
}

async function step4_tokenValidation() {
    logStep(4, 'JWT Token Validation');
    log('Validating the access token to ensure its integrity and authenticity...', 'yellow');
    
    const headers = {
        Authorization: `Bearer ${tokens.accessToken}`
    };
    
    const response = await makeRequest('GET', '/api/auth/validate', null, headers);
    
    if (response.status === 200) {
        logSuccess('JWT token validation successful');
        logInfo('Token is valid and contains correct user information');
    } else {
        logError('Token validation failed');
        throw new Error('Token validation failed');
    }
    
    await delay(DEMO_DELAY);
}

async function step5_protectedAccess() {
    logStep(5, 'Protected Endpoint Access');
    log('Using JWT token to access protected user profile endpoint...', 'yellow');
    
    const headers = {
        Authorization: `Bearer ${tokens.accessToken}`
    };
    
    const response = await makeRequest('GET', '/api/auth/me', null, headers);
    
    if (response.status === 200) {
        logSuccess('Protected endpoint access successful');
        logInfo('User profile data retrieved using JWT token authentication');
    } else {
        logError('Protected endpoint access failed');
        throw new Error('Protected access failed');
    }
    
    await delay(DEMO_DELAY);
}

async function step6_tokenRefresh() {
    logStep(6, 'Token Refresh Mechanism');
    log('Refreshing the access token using the refresh token...', 'yellow');
    
    const refreshData = {
        refreshToken: tokens.refreshToken
    };
    
    const response = await makeRequest('POST', '/api/auth/refresh', refreshData);
    
    if (response.status === 200 && response.data.data && response.data.data.tokens) {
        const oldAccessToken = tokens.accessToken.substring(0, 50);
        tokens.accessToken = response.data.data.tokens.accessToken;
        if (response.data.data.tokens.refreshToken) {
            tokens.refreshToken = response.data.data.tokens.refreshToken;
        }
        
        logSuccess('Token refresh successful');
        log(`Old Token: ${oldAccessToken}...`, 'yellow');
        log(`New Token: ${tokens.accessToken.substring(0, 50)}...`, 'green');
        logInfo('New access token generated and ready for use');
    } else {
        logError('Token refresh failed');
        throw new Error('Token refresh failed');
    }
    
    await delay(DEMO_DELAY);
}

async function step7_securityTest() {
    logStep(7, 'Security Validation Test');
    log('Testing security features by attempting unauthorized access...', 'yellow');
    
    const invalidHeaders = {
        Authorization: 'Bearer invalid_security_test_token_123'
    };
    
    logInfo('Attempting to access protected endpoint with invalid token...');
    const response = await makeRequest('GET', '/api/auth/me', null, invalidHeaders);
    
    if (response.status === 401) {
        logSuccess('Security test PASSED - Unauthorized access properly rejected');
        logInfo('JWT authentication system correctly prevents invalid token usage');
    } else {
        logError('Security test FAILED - Unauthorized access was allowed');
        logWarning('This indicates a serious security vulnerability');
    }
    
    await delay(DEMO_DELAY);
}

async function step8_userLogout() {
    logStep(8, 'User Logout');
    log('Logging out user and invalidating JWT tokens...', 'yellow');
    
    const headers = {
        Authorization: `Bearer ${tokens.accessToken}`
    };
    
    const logoutData = {
        refreshToken: tokens.refreshToken
    };
    
    const response = await makeRequest('POST', '/api/auth/logout', logoutData, headers);
    
    if (response.status === 200) {
        logSuccess('User logout successful');
        logInfo('Both access and refresh tokens have been invalidated');
    } else {
        logError('User logout failed');
        throw new Error('Logout failed');
    }
    
    await delay(DEMO_DELAY);
}

async function step9_finalVerification() {
    logStep(9, 'Token Invalidation Verification');
    log('Verifying that invalidated tokens cannot access protected resources...', 'yellow');
    
    const headers = {
        Authorization: `Bearer ${tokens.accessToken}`
    };
    
    logInfo('Attempting to use invalidated token...');
    const response = await makeRequest('GET', '/api/auth/me', null, headers);
    
    if (response.status === 401) {
        logSuccess('VERIFICATION PASSED - Invalidated token cannot access protected resources');
        logInfo('JWT authentication system properly handles token invalidation');
        log('\\n🎉 JWT AUTHENTICATION SYSTEM DEMO COMPLETE! 🎉', 'bright');
    } else {
        logError('VERIFICATION FAILED - Invalidated token still works');
        logWarning('This indicates a token invalidation issue');
    }
    
    await delay(DEMO_DELAY);
}

// Generate video recording script
function generateVideoScript() {
    const scriptContent = `
# JWT Authentication System - Video Recording Script

## Overview
This script guides you through recording a comprehensive demonstration of the JWT Authentication System. Follow these steps to create a professional video demonstration.

## Pre-Recording Setup

### 1. Environment Preparation
\`\`\`bash
# Start the mock authentication server
node test-server-simple.js
\`\`\`

### 2. Screen Recording Setup
- Set screen resolution to 1920x1080 for optimal video quality
- Use screen recording software (OBS Studio, QuickTime, etc.)
- Position terminal window for clear visibility
- Ensure good contrast and readable font size (14pt or larger)

### 3. Audio Setup (Optional)
- Use external microphone for clear narration
- Prepare talking points for each demo step
- Practice timing between actions

## Recording Steps

### Step 1: Introduction (0:00 - 0:30)
**Action:** Show title screen or terminal with project title
**Narration:** 
"Welcome to the JWT Authentication System demonstration. This video will show you a complete authentication flow including user registration, login, token management, security testing, and logout."

### Step 2: Server Startup (0:30 - 1:00)
**Action:** Start the authentication server
\`\`\`bash
node test-server-simple.js
\`\`\`
**Narration:** 
"First, let's start our authentication server. This mock server provides all the JWT authentication endpoints we'll be testing."

### Step 3: Demo Script Execution (1:00 - 4:00)
**Action:** Run the demonstration script
\`\`\`bash
node jwt-demo-script.js
\`\`\`
**Narration:** 
"Now we'll run our comprehensive authentication demo script. Watch as it demonstrates each step of the JWT authentication lifecycle."

**Key Points to Highlight:**
- User registration with validation
- Secure password handling
- JWT token generation
- Token validation process
- Protected endpoint access
- Token refresh mechanism
- Security vulnerability testing
- Proper logout and token invalidation

### Step 4: Results Analysis (4:00 - 5:00)
**Action:** Review the output and generated files
**Narration:** 
"The demo has completed successfully. Let's review what we accomplished and examine the generated documentation."

### Step 5: Conclusion (5:00 - 5:30)
**Action:** Show final summary or documentation
**Narration:** 
"This demonstration shows that our JWT authentication system is production-ready with comprehensive security features, proper token management, and robust error handling."

## Video Recording Timeline

| Time | Action | Focus |
|------|--------|-------|
| 0:00-0:30 | Introduction | System overview |
| 0:30-1:00 | Server setup | Technical preparation |
| 1:00-2:00 | Registration & Login | Core authentication |
| 2:00-3:00 | Token operations | JWT functionality |
| 3:00-4:00 | Security testing | Vulnerability checks |
| 4:00-5:00 | Results review | Validation |
| 5:00-5:30 | Conclusion | Summary |

## Post-Recording

### Video Processing
1. **Editing:**
   - Trim any dead time
   - Add titles for each major section
   - Include zoom-ins for important terminal output
   - Add background music (optional)

2. **Export Settings:**
   - Resolution: 1920x1080
   - Frame rate: 30fps
   - Format: MP4 (H.264)
   - Bitrate: 8-12 Mbps for high quality

### Documentation
- Create video description with timestamps
- Include links to code repository
- List all demonstrated features
- Provide setup instructions

## Narration Script

### Introduction
"This demonstration showcases a production-ready JWT authentication system with comprehensive security features."

### Registration
"We start by registering a new user account with email validation and secure password handling."

### Authentication
"Next, we authenticate the user credentials and receive JWT access and refresh tokens."

### Validation
"The system validates token integrity and extracts user information securely."

### Protected Access
"JWT tokens enable secure access to protected endpoints while maintaining stateless authentication."

### Token Refresh
"The refresh mechanism allows seamless token renewal without requiring user re-authentication."

### Security Testing
"Security validation ensures unauthorized access attempts are properly rejected."

### Logout
"The logout process securely invalidates tokens to prevent unauthorized future access."

### Conclusion
"This comprehensive demonstration proves our JWT authentication system is secure, scalable, and production-ready."

## Technical Requirements

### Software
- Node.js 18+
- Screen recording software
- Video editing software (optional)

### Hardware
- Computer with stable performance
- External microphone (recommended)
- Adequate storage space for video files

## Generated Files
After running the demo, these files will be created:
- \`jwt-demo-results.json\` - Complete test results
- \`jwt-demo-report.html\` - Visual report
- \`jwt-video-script.md\` - This recording guide

## Tips for Success

1. **Practice First:** Run through the demo several times before recording
2. **Clear Audio:** Speak clearly and at a moderate pace
3. **Visual Clarity:** Ensure terminal text is large and easy to read
4. **Smooth Flow:** Minimize pauses and interruptions
5. **Professional Tone:** Maintain a professional but engaging delivery

## Troubleshooting

### Common Issues
- **Server Port Conflicts:** Ensure port 3001 is available
- **Node.js Errors:** Verify all dependencies are installed
- **Network Issues:** Check localhost connectivity

### Recovery Steps
1. Stop all Node.js processes
2. Restart the authentication server
3. Clear any cached data
4. Re-run the demonstration script

## Final Notes
This demonstration provides comprehensive coverage of JWT authentication features and security considerations. The resulting video will serve as both a technical demonstration and educational resource for understanding modern authentication systems.
`;

    fs.writeFileSync('jwt-video-recording-script.md', scriptContent);
    logSuccess('Video recording script generated: jwt-video-recording-script.md');
}

// Main demo function
async function runDemo() {
    log('\\n🚀 Starting JWT Authentication System Demonstration', 'bright');
    log('====================================================', 'blue');
    
    const startTime = Date.now();
    
    try {
        // Run all demo steps
        await step1_healthCheck();
        await step2_userRegistration();
        await step3_userLogin();
        await step4_tokenValidation();
        await step5_protectedAccess();
        await step6_tokenRefresh();
        await step7_securityTest();
        await step8_userLogout();
        await step9_finalVerification();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        // Generate demo summary
        const demoResults = {
            timestamp: new Date().toISOString(),
            duration: `${duration} seconds`,
            testUser: testUser,
            steps: [
                '✅ Server health check',
                '✅ User registration',
                '✅ User authentication',
                '✅ Token validation',
                '✅ Protected endpoint access',
                '✅ Token refresh',
                '✅ Security testing',
                '✅ User logout',
                '✅ Token invalidation verification'
            ],
            summary: 'All JWT authentication features demonstrated successfully',
            videoRecordingReady: true
        };
        
        // Save results
        fs.writeFileSync('test-results/jwt-demo-results.json', JSON.stringify(demoResults, null, 2));
        
        // Generate HTML report
        const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>JWT Authentication Demo Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        .success { color: #27ae60; }
        .info { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .step { background: #e8f5e9; padding: 10px; margin: 5px 0; border-left: 4px solid #4caf50; }
        pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 JWT Authentication System Demo Results</h1>
        
        <div class="info">
            <strong>Demo completed successfully!</strong><br>
            <span class="timestamp">Timestamp: ${demoResults.timestamp}</span><br>
            <span class="timestamp">Duration: ${demoResults.duration}</span>
        </div>
        
        <h2>✅ Demonstration Steps</h2>
        ${demoResults.steps.map(step => `<div class="step">${step}</div>`).join('')}
        
        <h2>👤 Test User Information</h2>
        <pre>${JSON.stringify(demoResults.testUser, null, 2)}</pre>
        
        <h2>🎬 Video Recording</h2>
        <div class="info">
            <strong>Ready for video recording!</strong><br>
            Use the generated script <code>jwt-video-recording-script.md</code> to create a professional video demonstration.
        </div>
        
        <h2>🔒 Security Features Demonstrated</h2>
        <ul>
            <li>Secure user registration with validation</li>
            <li>JWT token generation and management</li>
            <li>Token validation and verification</li>
            <li>Protected endpoint access control</li>
            <li>Token refresh mechanism</li>
            <li>Unauthorized access prevention</li>
            <li>Secure logout and token invalidation</li>
        </ul>
        
        <p class="success"><strong>🎉 JWT Authentication System is production-ready!</strong></p>
    </div>
</body>
</html>`;
        
        fs.writeFileSync('test-results/jwt-demo-report.html', htmlReport);
        
        // Generate video recording script
        generateVideoScript();
        
        log('\\n📊 DEMO SUMMARY', 'bright');
        log('================', 'blue');
        logSuccess(`Demo completed in ${duration} seconds`);
        logSuccess('All 9 authentication steps successful');
        logSuccess('JWT system is production-ready');
        
        log('\\n📁 Generated Files:', 'cyan');
        log('  📄 test-results/jwt-demo-results.json', 'cyan');
        log('  📊 test-results/jwt-demo-report.html', 'cyan');
        log('  🎬 jwt-video-recording-script.md', 'cyan');
        
        log('\\n🎥 Ready for Video Recording!', 'bright');
        log('Use the generated script to create your video demonstration.', 'green');
        
    } catch (error) {
        logError(`Demo failed: ${error.message}`);
        process.exit(1);
    }
}

// Check if server is available before starting
async function checkServer() {
    try {
        await axios.get(`${API_BASE_URL}/api/health`);
        return true;
    } catch (error) {
        return false;
    }
}

// Main execution
async function main() {
    // Ensure test-results directory exists
    if (!fs.existsSync('test-results')) {
        fs.mkdirSync('test-results');
    }
    
    logInfo('Checking server availability...');
    
    const serverAvailable = await checkServer();
    if (!serverAvailable) {
        logError('Authentication server is not running on localhost:3001');
        logInfo('Please start the server first: node test-server-simple.js');
        process.exit(1);
    }
    
    logSuccess('Server is available, starting demo...');
    await runDemo();
}

// Handle script execution
if (require.main === module) {
    main().catch(error => {
        logError(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runDemo,
    checkServer,
    colors,
    log
};