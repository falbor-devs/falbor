export const AGENT_SESSION_STATUSES = ['running', 'paused', 'stopping', 'stopped', 'completed', 'error'] as const;
export type AgentSessionStatus = (typeof AGENT_SESSION_STATUSES)[number];

export const AGENT_ACTION_STATUSES = [
  'requested',
  'attempted',
  'completed',
  'failed',
  'unverified',
  'rejected',
] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

export const AGENT_DECISION_ACTIONS = [
  'inspect',
  'scroll_feed',
  'open_listing',
  'draft_created',
  'skip',
  'wait',
  'pause',
  'stop',
] as const;
export type AgentDecisionAction = (typeof AGENT_DECISION_ACTIONS)[number];

export const AUTONOMOUS_SUBMISSION_AUTHORIZED = false;

// The extension performs real browser interactions on the user's existing
// Reddit tab. These bounded counters keep the workflow honest and finite.
export const AGENT_MAX_FEED_SCROLLS = 3;
export const AGENT_MAX_LISTING_ROTATIONS_FACTOR = 2;
export const AGENT_MAX_OPEN_FAILURES = 2;

export interface AgentConfig {
  scopeSubreddits: string[];
  minRelevanceScore: number;
  maxDiscussions: number;
  maxRuntimeMinutes: number;
  maxAiCalls: number;
  maxEstimatedCostUsd: number;
  allowNavigation: boolean;
  allowDraftGeneration: boolean;
  maxConsecutiveErrors: number;
  maxConsecutiveIrrelevant: number;
}

export const AGENT_DEFAULT_CONFIG: AgentConfig = {
  scopeSubreddits: [],
  minRelevanceScore: 55,
  maxDiscussions: 12,
  maxRuntimeMinutes: 45,
  maxAiCalls: 20,
  maxEstimatedCostUsd: 0.5,
  allowNavigation: true,
  allowDraftGeneration: true,
  maxConsecutiveErrors: 3,
  maxConsecutiveIrrelevant: 6,
};

export interface AgentCounters {
  inspected: number;
  analyzed: number;
  relevantFound: number;
  draftsCreated: number;
  skipped: number;
  aiCalls: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  errors: number;
  consecutiveErrors: number;
  consecutiveIrrelevant: number;
  activeMs: number;
}

export const EMPTY_AGENT_COUNTERS: AgentCounters = {
  inspected: 0,
  analyzed: 0,
  relevantFound: 0,
  draftsCreated: 0,
  skipped: 0,
  aiCalls: 0,
  promptTokens: 0,
  completionTokens: 0,
  estimatedCostUsd: 0,
  errors: 0,
  consecutiveErrors: 0,
  consecutiveIrrelevant: 0,
  activeMs: 0,
};

export interface AgentDecision {
  action: AgentDecisionAction;
  reason: string;
  // Idempotency key the extension must use when reporting this browser action
  // back (requested → completed/failed). Absent for terminal decisions.
  actionId?: string;
  // The single discussion the extension should open next, when applicable.
  target?: FeedCandidate;
  // Listing the extension should navigate to (open_listing / return_to_feed).
  listingUrl?: string;
  draftId?: string;
}

export interface FeedCandidate {
  externalId: string;
  url: string;
  subreddit: string;
  title?: string;
}

const SESSION_TRANSITIONS: Record<AgentSessionStatus, AgentSessionStatus[]> = {
  running: ['paused', 'stopping', 'completed', 'error'],
  paused: ['running', 'stopping', 'stopped', 'completed'],
  stopping: ['stopped', 'error'],
  stopped: [],
  completed: [],
  error: ['stopping', 'stopped'],
};

export function canTransitionSession(from: AgentSessionStatus, to: AgentSessionStatus): boolean {
  return SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertSessionTransition(from: AgentSessionStatus, to: AgentSessionStatus): void {
  if (!canTransitionSession(from, to)) {
    throw new Error(`Invalid agent session transition: ${from} → ${to}`);
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeSubredditName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/^(?:https?:\/\/(?:www\.)?reddit\.com)?\/?r\//i, '').replace(/^\/?r\//i, '').replace(/\/+$/, '');
  if (!/^[a-z0-9_]{2,21}$/i.test(cleaned)) return null;
  return cleaned.toLowerCase();
}

export function normalizeAgentConfig(input: unknown): AgentConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const subreddits: string[] = [];
  if (Array.isArray(raw.scopeSubreddits)) {
    for (const item of raw.scopeSubreddits) {
      const normalized = normalizeSubredditName(item);
      if (normalized && !subreddits.includes(normalized)) subreddits.push(normalized);
      if (subreddits.length >= 20) break;
    }
  }
  return {
    scopeSubreddits: subreddits,
    minRelevanceScore: clampNumber(raw.minRelevanceScore, 0, 100, AGENT_DEFAULT_CONFIG.minRelevanceScore),
    maxDiscussions: Math.round(clampNumber(raw.maxDiscussions, 1, 100, AGENT_DEFAULT_CONFIG.maxDiscussions)),
    maxRuntimeMinutes: Math.round(clampNumber(raw.maxRuntimeMinutes, 5, 480, AGENT_DEFAULT_CONFIG.maxRuntimeMinutes)),
    maxAiCalls: Math.round(clampNumber(raw.maxAiCalls, 1, 200, AGENT_DEFAULT_CONFIG.maxAiCalls)),
    maxEstimatedCostUsd: Math.round(clampNumber(raw.maxEstimatedCostUsd, 0.05, 20, AGENT_DEFAULT_CONFIG.maxEstimatedCostUsd) * 100) / 100,
    allowNavigation: raw.allowNavigation !== false,
    allowDraftGeneration: raw.allowDraftGeneration !== false,
    maxConsecutiveErrors: Math.round(clampNumber(raw.maxConsecutiveErrors, 1, 10, AGENT_DEFAULT_CONFIG.maxConsecutiveErrors)),
    maxConsecutiveIrrelevant: Math.round(clampNumber(raw.maxConsecutiveIrrelevant, 1, 50, AGENT_DEFAULT_CONFIG.maxConsecutiveIrrelevant)),
  };
}

export function normalizeAgentCounters(input: unknown): AgentCounters {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const num = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  return {
    inspected: num(raw.inspected),
    analyzed: num(raw.analyzed),
    relevantFound: num(raw.relevantFound),
    draftsCreated: num(raw.draftsCreated),
    skipped: num(raw.skipped),
    aiCalls: num(raw.aiCalls),
    promptTokens: num(raw.promptTokens),
    completionTokens: num(raw.completionTokens),
    estimatedCostUsd: num(raw.estimatedCostUsd),
    errors: num(raw.errors),
    consecutiveErrors: num(raw.consecutiveErrors),
    consecutiveIrrelevant: num(raw.consecutiveIrrelevant),
    activeMs: num(raw.activeMs),
  };
}

export type RevisionCheck = 'apply' | 'stale';

export function checkRevision(current: number, incoming: number | null | undefined): RevisionCheck {
  if (incoming == null) return 'apply';
  if (!Number.isFinite(incoming)) return 'stale';
  return incoming === current ? 'apply' : 'stale';
}

const MODEL_PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1': { input: 2, output: 8 },
};

const UNKNOWN_MODEL_PRICE = { input: 2.5, output: 10 };

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const price = MODEL_PRICES_PER_MILLION[model] || UNKNOWN_MODEL_PRICE;
  const safePrompt = Number.isFinite(promptTokens) && promptTokens > 0 ? promptTokens : 0;
  const safeCompletion = Number.isFinite(completionTokens) && completionTokens > 0 ? completionTokens : 0;
  const cost = (safePrompt / 1_000_000) * price.input + (safeCompletion / 1_000_000) * price.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export interface AgentLimitCheckInput {
  config: AgentConfig;
  counters: AgentCounters;
  elapsedMs: number;
  relevanceScore?: number | null;
  verificationRequired?: boolean;
}

export function selectFeedTargets(params: {
  candidates: FeedCandidate[];
  inspectedExternalIds: string[];
  remaining: number;
  scopeSubreddits: string[];
}): FeedCandidate[] {
  const inspected = new Set(params.inspectedExternalIds.map((id) => id.toLowerCase()));
  const scope = new Set(params.scopeSubreddits.map((s) => s.toLowerCase()));
  const seen = new Set<string>();
  const targets: FeedCandidate[] = [];
  for (const candidate of params.candidates) {
    if (targets.length >= params.remaining) break;
    const externalId = typeof candidate.externalId === 'string' ? candidate.externalId.trim().toLowerCase() : '';
    const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
    const subreddit = normalizeSubredditName(candidate.subreddit);
    if (!externalId || !url || !subreddit) continue;
    if (inspected.has(externalId) || seen.has(externalId)) continue;
    if (scope.size > 0 && !scope.has(subreddit)) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (!/(^|\.)reddit\.com$/i.test(parsed.hostname)) continue;
    seen.add(externalId);
    targets.push({ externalId, url, subreddit, title: typeof candidate.title === 'string' ? candidate.title.slice(0, 300) : undefined });
  }
  return targets;
}

function pauseDecision(reason: string): AgentDecision {
  return { action: 'pause', reason };
}

export function decideAgentAction(input: AgentLimitCheckInput): AgentDecision {
  const { config, counters, elapsedMs } = input;

  if (input.verificationRequired) {
    return pauseDecision('Reddit requested human verification. Complete it in the browser, then resume the agent.');
  }
  if (counters.consecutiveErrors >= config.maxConsecutiveErrors) {
    return pauseDecision(`Paused after ${counters.consecutiveErrors} consecutive errors. Check the activity log, fix the cause, then resume.`);
  }
  if (elapsedMs >= config.maxRuntimeMinutes * 60_000) {
    return { action: 'stop', reason: `Stopped after the configured runtime limit of ${config.maxRuntimeMinutes} minutes.` };
  }
  if (counters.inspected >= config.maxDiscussions) {
    return { action: 'stop', reason: `Stopped after inspecting the configured maximum of ${config.maxDiscussions} discussions.` };
  }
  if (counters.aiCalls >= config.maxAiCalls) {
    return pauseDecision(`Paused: the AI call budget of ${config.maxAiCalls} calls for this session is exhausted.`);
  }
  if (counters.estimatedCostUsd >= config.maxEstimatedCostUsd) {
    return pauseDecision(`Paused: the estimated AI cost budget of $${config.maxEstimatedCostUsd.toFixed(2)} for this session is exhausted.`);
  }

  const score = typeof input.relevanceScore === 'number' ? input.relevanceScore : null;
  if (score == null) return { action: 'skip', reason: 'The discussion could not be scored.' };
  if (score < config.minRelevanceScore) {
    if (counters.consecutiveIrrelevant + 1 >= config.maxConsecutiveIrrelevant) {
      return {
        action: 'stop',
        reason: `Stopped after ${counters.consecutiveIrrelevant + 1} consecutive discussions below the relevance threshold of ${config.minRelevanceScore}.`,
      };
    }
    return { action: 'skip', reason: `Relevance score ${score} is below the threshold of ${config.minRelevanceScore}.` };
  }
  if (!config.allowDraftGeneration) {
    return { action: 'skip', reason: 'The discussion is relevant, but AI draft generation is disabled in the agent settings.' };
  }
  return { action: 'draft_created', reason: `Relevance score ${score} meets the threshold of ${config.minRelevanceScore}. A draft was created for review.` };
}

export function isActiveAgentStatus(status: AgentSessionStatus): boolean {
  return status === 'running' || status === 'paused' || status === 'stopping';
}
