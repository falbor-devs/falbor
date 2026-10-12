/**
 * Sources Search API Route — fully TypeScript, no Python required.
 * Streams the investigation pipeline as Server-Sent Events (SSE).
 */
import { NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { createScopedLogger } from '~/utils/logger';
import { searchDarkWeb } from '~/lib/sources/dark-web-search';
import { scrapeUrls } from '~/lib/sources/dark-web-scrape';
import { refineQuery, filterResults, streamSummary, generatePivots, autoDetectModel } from '~/lib/sources/llm-pipeline';
import type { SearchRequest } from '~/lib/sources/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const logger = createScopedLogger('api.sources-search');

function sse(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const userId = await getUserId(request as unknown as NextRequest);
  if (!userId) {
    return new Response(JSON.stringify({ error: true, message: 'Unauthorized' }), { status: 401 });
  }

  let body: SearchRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: true, message: 'Invalid JSON' }), { status: 400 });
  }

  const query = (body.query ?? '').trim();
  if (!query) {
    return new Response(JSON.stringify({ error: true, message: 'Query is required' }), { status: 400 });
  }

  const model = body.model || autoDetectModel();
  const engines = body.engines ?? [];
  const threads = Math.min(Math.max(body.scrapingThreads ?? 8, 1), 32);
  const searchMode = body.searchMode || 'osint';

  logger.info(`Sources search: user=${userId} query="${query}" model=${model} mode=${searchMode}`);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (event: string, data: object) =>
        controller.enqueue(enc.encode(sse(event, data)));

      try {
        // ── Step 1: Refine query ────────────────────────────────────────────
        push('status', { phase: 'refining', message: 'Refining search query with AI...' });
        let refined = query;
        try {
          refined = await refineQuery(model, query);
        } catch (e: any) {
          logger.warn('Query refinement failed:', e?.message);
        }
        push('refined_query', { original: query, refined });

        // ── Step 2: Search dark web engines ────────────────────────────────
        push('status', { phase: 'searching', message: `Searching dark web for: "${refined}"...` });
        const rawResults = await searchDarkWeb(refined, engines.length ? engines : [], 80);
        push('search_results', { count: rawResults.length, results: rawResults });

        if (!rawResults.length) {
          push('status', { phase: 'complete', message: 'No results found.' });
          push('summary', {
            text: 'No results were returned from the dark web search engines. Tor may be offline or the engines returned no matches for this query.',
            pivots: [],
            sourceLinks: [],
          });
          controller.close();
          return;
        }

        // ── Step 3: AI filter ──────────────────────────────────────────────
        push('status', { phase: 'filtering', message: `AI filtering ${rawResults.length} results...` });
        let filtered = rawResults.slice(0, 20);
        try {
          filtered = await filterResults(model, refined, rawResults);
        } catch (e: any) {
          logger.warn('Filter failed, using top-20:', e?.message);
        }
        push('filtered_results', { count: filtered.length, results: filtered });

        // ── Step 4: Scrape ─────────────────────────────────────────────────
        push('status', { phase: 'scraping', message: `Scraping ${filtered.length} sites via Tor...` });
        const urls = filtered.map((r) => r.link);
        const scraped = await scrapeUrls(urls, threads, 15_000);
        const successCount = scraped.filter((r) => r.status === 'success').length;
        push('scraped_results', {
          total: filtered.length,
          scraped: successCount,
          results: scraped.map((r) => ({ url: r.url, status: r.status })),
        });

        // ── Step 5: Stream summary ─────────────────────────────────────────
        push('status', { phase: 'summarizing', message: 'Generating investigation summary...' });
        let fullSummary = '';
        try {
          for await (const chunk of streamSummary(model, query, filtered, scraped, searchMode)) {
            fullSummary += chunk;
            push('summary_chunk', { text: chunk });
          }
        } catch (e: any) {
          fullSummary = `Summary generation failed: ${e?.message}`;
        }

        // ── Step 6: Pivot queries ──────────────────────────────────────────
        push('status', { phase: 'pivots', message: 'Generating follow-up queries...' });
        let pivots: string[] = [];
        try {
          pivots = await generatePivots(model, query, fullSummary);
        } catch {}

        const sourceLinks = filtered
          .filter((r, i) => scraped[i]?.status === 'success' || r.snippet)
          .map((r) => r.link);

        push('summary', { text: fullSummary, pivots, sourceLinks });
        push('status', { phase: 'complete', message: 'Pipeline completed successfully!' });

      } catch (err: any) {
        logger.error('Investigation pipeline error:', err);
        push('error', { message: err?.message ?? 'Unknown pipeline error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function GET() {
  const { isTorAvailable } = await import('~/lib/sources/tor-fetch');
  const { getAvailableModels, autoDetectModel } = await import('~/lib/sources/llm-pipeline');
  const { getProviderStatuses } = await import('~/lib/sources/health');

  const torOk = await isTorAvailable();
  return Response.json({
    status: 'ok',
    tor_available: torOk,
    available_models: getAvailableModels(),
    auto_model: autoDetectModel(),
    providers: getProviderStatuses(),
  });
}
