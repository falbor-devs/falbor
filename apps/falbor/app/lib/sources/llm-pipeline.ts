/**
 * LLM pipeline for dark web OSINT.
 * Uses the Vercel AI SDK (already installed in this project).
 * Handles: query refinement, result filtering, streaming summarization, pivot generation.
 */
import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { SearchResult, ScrapeResult } from './types';
export function resolveModel(modelId: string) {
  const m = modelId.toLowerCase();

  if (m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(modelId);
  }
  if (m.startsWith('claude-')) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic(modelId);
  }
  if (m.startsWith('gemini-')) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
    return google(modelId);
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(modelId);
}

export function autoDetectModel(): string {
  if (process.env.ANTHROPIC_API_KEY) return 'claude-haiku-4-5';
  if (process.env.OPENAI_API_KEY) return 'gpt-4o-mini';
  if (process.env.GOOGLE_API_KEY) return 'gemini-2.0-flash';
  return 'gpt-4o-mini';
}

export function getAvailableModels(): string[] {
  const models: string[] = [];
  if (process.env.OPENAI_API_KEY) {
    models.push('gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    models.push('claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-sonnet-4-0');
  }
  if (process.env.GOOGLE_API_KEY) {
    models.push('gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro');
  }
  if (process.env.OPENROUTER_API_KEY) {
    models.push('qwen/qwen3-next-80b-a3b-instruct:free');
  }
  return models;
}

export async function refineQuery(modelId: string, userQuery: string): Promise<string> {
  const model = resolveModel(modelId);
  const { text } = await generateText({
    model,
    system: `You are a Cybercrime Threat Intelligence Expert. Refine the provided query for dark web search engines.
Rules:
1. Improve the query for better dark web search results
2. Do NOT use logical operators (AND, OR)
3. Keep the final query to 5 words or less
4. Output ONLY the refined query, nothing else`,
    prompt: userQuery,
    maxTokens: 50,
  });
  return text.trim() || userQuery;
}

export async function filterResults(
  modelId: string,
  query: string,
  results: SearchResult[]
): Promise<SearchResult[]> {
  if (!results.length) return [];

  const model = resolveModel(modelId);
  const lines = results.map((r, i) => {
    const short = r.link.replace(/(?<=\.onion).*/, '');
    const title = r.title.replace(/[^0-9a-zA-Z\-\. ]/g, ' ').slice(0, 60);
    return `${i + 1}. [${short}] ${title}`;
  });

  const { text } = await generateText({
    model,
    system: `You are a Cybercrime Threat Intelligence Expert. Given a dark web search query and results (index, link, title), select the top 20 most relevant.
Output ONLY a comma-separated list of indices. Example: 1, 3, 7, 12

Search Query: ${query}`,
    prompt: lines.join('\n'),
    maxTokens: 100,
  });

  const indices: number[] = [];
  const seen = new Set<number>();
  for (const m of text.matchAll(/\d+/g)) {
    const idx = parseInt(m[0]);
    if (idx >= 1 && idx <= results.length && !seen.has(idx)) {
      seen.add(idx);
      indices.push(idx);
    }
  }

  if (!indices.length) return results.slice(0, 20);
  return indices.slice(0, 20).map((i) => results[i - 1]);
}

export async function* streamSummary(
  modelId: string,
  query: string,
  filteredResults: SearchResult[],
  scrapedResults: ScrapeResult[],
  searchMode: 'osint' | 'websites' = 'osint'
): AsyncGenerator<string> {
  const model = resolveModel(modelId);

  const scrapeMap = new Map(scrapedResults.map((r) => [r.url, r]));
  const contentParts: string[] = [];

  for (const result of filteredResults) {
    const scraped = scrapeMap.get(result.link);
    if (scraped?.status === 'success' && scraped.content) {
      contentParts.push(`=== ${result.link} ===\n${scraped.content.slice(0, 1500)}`);
    } else if (result.snippet) {
      contentParts.push(`=== ${result.link} (snippet) ===\n${result.snippet}`);
    }
  }

  const content = contentParts.slice(0, 10).join('\n\n');

  if (!content) {
    yield 'No content could be scraped from the filtered results. Sites may be offline or require authentication.';
    return;
  }

  const osintSystemPrompt = `You are a Cybercrime Threat Intelligence Expert conducting a dark web OSINT investigation.

Provide a structured investigation summary with:
1. **Executive Summary** — Key findings (3-5 sentences)
2. **Key Entities** — Notable actors, sites, products, or services
3. **Threat Indicators** — IOCs, patterns, or risk signals  
4. **Source Assessment** — Quality and relevance of gathered sources
5. **Caveats** — Limitations of this investigation

Be factual. Do NOT fabricate information not present in the sources.

Original Query: ${query}`;

  const marketplaceSystemPrompt = `You are an expert Dark Web Shopping Assistant. The user is looking to buy or find specific products or services on the dark web.

Based on the provided scraped content from various onion links, curate a neat list of marketplaces, vendors, or sites that match the user's query.
Format the output as a clean, easy-to-read shopping guide. For each relevant site or product found:
- **Site Name / Vendor** (if available)
- **What they sell** (brief description)
- **Relevance** (why it matches the user's query)
- **Onion URL** (include the link so the user can visit it)

If you find specific products and prices, list them!
Be helpful and concise. Do NOT fabricate information. If none of the sites sell what the user is looking for, clearly state that.

Original Query: ${query}`;

  const { textStream } = streamText({
    model,
    system: searchMode === 'websites' ? marketplaceSystemPrompt : osintSystemPrompt,
    prompt: content,
    maxTokens: 2000,
  });

  for await (const chunk of textStream) {
    yield chunk;
  }
}

export async function generatePivots(
  modelId: string,
  query: string,
  summary: string
): Promise<string[]> {
  const model = resolveModel(modelId);
  const { text } = await generateText({
    model,
    system: `You are a Cybercrime Threat Intelligence Expert. Based on an OSINT investigation summary, suggest 3-5 follow-up dark web search queries.
Rules:
1. Each query explores a different angle
2. Max 5 words per query
3. Output ONLY a JSON array. Example: ["query one", "query two"]

Original Query: ${query}`,
    prompt: `Summary:\n${summary.slice(0, 1000)}`,
    maxTokens: 150,
  });

  try {
    const match = text.match(/\[.*?\]/s);
    if (match) return JSON.parse(match[0]);
  } catch { }
  return [];
}
