import { tool } from 'ai';
import { z } from 'zod';

export const getFirecrawlTool = (apiKey: string) => tool({
  description: 'Search the web using Firecrawl for deep internet research. Use this to find competitors, target audience, and market trends.',
  parameters: z.object({
    query: z.string().describe('The search query to send to Firecrawl.'),
  }),
  execute: async ({ query }) => {
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query
        })
      });
      
      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (e: any) {
      return `Failed to search with Firecrawl: ${e.message}`;
    }
  }
});

export const getApolloTool = (apiKey: string) => tool({
  description: 'Search Apollo.io to find specific companies, market data, and potential leads or competitors in the B2B space.',
  parameters: z.object({
    keywords: z.string().describe('Keywords or company names to search for on Apollo.io.'),
  }),
  execute: async ({ keywords }) => {
    try {
      // Basic Apollo.io mixed people/organization search endpoint
      const response = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          api_key: apiKey,
          q_organization_name: keywords,
          per_page: 5
        })
      });
      
      if (!response.ok) {
        throw new Error(`Apollo API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (e: any) {
      return `Failed to search with Apollo.io: ${e.message}`;
    }
  }
});
