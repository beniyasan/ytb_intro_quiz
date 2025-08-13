#!/usr/bin/env node

/**
 * Playwright MCP Server
 * Model Context Protocol server for browser automation using Playwright
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { chromium, firefox, webkit } = require('playwright');

class PlaywrightMCPServer {
  constructor() {
    this.server = new Server({
      name: 'playwright-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.browsers = new Map();
    this.pages = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    // Tool: Launch Browser
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'launch_browser',
          description: 'Launch a new browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              browserType: {
                type: 'string',
                enum: ['chromium', 'firefox', 'webkit'],
                default: 'chromium',
              },
              headless: {
                type: 'boolean',
                default: true,
              },
            },
          },
        },
        {
          name: 'navigate',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['pageId', 'url'],
          },
        },
        {
          name: 'click',
          description: 'Click an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              selector: { type: 'string' },
            },
            required: ['pageId', 'selector'],
          },
        },
        {
          name: 'fill',
          description: 'Fill an input field',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              selector: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['pageId', 'selector', 'value'],
          },
        },
        {
          name: 'screenshot',
          description: 'Take a screenshot',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              path: { type: 'string' },
              fullPage: {
                type: 'boolean',
                default: false,
              },
            },
            required: ['pageId', 'path'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: { type: 'string' },
            },
            required: ['browserId'],
          },
        },
        {
          name: 'get_text',
          description: 'Get text content of an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              selector: { type: 'string' },
            },
            required: ['pageId', 'selector'],
          },
        },
        {
          name: 'wait_for_selector',
          description: 'Wait for an element to appear',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              selector: { type: 'string' },
              timeout: {
                type: 'number',
                default: 30000,
              },
            },
            required: ['pageId', 'selector'],
          },
        },
      ],
    }));

    // Tool execution handler
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'launch_browser':
          return await this.launchBrowser(args);
        case 'navigate':
          return await this.navigate(args);
        case 'click':
          return await this.click(args);
        case 'fill':
          return await this.fill(args);
        case 'screenshot':
          return await this.screenshot(args);
        case 'close_browser':
          return await this.closeBrowser(args);
        case 'get_text':
          return await this.getText(args);
        case 'wait_for_selector':
          return await this.waitForSelector(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async launchBrowser({ browserType = 'chromium', headless = true }) {
    const browserTypes = { chromium, firefox, webkit };
    const browserClass = browserTypes[browserType];
    
    if (!browserClass) {
      throw new Error(`Invalid browser type: ${browserType}`);
    }

    const browser = await browserClass.launch({ headless });
    const browserId = `browser-${Date.now()}`;
    this.browsers.set(browserId, browser);

    const page = await browser.newPage();
    const pageId = `page-${Date.now()}`;
    this.pages.set(pageId, page);

    return {
      content: [
        {
          type: 'text',
          text: `Browser launched successfully. Browser ID: ${browserId}, Page ID: ${pageId}`,
        },
      ],
      data: { browserId, pageId },
    };
  }

  async navigate({ pageId, url }) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    await page.goto(url);
    return {
      content: [
        {
          type: 'text',
          text: `Navigated to ${url}`,
        },
      ],
    };
  }

  async click({ pageId, selector }) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    await page.click(selector);
    return {
      content: [
        {
          type: 'text',
          text: `Clicked element: ${selector}`,
        },
      ],
    };
  }

  async fill({ pageId, selector, value }) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    await page.fill(selector, value);
    return {
      content: [
        {
          type: 'text',
          text: `Filled ${selector} with value: ${value}`,
        },
      ],
    };
  }

  async screenshot({ pageId, path, fullPage = false }) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    await page.screenshot({ path, fullPage });
    return {
      content: [
        {
          type: 'text',
          text: `Screenshot saved to ${path}`,
        },
      ],
    };
  }

  async closeBrowser({ browserId }) {
    const browser = this.browsers.get(browserId);
    if (!browser) {
      throw new Error(`Browser not found: ${browserId}`);
    }

    await browser.close();
    this.browsers.delete(browserId);
    
    // Remove associated pages
    for (const [pageId, page] of this.pages.entries()) {
      if (page.context().browser() === browser) {
        this.pages.delete(pageId);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Browser closed: ${browserId}`,
        },
      ],
    };
  }

  async getText({ pageId, selector }) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const text = await page.textContent(selector);
    return {
      content: [
        {
          type: 'text',
          text: `Text content: ${text}`,
        },
      ],
      data: { text },
    };
  }

  async waitForSelector({ pageId, selector, timeout = 30000 }) {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    await page.waitForSelector(selector, { timeout });
    return {
      content: [
        {
          type: 'text',
          text: `Element found: ${selector}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright MCP Server running on stdio');
  }
}

// Start the server
const server = new PlaywrightMCPServer();
server.run().catch(console.error);