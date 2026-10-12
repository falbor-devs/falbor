/*
 *!---------------------------------------------------------------------------------------------
 *  This feature is not implemented yet and its built for testing!
 *--------------------------------------------------------------------------------------------
 */
import { load } from 'cheerio';
import { torFetch } from './tor-fetch';
import type { SearchResult } from './types';
import { ALL_ENGINES } from './types';

function parseResults(html: string, engineName: string): SearchResult[] {
  const $ = load(html);
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  if (engineName === 'Ahmia') {
    $('li.result').each((_, el) => {
      const a = $(el).find('a').first();
      const link = a.attr('href')?.trim() ?? '';
      const title = a.text().trim() || 'Untitled';
      const snippet = $(el).find('p').text().trim();
      if (link && link.includes('.onion') && !seen.has(link)) {
        seen.add(link);
        results.push({ title, link, snippet, engine: engineName });
      }
    });
  } else {
    $('a[href]').each((_, el) => {
      const link = $(el).attr('href')?.trim() ?? '';
      if (!link.includes('.onion')) return;
      const title = $(el).text().trim() || 'Untitled';
      const snippet = $(el).parent().text().trim().slice(0, 200);
      if (!seen.has(link)) {
        seen.add(link);
        results.push({ title, link, snippet, engine: engineName });
      }
    });
  }

  return results;
}

async function searchSingleEngine(
  engine: { name: string; url: string },
  query: string
): Promise<SearchResult[]> {
  const url = engine.url.replace('{query}', encodeURIComponent(query));
  const result = await torFetch(url, { timeoutMs: 25_000 });
  if (!result.ok || !result.text) return [];
  return parseResults(result.text, engine.name);
}

export async function searchDarkWeb(
  query: string,
  engineNames: string[] = [],
  maxResults = 80
): Promise<SearchResult[]> {
  const engines = engineNames.length
    ? ALL_ENGINES.filter((e) => engineNames.includes(e.name))
    : [...ALL_ENGINES];

  const settled = await Promise.allSettled(
    engines.map((e) => searchSingleEngine(e, query))
  );

  const seen = new Set<string>();
  const combined: SearchResult[] = [];

  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const item of r.value) {
      if (!seen.has(item.link)) {
        seen.add(item.link);
        combined.push(item);
      }
    }
  }

  return combined.slice(0, maxResults);
}
