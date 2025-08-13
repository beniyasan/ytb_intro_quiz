// Simple test script to verify authentication endpoints work
// Run with: node test-auth.js

const axios = require('axios');
require('dotenv/config');

const BASE_URL = 'http://localhost:3001/api';

async function testAuthentication() {
  console.log('🚀 Testing Authentication System...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test 2: User Registration
    console.log('\n2. Testing User Registration...');
    const registerData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!'
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
      console.log('✅ Registration successful:', registerResponse.data.message);
      
      const { accessToken, refreshToken } = registerResponse.data.data;
      console.log('   - Access token received:', !!accessToken);
      console.log('   - Refresh token received:', !!refreshToken);

      // Test 3: Get User Profile
      console.log('\n3. Testing Get User Profile...');
      const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('✅ Profile retrieved:', profileResponse.data.data.email);

      // Test 4: Token Validation
      console.log('\n4. Testing Token Validation...');
      const validateResponse = await axios.get(`${BASE_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('✅ Token validation passed:', validateResponse.data.message);

      // Test 5: Token Refresh
      console.log('\n5. Testing Token Refresh...');
      const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken
      });
      console.log('✅ Token refresh successful');
      
      const newAccessToken = refreshResponse.data.data.accessToken;
      console.log('   - New access token received:', !!newAccessToken);

      // Test 6: Login
      console.log('\n6. Testing User Login...');
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: registerData.email,
        password: registerData.password
      });
      console.log('✅ Login successful:', loginResponse.data.message);

      console.log('\n🎉 All authentication tests passed!');
      
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.code === 'EmailAlreadyExistsException') {
        console.log('ℹ️  User already exists, testing login instead...');
        
        // Test Login with existing user
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: registerData.email,
          password: registerData.password
        });
        console.log('✅ Login successful:', loginResponse.data.message);
        
        const { accessToken } = loginResponse.data.data;
        
        // Test profile with login token
        const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log('✅ Profile retrieved:', profileResponse.data.data.email);
        
        console.log('\n🎉 Authentication tests completed with existing user!');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
    console.error('   URL:', error.config?.url);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3001');
    console.log('   Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  await testAuthentication();
}

main();