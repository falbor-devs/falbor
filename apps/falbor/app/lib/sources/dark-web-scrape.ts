/*
 *!---------------------------------------------------------------------------------------------
 *  This feature is not implemented yet and its built for testing!
 *--------------------------------------------------------------------------------------------
 */
import { load } from 'cheerio';
import { torFetch } from './tor-fetch';
import type { ScrapeResult } from './types';

const MAX_RETURN_CHARS = 3_000;

function extractText(html: string): string {
  const $ = load(html);
  $('script, style, nav, footer, header, aside, noscript').remove();
  const lines = $.text()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.join('\n').slice(0, MAX_RETURN_CHARS);
}

async function scrapeOne(url: string, timeoutMs: number): Promise<ScrapeResult> {
  const result = await torFetch(url, { timeoutMs, maxBytes: 800_000 });

  if (result.error === 'Timeout') {
    return { url, content: '', status: 'timeout', error: 'Timed out' };
  }
  if (!result.ok) {
    return { url, content: '', status: 'error', error: result.error };
  }

  const content = extractText(result.text);
  return { url, content, status: 'success' };
}

export async function scrapeUrls(
  urls: string[],
  maxWorkers = 8,
  timeoutMs = 15_000
): Promise<ScrapeResult[]> {
  const onionUrls = urls.filter((u) => u.includes('.onion'));
  const results: ScrapeResult[] = [];
  for (let i = 0; i < onionUrls.length; i += maxWorkers) {
    const batch = onionUrls.slice(i, i + maxWorkers);
    const settled = await Promise.allSettled(
      batch.map((url) => scrapeOne(url, timeoutMs))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        results.push({ url: '', content: '', status: 'error', error: String(s.reason) });
      }
    }
  }

  return results;
}