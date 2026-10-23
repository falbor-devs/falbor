import { DISCOVERY_MAX_QUERIES } from './constants';
import type { DiscoveryQuery, ProductContext } from './types';

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildDiscoveryQueries(
  context: ProductContext,
  extraKeywords: string[] = [],
  limit = DISCOVERY_MAX_QUERIES,
): DiscoveryQuery[] {
  const seen = new Set<string>();
  const buckets = new Map<DiscoveryQuery['category'], string[]>();

  const add = (category: DiscoveryQuery['category'], query: string) => {
    const q = clean(query);
    if (!q || q.length < 8 || q.length > 220) return;
    const key = q.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const bucket = buckets.get(category) ?? [];
    bucket.push(q);
    buckets.set(category, bucket);
  };

  const problem = clean(context.problem || '');
  if (problem) {
    add('problem', problem);
    add('problem', `how do you solve ${problem}`);
  }

  for (const useCase of context.useCases.slice(0, 3)) {
    add('use_case', useCase);
    add('use_case', `best way to ${useCase}`);
  }

  const audience = clean(context.targetAudience || '');
  if (audience && problem) {
    add('audience', `${audience} looking for ${problem} solution`);
  }

  add('recommendation', `recommendations for ${context.productName} alternative`);
  add('recommendation', `tool for ${problem || context.category || context.productName}`);

  for (const competitor of context.competitors.slice(0, 2)) {
    add('competitor', `alternative to ${competitor}`);
  }

  for (const keyword of [...context.keywords, ...extraKeywords].slice(0, 8)) {
    add('keyword', keyword);
  }

  const cap = Math.max(1, Math.min(limit, DISCOVERY_MAX_QUERIES));
  const order: DiscoveryQuery['category'][] = [
    'problem',
    'audience',
    'recommendation',
    'competitor',
    'keyword',
    'use_case',
  ];

  const list: DiscoveryQuery[] = [];
  let round = 0;
  while (list.length < cap) {
    let added = false;
    for (const category of order) {
      if (list.length >= cap) break;
      const bucket = buckets.get(category);
      if (bucket && round < bucket.length) {
        list.push({ query: bucket[round], category });
        added = true;
      }
    }
    if (!added) break;
    round += 1;
  }

  return list;
}

export function parseRedditFullname(fullname: string | null | undefined): { kind: string; id: string } | null {
  if (!fullname) return null;
  const match = /^(t\d)_([a-z0-9]+)$/i.exec(fullname.trim());
  if (!match) return null;
  return { kind: match[1].toLowerCase(), id: match[2].toLowerCase() };
}

export function redditFullname(kind: 'comment' | 'post', id: string): string {
  const prefix = kind === 'comment' ? 't1_' : 't3_';
  const raw = id.startsWith(prefix) ? id : `${prefix}${id}`;
  return raw.toLowerCase();
}

export function publicationIdempotencyKey(draftId: string, contentHash: string): string {
  return `publish:${draftId}:${contentHash.slice(0, 16)}`;
}

export function verificationIdempotencyKey(publicationId: string): string {
  return `verify:${publicationId}`;
}

export function formatSubreddit(input: string): string {
  return clean(input).replace(/^\/?r\//i, '').replace(/\/+$/, '');
}
