export const REDDIT_AUTHORIZE_URL = 'https://www.reddit.com/api/v1/authorize';
export const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
export const REDDIT_REVOKE_URL = 'https://www.reddit.com/api/v1/revoke_token';
export const REDDIT_API_BASE = 'https://oauth.reddit.com';

export const REDDIT_DEFAULT_SCOPES = ['identity', 'read'];

export const PAIRING_CODE_TTL_MINUTES = 15;
export const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const EXTENSION_STALE_MS = 3 * 60 * 1000;
export const EXTENSION_POLL_SECONDS = 60;
export const TASK_LEASE_MINUTES = 10;
export const TASK_MAX_ATTEMPTS = 2;

export const DISCOVERY_MAX_QUERIES = 8;
export const DISCOVERY_DEFAULT_QUERIES = 5;
export const DISCOVERY_POSTS_PER_QUERY = 15;
export const DISCOVERY_MAX_POST_AGE_DAYS = 90;

export const DRAFT_MAX_BODY_CHARS = 6000;
export const PUBLICATION_MATCH_WINDOW_HOURS = 72;

export const CHROME_EXTENSION_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || '';
export const FIREFOX_EXTENSION_URL = process.env.NEXT_PUBLIC_FIREFOX_EXTENSION_URL || '';

export const REDDIT_CONNECTION_STATUSES = ['connected', 'expired', 'revoked', 'error'] as const;
export const EXTENSION_STATUSES = ['connected', 'revoked'] as const;
export const OPPORTUNITY_STATUSES = ['new', 'analyzed', 'drafted', 'saved', 'dismissed', 'uncertain'] as const;
export const DRAFT_STATUSES = [
  'draft',
  'awaiting_approval',
  'approved',
  'queued',
  'submitting',
  'submitted',
  'verified',
  'failed',
  'outcome_unknown',
  'removed_or_unavailable',
  'rejected',
  'cancelled',
] as const;
export const TASK_TYPES = ['publish_comment', 'verify_publication', 'refresh_metrics'] as const;
export const TASK_STATUSES = ['queued', 'running', 'completed', 'failed', 'cancelled', 'expired'] as const;
export const PUBLICATION_STATUSES = [
  'pending',
  'submitted',
  'verified',
  'failed',
  'outcome_unknown',
  'removed_or_unavailable',
] as const;
export const DISCOVERY_RUN_STATUSES = ['queued', 'running', 'completed', 'partial', 'failed'] as const;
export const PROMOTION_CONFIDENCES = [
  'verified_allowed',
  'verified_restricted',
  'verified_prohibited',
  'unavailable',
  'uncertain',
] as const;
