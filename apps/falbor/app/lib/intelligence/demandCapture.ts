const genericRecommendationPatterns = [
  /^improve\b/i,
  /^enhance\b/i,
  /^strengthen\b/i,
  /^increase\b/i,
  /^expand\b/i,
  /^develop\b/i,
  /^implement\b/i,
  /^explore\b/i,
  /^gather\b/i,
  /^provide\b/i,
  /\bpolicies\b/i,
  /\bdocumentation\b/i,
  /\btestimonials\b/i,
  /\bsupport channels\b/i,
  /\bmonetization strategies\b/i,
  /\bpricing transparency\b/i,
];

export type DemandIntent = 'informational' | 'commercial' | 'transactional' | 'navigational' | 'unknown';

export function normalizeSearchQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const query = value.replace(/\s+/g, ' ').trim();
  if (!query || query.length > 180 || query.split(' ').length > 18 || /[.!?]$/.test(query)) return null;
  if (genericRecommendationPatterns.some((pattern) => pattern.test(query))) return null;
  if (!/[a-z0-9]/i.test(query) || query.split(' ').length < 2) return null;
  return query;
}

export function classifySearchIntent(query: string): DemandIntent {
  const value = query.toLowerCase();
  if (/\b(login|sign in|signin|official site|\.(com|io|xyz)\b)/i.test(value)) return 'navigational';
  if (/\b(buy|purchase|pricing|price|cost|subscribe|trial|discount|deal|free)\b/i.test(value)) return 'transactional';
  if (/\b(best|top|alternative|alternatives|vs\.?|versus|compare|comparison|review)\b/i.test(value)) return 'commercial';
  if (/\b(what|how|why|guide|tutorial|examples|learn|meaning|tips|template)\b/i.test(value)) return 'informational';
  return 'unknown';
}

export function productRelevance(query: string, productContext: string): number {
  const queryTerms = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2));
  const contextTerms = new Set(productContext.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2));
  if (!queryTerms.size || !contextTerms.size) return 0;
  const matches = [...queryTerms].filter((term) => contextTerms.has(term)).length;
  return Math.round((matches / queryTerms.size) * 100);
}

export function scoreExternalOpportunity(relevance: number, confidence: number, intent: DemandIntent, evidenceCount: number): number | null {
  if (relevance < 40 || confidence < 40 || evidenceCount < 1) return null;
  const intentWeight = intent === 'transactional' ? 100 : intent === 'commercial' ? 90 : intent === 'informational' ? 70 : intent === 'navigational' ? 40 : 50;
  return Math.round(relevance * 0.4 + confidence * 0.3 + Math.min(100, evidenceCount * 25) * 0.15 + intentWeight * 0.15);
}

export function scoreSearchConsoleOpportunity(impressions: number | null, ctr: number | null, position: number | null, relevance: number, intent: DemandIntent): number | null {
  if (impressions === null || ctr === null || position === null || relevance < 40) return null;
  const positionGap = position >= 4 && position <= 30 ? 100 - Math.abs(position - 10) * 3 : position < 4 ? 45 : 25;
  const ctrGap = Math.max(0, Math.min(100, (1 - ctr) * 100));
  const intentWeight = intent === 'transactional' ? 100 : intent === 'commercial' ? 90 : intent === 'informational' ? 70 : intent === 'navigational' ? 40 : 50;
  const impressionSignal = Math.min(100, Math.log10(Math.max(1, impressions)) * 25);
  return Math.round(impressionSignal * 0.25 + ctrGap * 0.2 + positionGap * 0.25 + relevance * 0.2 + intentWeight * 0.1);
}

export function isValidExternalOpportunity(query: unknown, evidence: unknown, confidence: unknown): query is string {
  return Boolean(normalizeSearchQuery(query) && Array.isArray(evidence) && evidence.length > 0 && typeof confidence === 'number' && confidence >= 40);
}
