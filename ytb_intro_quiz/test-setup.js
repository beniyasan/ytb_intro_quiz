#!/usr/bin/env node

/**
 * Test script to verify Playwright and MCP setup
 */

const { chromium } = require('playwright');

async function testPlaywright() {
  console.log('Testing Playwright setup...\n');

  try {
    // Test browser launch
    console.log('1. Launching browser...');
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('   ✓ Browser launched successfully');

    // Test page creation
    console.log('2. Creating new page...');
    const page = await browser.newPage();
    console.log('   ✓ Page created successfully');

    // Test navigation
    console.log('3. Navigating to example.com...');
    await page.goto('https://example.com');
    console.log('   ✓ Navigation successful');

    // Test element interaction
    console.log('4. Getting page title...');
    const title = await page.title();
    console.log(`   ✓ Page title: ${title}`);

    // Test screenshot
    console.log('5. Taking screenshot...');
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('   ✓ Screenshot saved');

    // Cleanup
    console.log('6. Closing browser...');
    await browser.close();
    console.log('   ✓ Browser closed\n');

    console.log('✅ All Playwright tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nThis might be due to missing system dependencies.');
    console.error('To run in Docker, use: make test');
    return false;
  }
}

async function testMCPServer() {
  console.log('\nTesting MCP Server setup...\n');

  try {
    // Check if MCP SDK is properly installed
    const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
    console.log('✓ MCP SDK is installed');

    // Check if server can be instantiated
    const server = new Server({
      name: 'test-server',
      version: '1.0.0',
    });
    console.log('✓ MCP Server can be instantiated');

    console.log('\n✅ MCP setup is ready!');
    console.log('To start the MCP server, run: npm run mcp:start');
    return true;
  } catch (error) {
    console.error('\n❌ MCP test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('=================================');
  console.log('Playwright & MCP Setup Test');
  console.log('=================================\n');

  const playwrightOk = await testPlaywright();
  const mcpOk = await testMCPServer();

  if (playwrightOk && mcpOk) {
    console.log('\n✅ All tests passed! Your setup is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);