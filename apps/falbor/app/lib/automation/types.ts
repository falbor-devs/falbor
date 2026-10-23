import type {
  DISCOVERY_RUN_STATUSES,
  DRAFT_STATUSES,
  EXTENSION_STATUSES,
  OPPORTUNITY_STATUSES,
  PROMOTION_CONFIDENCES,
  PUBLICATION_STATUSES,
  REDDIT_CONNECTION_STATUSES,
  TASK_STATUSES,
  TASK_TYPES,
} from './constants';
import type { AgentConfig, AgentSessionStatus } from './agentCore';

export type RedditConnectionStatus = (typeof REDDIT_CONNECTION_STATUSES)[number] | 'not_connected';
export type ExtensionStatus = (typeof EXTENSION_STATUSES)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type DraftStatus = (typeof DRAFT_STATUSES)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type DiscoveryRunStatus = (typeof DISCOVERY_RUN_STATUSES)[number];
export type PromotionConfidence = (typeof PROMOTION_CONFIDENCES)[number];

export type ExtensionConnectionState =
  | 'not_connected'
  | 'connected'
  | 'stale'
  | 'revoked';

export interface ProductContext {
  workspaceId: string;
  workspaceName: string;
  productName: string;
  websiteUrl: string | null;
  description: string | null;
  category: string | null;
  problem: string | null;
  positioning: string | null;
  pricing: string | null;
  targetAudience: string | null;
  useCases: string[];
  features: string[];
  competitors: string[];
  keywords: string[];
  missing: string[];
}

export interface DiscoveryQuery {
  query: string;
  category: 'problem' | 'use_case' | 'audience' | 'recommendation' | 'competitor' | 'keyword';
}

export interface OpportunityFactorScores {
  problemRelevance: number;
  audienceRelevance: number;
  productFit: number;
  intentSignal: number;
  recency: number;
  communityFit: number;
  participationValue: number;
}

export interface OpportunityAnalysis {
  summary: string;
  whyRelevant: string;
  userProblem: string;
  contributionAngle: string;
  promotionAllowed: 'yes' | 'no' | 'unclear';
  promotionReason: string;
  recommendedAction: 'comment' | 'post' | 'monitor' | 'skip';
  uncertainty: boolean;
  warnings: string[];
}

export interface CommunityRuleCheck {
  status: 'verified' | 'unavailable' | 'error';
  subreddit: string;
  allowsPromotion: 'yes' | 'no' | 'unclear';
  rules: Array<{ shortName: string; description: string }>;
  notes: string;
  checkedAt: string;
  error?: string;
}

export interface ExtensionTaskPayload {
  draftId: string;
  opportunityId: string | null;
  subreddit: string;
  threadUrl: string;
  threadExternalId: string;
  title: string;
  body: string;
  contentHash: string;
}

export interface ExtensionTaskResult {
  status: 'submitted_observed' | 'failed' | 'outcome_unknown' | 'cancelled_by_user';
  observedText?: string;
  url?: string;
  externalId?: string;
  error?: string;
}

export interface AutomationAgentStatusSummary {
  status: AgentSessionStatus;
  sessionId: string;
  currentStep: string | null;
  currentActivity: string | null;
  startedAt: string;
  stopRequested: boolean;
  counters: {
    inspected: number;
    analyzed: number;
    draftsCreated: number;
    skipped: number;
    aiCalls: number;
    estimatedCostUsd: number;
  };
  lastError: string | null;
}

export interface AutomationStatusSummary {
  reddit: {
    status: RedditConnectionStatus;
    username: string | null;
    scope: string[];
    canRead: boolean;
    connectedAt: string | null;
    lastCheckedAt: string | null;
    lastError: string | null;
  };
  extension: {
    state: ExtensionConnectionState;
    installationId: string | null;
    browser: string | null;
    version: string | null;
    label: string | null;
    lastSeenAt: string | null;
  };
  tasks: {
    queued: number;
    running: number;
    failed: number;
  };
  counts: {
    opportunities: number;
    awaitingReview: number;
    draftsAwaitingApproval: number;
    approved: number;
    published: number;
    failedPublications: number;
  };
  lastDiscovery: {
    status: DiscoveryRunStatus;
    completedAt: string | null;
    found: number;
    error: string | null;
  } | null;
  settings: {
    enabled: boolean;
    autoDiscovery: boolean;
    queriesPerRun: number;
    maxDraftsPerDay: number;
    maxPublicationsPerDay: number;
  };
  agentConfig: AgentConfig;
  agent: AutomationAgentStatusSummary | null;
}
