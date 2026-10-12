import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN environment variable is missing.");
  process.exit(1);
}

const server = new Server(
  {
    name: 'telegram-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_updates',
        description: 'Fetch the latest messages/updates sent to the Telegram bot.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of updates to fetch',
              default: 10
            }
          }
        },
      },
      {
        name: 'send_message',
        description: 'Send a message to a specific Telegram chat using the bot.',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'The ID of the chat to send the message to'
            },
            text: {
              type: 'string',
              description: 'The message text to send'
            }
          },
          required: ['chat_id', 'text']
        },
      }
    ],
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_updates') {
      const limit = args?.limit || 10;
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=${limit}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Failed to fetch updates');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data.result, null, 2)
          }
        ]
      };
    }

    if (name === 'send_message') {
      const chatId = args?.chat_id;
      const text = args?.text;

      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Failed to send message');
      }

      return {
        content: [
          {
            type: 'text',
            text: `Message sent successfully to ${chatId}`
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing Telegram tool: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
