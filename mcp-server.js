import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { InitializeRequestSchema, CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';

class ChromeDevToolsServer {
  constructor() {
    this.server = new Server(
      {
        name: 'chrome-devtools-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browser = null;
    this.page = null;

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler('initialize', async (request) => {
      return {
        protocolVersion: request.params.protocolVersion,
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
        serverInfo: {
          name: 'chrome-devtools-server',
          version: '1.0.0',
        },
      };
    });

    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'launch_browser',
            description: 'Launch a Chrome browser instance',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'navigate_page',
            description: 'Navigate to a URL in the current page',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'URL to navigate to' },
              },
              required: ['url'],
            },
          },
          {
            name: 'take_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                filename: { type: 'string', description: 'Filename for the screenshot' },
              },
            },
          },
          {
            name: 'get_page_title',
            description: 'Get the title of the current page',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'close_browser',
            description: 'Close the browser instance',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;
        switch (name) {
          case 'launch_browser':
            result = await this.launchBrowser();
            break;
          case 'navigate_page':
            result = await this.navigatePage(args.url);
            break;
          case 'take_screenshot':
            result = await this.takeScreenshot(args.filename || 'screenshot.png');
            break;
          case 'get_page_title':
            result = await this.getPageTitle();
            break;
          case 'close_browser':
            result = await this.closeBrowser();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        return result;
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async launchBrowser() {
    if (this.browser) {
      return { content: [{ type: 'text', text: 'Browser already launched' }] };
    }

    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();

    return { content: [{ type: 'text', text: 'Browser launched successfully' }] };
  }

  async navigatePage(url) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    await this.page.goto(url);
    return { content: [{ type: 'text', text: `Navigated to ${url}` }] };
  }

  async takeScreenshot(filename) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    await this.page.screenshot({ path: filename });
    return { content: [{ type: 'text', text: `Screenshot saved as ${filename}` }] };
  }

  async getPageTitle() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const title = await this.page.title();
    return { content: [{ type: 'text', text: `Page title: ${title}` }] };
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      return { content: [{ type: 'text', text: 'Browser closed' }] };
    }
    return { content: [{ type: 'text', text: 'Browser not running' }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Chrome DevTools MCP Server running...');
  }
}

// Run the server
const server = new ChromeDevToolsServer();
server.run().catch(console.error);