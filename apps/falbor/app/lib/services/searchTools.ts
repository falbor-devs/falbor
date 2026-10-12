import { tool } from 'ai';
import { z } from 'zod';
import { isAllowedUrl } from '~/utils/url';

const MAX_CONTENT_LENGTH = 8000;

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (match) return match[1].trim();
  const altMatch = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return altMatch ? altMatch[1].trim() : '';
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export const webSearch = tool({
  description: 'Search the web using DuckDuckGo to get up-to-date information, news, competitors, and articles.',
  parameters: z.object({
    query: z.string().describe('The search query to execute.'),
  }),
  execute: async ({ query }) => {
    try {
      const response = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': FETCH_HEADERS['User-Agent'],
        },
        body: `q=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        return `Failed to fetch search results from DuckDuckGo: ${response.statusText}`;
      }

      const html = await response.text();
      const results: { url: string; title: string; snippet: string }[] = [];
      const linkRegex = /<a[^>]+href="([^"]+)"[^>]+class='result-link'[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const searchArea = html.slice(match.index, match.index + 2000);
        const snippetMatch = searchArea.match(/<td[^>]+class='result-snippet'[^>]*>([\s\S]*?)<\/td>/i);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        results.push({ url, title, snippet });
      }

      if (results.length === 0) {
        return 'No results found.';
      }

      return JSON.stringify(results.slice(0, 8), null, 2);
    } catch (error: any) {
      return `Search error: ${error.message || error}`;
    }
  },
});

export const readPageContent = tool({
  description: 'Fetch and read the raw text content of a specific public URL/webpage to extract details or perform research.',
  parameters: z.object({
    url: z.string().describe('The URL to read'),
  }),
  execute: async ({ url }) => {
    try {
      if (!isAllowedUrl(url)) {
        return 'Error: URL is not allowed. Only public HTTP/HTTPS URLs are accepted.';
      }

      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return `Error: Failed to fetch URL: ${response.status} ${response.statusText}`;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return 'Error: URL must point to an HTML or text page';
      }

      const html = await response.text();
      const title = extractTitle(html);
      const description = extractMetaDescription(html);
      const content = extractTextContent(html);

      const resultText = [
        `[Web content from ${url}]`,
        `Title: ${title}`,
        `Description: ${description}`,
        `Content:`,
        content.length > MAX_CONTENT_LENGTH ? content.slice(0, MAX_CONTENT_LENGTH) + '...' : content,
      ].join('\n');

      return resultText;
    } catch (error: any) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        return 'Error: Request timed out after 10 seconds';
      }
      return `Error: ${error.message || error}`;
    }
  },
});

async function ddgSearch(query: string): Promise<{ url: string; title: string; snippet: string }[]> {
  try {
    const response = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': FETCH_HEADERS['User-Agent'],
        Accept: 'text/html',
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results: { url: string; title: string; snippet: string }[] = [];
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]+class='result-link'[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const searchArea = html.slice(match.index, match.index + 2000);
      const snippetMatch = searchArea.match(/<td[^>]+class='result-snippet'[^>]*>([\s\S]*?)<\/td>/i);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      results.push({ url, title, snippet });
    }
    return results;
  } catch {
    return [];
  }
}

export const searchReddit = tool({
  description:
    'Search Reddit for recent posts and discussions about a topic, problem, or keyword. Returns real post titles, subreddits, snippets, and direct URLs. Use this to find real people who are experiencing the problem your product solves.',
  parameters: z.object({
    query: z.string().describe('The search query — use the problem or pain point, not the solution name.'),
    subreddit: z
      .string()
      .optional()
      .describe('Optional: restrict search to a specific subreddit (e.g. "SideProject", "startups", "webdev").'),
  }),
  execute: async ({ query, subreddit }) => {
    try {
      const siteQuery = subreddit
        ? `site:reddit.com/r/${subreddit} ${query}`
        : `site:reddit.com ${query}`;

      const ddgResults = await ddgSearch(siteQuery);
      const redditResults = ddgResults.filter(r => r.url.includes('reddit.com')).slice(0, 8);

      if (redditResults.length > 0) {
        const lines = redditResults.map(r => {
          const subMatch = r.url.match(/reddit\.com\/r\/([^/?#]+)/);
          const sub = subMatch ? `r/${subMatch[1]}` : 'Reddit';
          return `📌 ${sub} — "${r.title}"\n  ${r.snippet ? `Preview: ${r.snippet.slice(0, 220)}\n  ` : ''}URL: ${r.url}`;
        });

        return (
          `Reddit results for "${query}"${subreddit ? ` in r/${subreddit}` : ''}:\n\n` +
          lines.join('\n\n') +
          `\n\n🔗 Search Reddit directly: https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=new`
        );
      }

      const broadResults = await ddgSearch(`reddit "${query}"`);
      const broadReddit = broadResults.filter(r => r.url.includes('reddit.com')).slice(0, 5);

      if (broadReddit.length > 0) {
        const lines = broadReddit.map(r => {
          const subMatch = r.url.match(/reddit\.com\/r\/([^/?#]+)/);
          const sub = subMatch ? `r/${subMatch[1]}` : 'Reddit';
          return `📌 ${sub} — "${r.title}"\n  URL: ${r.url}`;
        });
        return (
          `Reddit results for "${query}" (broader search):\n\n` +
          lines.join('\n\n') +
          `\n\n🔗 Search Reddit directly: https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=new`
        );
      }

      return (
        `⚠️ No Reddit posts found for "${query}"${subreddit ? ` in r/${subreddit}` : ''}.\n\n` +
        `Search manually:\n` +
        `🔗 https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=new\n` +
        (subreddit ? `🔗 https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(query)}&sort=new` : '')
      );
    } catch (error: any) {
      return (
        `Reddit search error: ${error.message || error}\n` +
        `Try manually: https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=new`
      );
    }
  },
});

export const searchGitHubIssues = tool({
  description:
    'Search GitHub for open issues and discussions that mention a specific problem, keyword, or technology. Returns issue title, repository name, URL, and comment count. Use this to find developers actively experiencing the problem your product addresses.',
  parameters: z.object({
    query: z.string().describe('The search query — describe the problem, error message, or pain point.'),
    maxAgeDays: z
      .number()
      .optional()
      .default(90)
      .describe('Only return issues created within this many days. Default is 90 days.'),
  }),
  execute: async ({ query, maxAgeDays = 90 }) => {
    try {
      const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const searchQuery = `${query} is:issue is:open created:>${since}`;

      const response = await fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&sort=created&order=desc&per_page=8`,
        {
          headers: {
            'User-Agent': FETCH_HEADERS['User-Agent'],
            Accept: 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(12_000),
        },
      );

      if (response.ok) {
        const json = await response.json();
        const items: any[] = json.items || [];

        if (items.length > 0) {
          const lines = items.slice(0, 8).map((issue: any) => {
            const created = new Date(issue.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const repo =
              issue.repository_url?.replace('https://api.github.com/repos/', '') || 'unknown/repo';
            return `🐛 [${created}] ${repo} — "${issue.title}" | 💬 ${issue.comments} comments\n  URL: ${issue.html_url}`;
          });

          return (
            `GitHub issues for "${query}" (last ${maxAgeDays} days) — ${json.total_count} total:\n\n` +
            lines.join('\n\n') +
            `\n\n🔗 Search GitHub directly: https://github.com/search?q=${encodeURIComponent(query)}&type=issues&s=created&o=desc`
          );
        }
      }

      const ddgResults = await ddgSearch(`site:github.com/issues "${query}"`);
      const githubResults = ddgResults
        .filter(r => r.url.includes('github.com') && r.url.includes('/issues/'))
        .slice(0, 6);

      if (githubResults.length > 0) {
        const lines = githubResults.map(r => {
          const repoMatch = r.url.match(/github\.com\/([^/]+\/[^/]+)/);
          const repo = repoMatch ? repoMatch[1] : 'GitHub';
          return `🐛 ${repo} — "${r.title}"\n  ${r.snippet ? `Preview: ${r.snippet.slice(0, 200)}\n  ` : ''}URL: ${r.url}`;
        });
        return (
          `GitHub issues for "${query}" (via web search):\n\n` +
          lines.join('\n\n') +
          `\n\n🔗 Search GitHub directly: https://github.com/search?q=${encodeURIComponent(query)}&type=issues&s=created&o=desc`
        );
      }

      return (
        `⚠️ No GitHub issues found for "${query}" in the last ${maxAgeDays} days.\n\n` +
        `Search manually: https://github.com/search?q=${encodeURIComponent(query)}&type=issues&s=created&o=desc`
      );
    } catch (error: any) {
      return `GitHub search error: ${error.message || error}`;
    }
  },
});

export const searchTwitter = tool({
  description:
    'Search for recent tweets and Twitter/X discussions about a topic, problem, or keyword. Returns tweet previews and URLs. Use this to find people publicly talking about the problem your product solves.',
  parameters: z.object({
    query: z.string().describe('The search query — use the problem, hashtag, or pain point.'),
  }),
  execute: async ({ query }) => {
    try {
      const ddgResults = await ddgSearch(`site:x.com OR site:twitter.com ${query}`);
      const twitterResults = ddgResults
        .filter(r => r.url.includes('x.com') || r.url.includes('twitter.com'))
        .slice(0, 8);

      if (twitterResults.length > 0) {
        const lines = twitterResults.map(r => {
          const userMatch = r.url.match(/(?:x|twitter)\.com\/([^/?#]+)/);
          const user = userMatch ? `@${userMatch[1]}` : '';
          return (
            `🐦 ${user} — "${r.title}"\n` +
            `  ${r.snippet ? `Preview: ${r.snippet.slice(0, 220)}\n  ` : ''}URL: ${r.url}`
          );
        });

        return (
          `Twitter/X results for "${query}":\n\n` +
          lines.join('\n\n') +
          `\n\n🔗 Search Twitter/X directly: https://x.com/search?q=${encodeURIComponent(query)}&f=live`
        );
      }

      const broadResults = await ddgSearch(`"${query}" tweet OR twitter`);
      const broadTwitter = broadResults
        .filter(r => r.url.includes('x.com') || r.url.includes('twitter.com'))
        .slice(0, 5);

      if (broadTwitter.length > 0) {
        const lines = broadTwitter.map(r => `🐦 "${r.title}"\n  URL: ${r.url}`);
        return (
          `Twitter/X results for "${query}" (broader search):\n\n` +
          lines.join('\n\n') +
          `\n\n🔗 Search Twitter/X directly: https://x.com/search?q=${encodeURIComponent(query)}&f=live`
        );
      }

      return (
        `⚠️ No Twitter/X results found for "${query}".\n\n` +
        `Search manually: https://x.com/search?q=${encodeURIComponent(query)}&f=live\n` +
        `(Click the "Latest" tab to see the most recent tweets)`
      );
    } catch (error: any) {
      return (
        `Twitter search error: ${error.message || error}\n` +
        `Try manually: https://x.com/search?q=${encodeURIComponent(query)}&f=live`
      );
    }
  },
});
