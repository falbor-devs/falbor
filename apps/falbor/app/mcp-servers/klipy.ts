import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
const API_KEY = process.env.KLIPY_APIKEY;
if (!API_KEY) {
  console.error("KLIPY_APIKEY environment variable is missing.");
  process.exit(1);
}
const server = new Server(
  {
    name: 'klipy-mcp-server',
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
        name: 'search_gifs',
        description: 'Search for GIFs and stickers using Klipy API.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query for the GIF (e.g., "cat", "happy birthday").',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default 5).',
              default: 5,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'search_gifs') {
    const query = args?.query as string;
    const limit = (args?.limit as number) || 5;

    if (!query) {
      throw new Error('Query is required for search_gifs tool.');
    }

    try {
      const url = `https://api.klipy.com/api/v1/${API_KEY}/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Klipy API returned status: ${response.status}`);
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.data || []);
      if (items.length === 0) {
        return {
          content: [{ type: 'text', text: `No GIFs found for query: ${query}` }]
        };
      }
      const gifsText = items.slice(0, limit).map((item: any) => {
        const gifUrl = item.file?.hd?.gif?.url || item.file?.md?.gif?.url || item.images?.original?.url || item.url || item.media_url || 'Unknown URL';
        return `- ![${item.title || 'GIF'}](${gifUrl})`;
      }).join('\n');
      return {
        content: [
          {
            type: 'text',
            text: `Found GIFs for "${query}":\n${gifsText}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to search GIFs: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Klipy MCP server running on stdio');
}
main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});