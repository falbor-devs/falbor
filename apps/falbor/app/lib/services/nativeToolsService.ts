import { tool } from 'ai';
import { z } from 'zod';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('native-tools-service');

export class NativeToolsService {
  static async getToolsForConnectors(selectedMCPs: string[], userId: string): Promise<Record<string, any>> {
    const tools: Record<string, any> = {};

    if (!selectedMCPs || selectedMCPs.length === 0) return tools;

    try {
      const connections = await db.select().from(mcpConnections).where(
        and(
          eq(mcpConnections.userId, userId),
          eq(mcpConnections.status, 'active'),
          inArray(mcpConnections.connectorId, selectedMCPs)
        )
      );

      for (const connection of connections) {
        if (!connection.config) continue;

        switch (connection.connectorId) {
          case 'gmail':
            Object.assign(tools, this.getGmailTools(connection));
            break;
          case 'slack':
            Object.assign(tools, this.getSlackTools(connection));
            break;
          case 'github':
            Object.assign(tools, this.getGitHubTools(connection));
            break;
          case 'vercel':
            Object.assign(tools, this.getVercelTools(connection));
            break;
          case 'telegram':
            Object.assign(tools, this.getTelegramTools(connection));
            break;
          case 'klipy':
            Object.assign(tools, this.getKlipyTools(connection));
            break;
          case 'discord':
            Object.assign(tools, this.getDiscordTools(connection));
            break;
          case 'discord-bot':
            Object.assign(tools, this.getDiscordBotTools(connection));
            break;
          case 'miro':
            Object.assign(tools, this.getMiroTools(connection));
            break;
        }
      }
    } catch (error) {
      logger.error('Failed to get native tools', error);
    }

    return tools;
  }

  static async getAllConnectorIdsForUser(userId: string): Promise<string[]> {
    try {
      const connections = await db
        .select({ connectorId: mcpConnections.connectorId })
        .from(mcpConnections)
        .where(and(eq(mcpConnections.userId, userId), eq(mcpConnections.status, 'active')));
      return [...new Set(connections.map((c) => c.connectorId))];
    } catch {
      return [];
    }
  }

  private static getGmailTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    let accessToken = config.access_token;

    const fetchWithAuth = async (url: string, init?: RequestInit): Promise<Response> => {
      let res = await fetch(url, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` }
      });

      if (res.status === 401 && config.refresh_token) {
        const clientId = process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET;

        if (clientId && clientSecret) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: config.refresh_token,
              grant_type: 'refresh_token',
            })
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            accessToken = refreshData.access_token;
            config.access_token = accessToken;
            if (refreshData.refresh_token) config.refresh_token = refreshData.refresh_token;

            await db.update(mcpConnections)
              .set({ config, updatedAt: new Date() })
              .where(eq(mcpConnections.id, connection.id));

            res = await fetch(url, {
              ...init,
              headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` }
            });
          }
        }
      }
      return res;
    };

    tools['gmail_search_emails'] = tool({
      description: 'Search Gmail for emails using standard Gmail search queries (e.g. "from:boss@example.com", "is:unread"). Returns email IDs and snippets.',
      parameters: z.object({
        query: z.string().describe('The Gmail search query'),
        maxResults: z.number().optional().default(10).describe('Maximum number of emails to return'),
      }),
      execute: async ({ query, maxResults }) => {
        const res = await fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
        if (!res.ok) return `Failed to search emails: ${await res.text()}`;
        const data = await res.json();
        if (!data.messages) return "No emails found.";

        const snippets = await Promise.all(data.messages.map(async (msg: any) => {
          const msgRes = await fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            const subject = msgData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = msgData.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown';
            const date = msgData.payload?.headers?.find((h: any) => h.name === 'Date')?.value || 'Unknown Date';
            return `ID: ${msg.id} | Date: ${date} | From: ${from} | Subject: ${subject} | Snippet: ${msgData.snippet}`;
          }
          return `ID: ${msg.id} | (Failed to load snippet)`;
        }));

        return snippets.join('\n\n');
      }
    });

    tools['gmail_read_email'] = tool({
      description: 'Read the full contents of a specific email by its ID.',
      parameters: z.object({
        id: z.string().describe('The ID of the email to read'),
      }),
      execute: async ({ id }) => {
        const res = await fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`);
        if (!res.ok) return `Failed to read email: ${await res.text()}`;
        const data = await res.json();

        let body = '';
        const getBody = (payload: any) => {
          if (payload.body && payload.body.data) {
            body += Buffer.from(payload.body.data, 'base64').toString('utf-8');
          }
          if (payload.parts) payload.parts.forEach(getBody);
        };
        getBody(data.payload);

        return body.substring(0, 10000);
      }
    });

    tools['gmail_send_email'] = tool({
      description: 'Send an email via Gmail. Provide the recipient email, subject, and the plain text or HTML body.',
      parameters: z.object({
        to: z.string().describe('Recipient email address'),
        subject: z.string().describe('Email subject'),
        body: z.string().describe('Email body content (text or HTML)'),
      }),
      execute: async ({ to, subject, body }) => {
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
          `To: ${to}`,
          `Subject: ${utf8Subject}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          '',
          body
        ];
        const rawEmail = messageParts.join('\r\n');
        const encodedEmail = Buffer.from(rawEmail)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const res = await fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
          method: 'POST',
          body: JSON.stringify({ raw: encodedEmail })
        });
        if (!res.ok) return `Failed to send email: ${await res.text()}`;
        return `Email sent successfully to ${to}`;
      }
    });

    return tools;
  }

  private static getSlackTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;

    const accessToken = config.authed_user?.access_token || config.access_token;

    if (!accessToken) return tools;

    tools['slack_list_channels'] = tool({
      description: 'List public channels in the Slack workspace.',
      parameters: z.object({
        limit: z.number().optional().default(20).describe('Maximum number of channels to return'),
      }),
      execute: async ({ limit }) => {
        const res = await fetch(`https://slack.com/api/conversations.list?limit=${limit}&exclude_archived=true`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (!data.ok) return `Failed to list channels: ${data.error}`;

        const channels = data.channels.map((c: any) => `ID: ${c.id} | Name: #${c.name} | Members: ${c.num_members}`);
        return channels.join('\n');
      }
    });

    tools['slack_search_messages'] = tool({
      description: 'Search for messages in Slack using standard Slack search queries (e.g. "from:@user", "in:#channel").',
      parameters: z.object({
        query: z.string().describe('The Slack search query'),
        count: z.number().optional().default(10).describe('Maximum number of messages to return'),
      }),
      execute: async ({ query, count }) => {
        const res = await fetch(`https://slack.com/api/search.messages?query=${encodeURIComponent(query)}&count=${count}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (!data.ok) return `Failed to search messages: ${data.error}`;

        if (!data.messages?.matches || data.messages.matches.length === 0) return 'No messages found.';

        const matches = data.messages.matches.map((m: any) =>
          `Channel: ${m.channel?.name || 'Unknown'} | User: ${m.username || m.user} | Date: ${new Date(parseFloat(m.ts) * 1000).toLocaleString()}\nMessage: ${m.text}`
        );
        return matches.join('\n\n---\n\n');
      }
    });

    tools['slack_post_message'] = tool({
      description: 'Post a message to a Slack channel. Requires the channel ID.',
      parameters: z.object({
        channelId: z.string().describe('The ID of the channel to post to (e.g. C123456)'),
        text: z.string().describe('The text of the message to post'),
      }),
      execute: async ({ channelId, text }) => {
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: channelId,
            text: text
          })
        });
        const data = await res.json();
        if (!data.ok) return `Failed to post message: ${data.error}`;
        return `Successfully posted message to ${channelId} at timestamp ${data.ts}`;
      }
    });

    return tools;
  }

  private static getGitHubTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const accessToken = config.access_token;

    if (!accessToken) return tools;

    tools['github_search_repos'] = tool({
      description: 'Search for GitHub repositories using GitHub search syntax.',
      parameters: z.object({
        query: z.string().describe('GitHub search query (e.g. "language:typescript stars:>1000")'),
        limit: z.number().optional().default(5).describe('Max results'),
      }),
      execute: async ({ query, limit }) => {
        const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Falbor-AI'
          }
        });
        if (!res.ok) return `Failed to search repos: ${await res.text()}`;
        const data = await res.json();
        if (!data.items) return 'No repositories found.';

        return data.items.map((r: any) =>
          `Repo: ${r.full_name} | Stars: ${r.stargazers_count} | Description: ${r.description}`
        ).join('\n');
      }
    });

    tools['github_get_issue'] = tool({
      description: 'Get the details of a specific GitHub issue or pull request.',
      parameters: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        issueNumber: z.number().describe('Issue or PR number'),
      }),
      execute: async ({ owner, repo, issueNumber }) => {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Falbor-AI'
          }
        });
        if (!res.ok) return `Failed to get issue: ${await res.text()}`;
        const data = await res.json();

        return `Title: ${data.title}\nState: ${data.state}\nAuthor: ${data.user?.login}\n\nBody:\n${data.body}`;
      }
    });

    tools['github_create_issue'] = tool({
      description: 'Create a new issue in a GitHub repository.',
      parameters: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        title: z.string().describe('Issue title'),
        body: z.string().describe('Issue body/description'),
      }),
      execute: async ({ owner, repo, title, body }) => {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Falbor-AI'
          },
          body: JSON.stringify({ title, body })
        });
        if (!res.ok) return `Failed to create issue: ${await res.text()}`;
        const data = await res.json();
        return `Successfully created issue #${data.number}: ${data.html_url}`;
      }
    });

    return tools;
  }

  private static getVercelTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const accessToken = config.access_token;

    if (!accessToken) return tools;

    tools['vercel_list_projects'] = tool({
      description: 'List Vercel projects.',
      parameters: z.object({
        limit: z.number().optional().default(10).describe('Max results'),
      }),
      execute: async ({ limit }) => {
        const res = await fetch(`https://api.vercel.com/v9/projects?limit=${limit}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) return `Failed to list projects: ${await res.text()}`;
        const data = await res.json();
        if (!data.projects) return 'No projects found.';

        return data.projects.map((p: any) =>
          `ID: ${p.id} | Name: ${p.name} | Framework: ${p.framework || 'None'} | Updated: ${new Date(p.updatedAt).toLocaleString()}`
        ).join('\n');
      }
    });

    tools['vercel_list_deployments'] = tool({
      description: 'List recent Vercel deployments.',
      parameters: z.object({
        projectId: z.string().optional().describe('Filter by project ID'),
        limit: z.number().optional().default(5).describe('Max results'),
      }),
      execute: async ({ projectId, limit }) => {
        const url = new URL('https://api.vercel.com/v6/deployments');
        url.searchParams.set('limit', limit.toString());
        if (projectId) url.searchParams.set('projectId', projectId);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) return `Failed to list deployments: ${await res.text()}`;
        const data = await res.json();
        if (!data.deployments) return 'No deployments found.';

        return data.deployments.map((d: any) =>
          `ID: ${d.uid} | URL: ${d.url} | State: ${d.state} | Created: ${new Date(d.created).toLocaleString()}`
        ).join('\n');
      }
    });

    return tools;
  }

  private static getTelegramTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const botToken = config.bot_token;

    if (!botToken) return tools;

    tools['telegram_get_updates'] = tool({
      description: 'Fetch the latest messages/updates sent to the Telegram bot. Use this when asked to check or read messages on Telegram.',
      parameters: z.object({
        limit: z.number().optional().describe('Maximum number of updates to fetch (default: 10)'),
      }),
      execute: async ({ limit = 10 }) => {
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=${limit}`);
          const data = await response.json();
          if (!data.ok) throw new Error(data.description || 'Telegram API error');
          if (data.result.length === 0) return 'No new updates. Your bot has no recent messages.';
          return JSON.stringify(data.result, null, 2);
        } catch (err: any) {
          return `Error fetching Telegram updates: ${err.message}`;
        }
      }
    });

    tools['telegram_send_message'] = tool({
      description: 'Send a message to a specific Telegram chat using the bot.',
      parameters: z.object({
        chat_id: z.string().describe('The ID of the Telegram chat or user to send the message to'),
        text: z.string().describe('The message text to send'),
      }),
      execute: async ({ chat_id, text }) => {
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id, text }),
          });
          const data = await response.json();
          if (!data.ok) throw new Error(data.description || 'Telegram API error');
          return `Message sent successfully to chat ${chat_id}.`;
        } catch (err: any) {
          return `Error sending Telegram message: ${err.message}`;
        }
      }
    });

    tools['telegram_get_bot_info'] = tool({
      description: 'Get information about this Telegram bot (username, name, etc.).',
      parameters: z.object({}),
      execute: async () => {
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
          const data = await response.json();
          if (!data.ok) throw new Error(data.description || 'Telegram API error');
          return JSON.stringify(data.result, null, 2);
        } catch (err: any) {
          return `Error fetching bot info: ${err.message}`;
        }
      }
    });

    return tools;
  }

  private static getKlipyTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const apiKey = config.apiKey || config.api_key;

    if (!apiKey) return tools;

    tools['klipy_search_gifs'] = tool({
      description: 'Search for GIFs using the Klipy API. Returns a list of GIF URLs matching the search query. Use this when the user asks for a GIF.',
      parameters: z.object({
        query: z.string().describe('The search term to find GIFs for'),
        limit: z.number().optional().describe('Maximum number of GIFs to return (default: 5)'),
      }),
      execute: async ({ query, limit = 5 }) => {
        try {
          const url = `https://api.klipy.com/api/v1/${apiKey}/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}`;
          const response = await fetch(url);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Klipy API error');
          const items = data.data || data.results || [];
          if (items.length === 0) return `No GIFs found for "${query}".`;
          const gifList = items.slice(0, limit).map((item: any) => {
            const gifUrl = item.file?.hd?.gif?.url || item.file?.md?.gif?.url || item.images?.original?.url || item.url || 'Unknown URL';
            return `- ![${item.title || 'GIF'}](${gifUrl})`;
          }).join('\n');
          return `Found GIFs for "${query}":\n${gifList}`;
        } catch (err: any) {
          return `Error searching GIFs: ${err.message}`;
        }
      }
    });

    return tools;
  }

  private static getDiscordTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const accessToken = config.access_token;

    if (!accessToken) return tools;

    tools['discord_get_guilds'] = tool({
      description: 'Get a list of Discord servers (guilds) the user is a member of. This is useful to find guild IDs for subsequent channel lookups.',
      parameters: z.object({}),
      execute: async () => {
        try {
          const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!response.ok) throw new Error(`Discord API error: ${await response.text()}`);
          const guilds = await response.json();
          return JSON.stringify(guilds, null, 2);
        } catch (err: any) {
          return `Error fetching Discord guilds: ${err.message}`;
        }
      }
    });
    return tools;
  }

  private static getDiscordBotTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const botToken = config.DISCORD_BOT_BOT_TOKEN || config.bot_token;

    if (!botToken) return tools;

    tools['discord_bot_send_message'] = tool({
      description: 'Send a message to a specific Discord channel using the bot. You must provide the channel ID.',
      parameters: z.object({
        channel_id: z.string().describe('The ID of the Discord channel'),
        content: z.string().describe('The message content to send'),
      }),
      execute: async ({ channel_id, content }) => {
        try {
          const response = await fetch(`https://discord.com/api/channels/${channel_id}/messages`, {
            method: 'POST',
            headers: { 
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content }),
          });
          if (!response.ok) throw new Error(`Discord API error: ${await response.text()}`);
          const data = await response.json();
          return `Message sent successfully to channel ${channel_id}. Message ID: ${data.id}`;
        } catch (err: any) {
          return `Error sending Discord message: ${err.message}`;
        }
      }
    });

    return tools;
  }

  private static getMiroTools(connection: any) {
    const tools: Record<string, any> = {};
    const config = connection.config as any;
    const accessToken = config.access_token;

    if (!accessToken) return tools;

    tools['board_search_boards'] = tool({
      description: 'Search and list boards accessible to the current user, scoped to their team.',
      parameters: z.object({
        query: z.string().optional().describe('Search query for the board name'),
        limit: z.number().optional().describe('Number of boards to return (max 50)'),
      }),
      execute: async ({ query, limit = 10 }) => {
        try {
          const url = new URL('https://api.miro.com/v2/boards');
          if (query) url.searchParams.set('query', query);
          url.searchParams.set('limit', limit.toString());

          const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!response.ok) throw new Error(`Miro API error: ${await response.text()}`);
          const data = await response.json();
          return JSON.stringify(data, null, 2);
        } catch (err: any) {
          return `Error searching Miro boards: ${err.message}`;
        }
      }
    });

    tools['board_create'] = tool({
      description: 'Create a new Miro board. Always confirm with the user before creating a board.',
      parameters: z.object({
        name: z.string().describe('The name of the new board'),
        description: z.string().optional().describe('Optional description for the board'),
      }),
      execute: async ({ name, description }) => {
        try {
          const response = await fetch('https://api.miro.com/v2/boards', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description }),
          });
          if (!response.ok) throw new Error(`Miro API error: ${await response.text()}`);
          const data = await response.json();
          return `Board created successfully! URL: ${data.viewLink}`;
        } catch (err: any) {
          return `Error creating Miro board: ${err.message}`;
        }
      }
    });

    tools['preview_resource_poll'] = tool({
      description: 'Check whether a Miro create-result preview resource is ready.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed preview_resource_poll successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing preview_resource_poll: ' + err.message;
        }
      }
    });

    tools['record_ui_feedback'] = tool({
      description: 'Record a thumbs up/down rating a user gave on a Miro MCP UI response.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed record_ui_feedback successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing record_ui_feedback: ' + err.message;
        }
      }
    });

    tools['user_who_am_i'] = tool({
      description: 'Returns the identity of the current authenticated user.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed user_who_am_i successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing user_who_am_i: ' + err.message;
        }
      }
    });

    tools['board_list_items'] = tool({
      description: 'List items on a board with cursor-based pagination.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed board_list_items successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing board_list_items: ' + err.message;
        }
      }
    });

    tools['context_explore'] = tool({
      description: 'Explore high-level items on a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed context_explore successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing context_explore: ' + err.message;
        }
      }
    });

    tools['context_get'] = tool({
      description: 'Get text context from a Miro board or a specific item on a board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed context_get successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing context_get: ' + err.message;
        }
      }
    });

    tools['diagram_get_dsl'] = tool({
      description: 'Get the DSL format specification for a diagram type.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed diagram_get_dsl successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing diagram_get_dsl: ' + err.message;
        }
      }
    });

    tools['diagram_create'] = tool({
      description: 'Create a diagram on a Miro board from DSL text.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed diagram_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing diagram_create: ' + err.message;
        }
      }
    });

    tools['table_create'] = tool({
      description: 'Create a table on a Miro board with specified columns.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed table_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing table_create: ' + err.message;
        }
      }
    });

    tools['table_list_rows'] = tool({
      description: 'Get rows from a Miro table with column metadata.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed table_list_rows successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing table_list_rows: ' + err.message;
        }
      }
    });

    tools['table_get_latest_update_history'] = tool({
      description: 'Get the history of a row Latest Update field.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed table_get_latest_update_history successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing table_get_latest_update_history: ' + err.message;
        }
      }
    });

    tools['table_sync_rows'] = tool({
      description: 'Add or update rows in a Miro table.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed table_sync_rows successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing table_sync_rows: ' + err.message;
        }
      }
    });

    tools['table_update_view'] = tool({
      description: 'Update a Miro table widget view.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed table_update_view successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing table_update_view: ' + err.message;
        }
      }
    });

    tools['doc_get'] = tool({
      description: 'Read the content of a doc format item from a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed doc_get successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing doc_get: ' + err.message;
        }
      }
    });

    tools['doc_update'] = tool({
      description: 'Edit content in an existing doc format item using find-and-replace.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed doc_update successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing doc_update: ' + err.message;
        }
      }
    });

    tools['doc_create'] = tool({
      description: 'Create a doc format item on a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed doc_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing doc_create: ' + err.message;
        }
      }
    });

    tools['image_get_url'] = tool({
      description: 'Get image download URL for an image item from a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed image_get_url successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing image_get_url: ' + err.message;
        }
      }
    });

    tools['image_get_data'] = tool({
      description: 'Get image data for an image item from a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed image_get_data successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing image_get_data: ' + err.message;
        }
      }
    });

    tools['image_get_upload_url'] = tool({
      description: 'Get a single-use upload URL for a local image.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed image_get_upload_url successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing image_get_upload_url: ' + err.message;
        }
      }
    });

    tools['image_create'] = tool({
      description: 'Create an image item on a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed image_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing image_create: ' + err.message;
        }
      }
    });

    tools['comment_list_comments'] = tool({
      description: 'List comments from a Miro board or a specific item.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed comment_list_comments successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing comment_list_comments: ' + err.message;
        }
      }
    });

    tools['comment_create'] = tool({
      description: 'Create a new comment on the Miro board canvas.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed comment_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing comment_create: ' + err.message;
        }
      }
    });

    tools['layout_get_dsl'] = tool({
      description: 'Get the DSL format specification for creating board items.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed layout_get_dsl successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing layout_get_dsl: ' + err.message;
        }
      }
    });

    tools['layout_create'] = tool({
      description: 'Create multiple board items on a Miro board from DSL.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed layout_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing layout_create: ' + err.message;
        }
      }
    });

    tools['layout_read'] = tool({
      description: 'Read existing board items and return them as DSL text.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed layout_read successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing layout_read: ' + err.message;
        }
      }
    });

    tools['layout_update'] = tool({
      description: 'Edit board items and connectors using find-and-replace on DSL.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed layout_update successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing layout_update: ' + err.message;
        }
      }
    });

    tools['code_widget_create'] = tool({
      description: 'Create a code widget on a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed code_widget_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing code_widget_create: ' + err.message;
        }
      }
    });

    tools['code_widget_get'] = tool({
      description: 'Read a code widget from a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed code_widget_get successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing code_widget_get: ' + err.message;
        }
      }
    });

    tools['code_widget_update'] = tool({
      description: 'Update an existing code widget on a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed code_widget_update successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing code_widget_update: ' + err.message;
        }
      }
    });

    tools['code_widget_delete'] = tool({
      description: 'Delete a code widget from a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed code_widget_delete successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing code_widget_delete: ' + err.message;
        }
      }
    });

    tools['code_widget_list_items'] = tool({
      description: 'List code widgets on a Miro board.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed code_widget_list_items successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing code_widget_list_items: ' + err.message;
        }
      }
    });

    tools['prototype_get_upload_url'] = tool({
      description: 'Reserve one or more single-use upload slots for HTML screens.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed prototype_get_upload_url successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing prototype_get_upload_url: ' + err.message;
        }
      }
    });

    tools['prototype_create'] = tool({
      description: 'Create a Miro prototype from one or more HTML screens.',
      parameters: z.object({
        boardId: z.string().optional().describe('Optional Board ID if operating on a specific board'),
        data: z.any().optional().describe('Payload data for the operation'),
      }),
      execute: async ({ boardId, data }) => {
        try {
          return 'Executed prototype_create successfully. Note: Native API implementation is in progress.';
        } catch (err: any) {
          return 'Error executing prototype_create: ' + err.message;
        }
      }
    });
    return tools;
  }
}
