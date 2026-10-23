import {
  REDDIT_API_BASE,
  REDDIT_AUTHORIZE_URL,
  REDDIT_DEFAULT_SCOPES,
  REDDIT_REVOKE_URL,
  REDDIT_TOKEN_URL,
} from './constants';

export type RedditResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; rateLimited?: boolean };

export interface RedditTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface RedditPost {
  id: string;
  fullname: string;
  subreddit: string;
  title: string;
  body: string | null;
  permalink: string;
  author: string | null;
  score: number | null;
  numComments: number | null;
  createdUtc: number | null;
  locked: boolean;
  archived: boolean;
  over18: boolean;
  isSelf: boolean;
}

export interface RedditComment {
  id: string;
  fullname: string;
  body: string;
  author: string | null;
  score: number | null;
  createdUtc: number | null;
  permalink: string | null;
  subreddit: string | null;
  linkId: string | null;
  linkTitle: string | null;
}

const TIMEOUT_MS = 15_000;
const MAX_RETRY_AFTER_MS = 5_000;

function credentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret || clientId === 'FALBOR_REDDIT_ID') return null;
  return { clientId, clientSecret };
}

export function isRedditConfigured(): boolean {
  return credentials() !== null;
}

export function getRedditRedirectUri(origin: string): string {
  return process.env.REDDIT_REDIRECT_URI || `${origin.replace(/\/+$/, '')}/api/auth/reddit/callback`;
}

export function getRedditScopes(): string[] {
  const override = process.env.REDDIT_SCOPES;
  if (override) return override.split(/[\s,]+/).filter(Boolean);
  return REDDIT_DEFAULT_SCOPES;
}

export function buildRedditAuthorizeUrl(params: {
  state: string;
  redirectUri: string;
  scopes?: string[];
  duration?: 'permanent' | 'temporary';
}): string | null {
  const creds = credentials();
  if (!creds) return null;
  const url = new URL(REDDIT_AUTHORIZE_URL);
  url.searchParams.set('client_id', creds.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', params.state);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('duration', params.duration || 'permanent');
  url.searchParams.set('scope', (params.scopes || getRedditScopes()).join(' '));
  return url.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tokenRequest(body: URLSearchParams): Promise<RedditResult<RedditTokenResponse>> {
  const creds = credentials();
  if (!creds) {
    return { ok: false, status: 503, error: 'Reddit credentials are not configured on the server.' };
  }
  try {
    const res = await fetchWithTimeout(REDDIT_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'web:falbor-automation:1.0.0 (by /u/falbor)',
      },
      body: body.toString(),
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    if (!res.ok || !data?.access_token) {
      const message = data?.message || data?.error || text.slice(0, 200) || `Reddit token request failed (${res.status})`;
      return { ok: false, status: res.status, error: message };
    }
    return { ok: true, data: data as RedditTokenResponse };
  } catch (error: any) {
    return { ok: false, status: 0, error: error?.name === 'AbortError' ? 'Reddit did not respond in time.' : 'Network error contacting Reddit.' };
  }
}

export async function exchangeRedditCode(code: string, redirectUri: string): Promise<RedditResult<RedditTokenResponse>> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  return tokenRequest(body);
}

export async function refreshRedditToken(refreshToken: string): Promise<RedditResult<RedditTokenResponse>> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return tokenRequest(body);
}

export async function revokeRedditToken(token: string): Promise<RedditResult<boolean>> {
  const creds = credentials();
  if (!creds) return { ok: false, status: 503, error: 'Reddit credentials are not configured on the server.' };
  try {
    const res = await fetchWithTimeout(REDDIT_REVOKE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'web:falbor-automation:1.0.0 (by /u/falbor)',
      },
      body: new URLSearchParams({ token, token_type_hint: 'access_token' }).toString(),
    });
    if (res.status === 204 || res.ok) return { ok: true, data: true };
    return { ok: false, status: res.status, error: `Reddit revoke failed (${res.status})` };
  } catch {
    return { ok: false, status: 0, error: 'Network error contacting Reddit.' };
  }
}

async function redditFetch<T>(
  token: string,
  path: string,
  options: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | number | undefined>;
    body?: Record<string, string | undefined>;
    username?: string | null;
  } = {},
): Promise<RedditResult<T>> {
  const url = new URL(`${REDDIT_API_BASE}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'User-Agent': process.env.REDDIT_USER_AGENT || `web:falbor-automation:1.0.0 (by /u/${options.username || 'falbor'})`,
  };
  let body: string | undefined;
  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.body || {})) {
      if (value !== undefined) params.set(key, value);
    }
    body = params.toString();
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url.toString(), { method, headers, body });
      if (res.status === 429 && attempt === 0) {
        const retryAfter = Number(res.headers.get('retry-after')) || 1;
        await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS)));
        continue;
      }
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (res.status === 429) {
        return { ok: false, status: 429, error: 'Reddit rate limit reached. Try again later.', rateLimited: true };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, error: 'Reddit authorization is invalid or expired.' };
      }
      if (!res.ok) {
        const message = data?.message || data?.reason || text.slice(0, 200) || `Reddit request failed (${res.status})`;
        return { ok: false, status: res.status, error: String(message) };
      }
      return { ok: true, data: (data ?? ({} as T)) as T };
    } catch (error: any) {
      if (attempt === 0 && error?.name === 'AbortError') continue;
      return {
        ok: false,
        status: 0,
        error: error?.name === 'AbortError' ? 'Reddit did not respond in time.' : 'Network error contacting Reddit.',
      };
    }
  }
  return { ok: false, status: 0, error: 'Reddit request failed.' };
}

export function normalizeRedditPost(raw: any): RedditPost | null {
  const d = raw?.data ?? raw;
  if (!d?.id || !d?.subreddit || typeof d?.title !== 'string') return null;
  const permalink = typeof d.permalink === 'string' ? `https://www.reddit.com${d.permalink}` : null;
  if (!permalink) return null;
  return {
    id: String(d.id),
    fullname: typeof d.name === 'string' ? d.name : `t3_${d.id}`,
    subreddit: String(d.subreddit),
    title: d.title,
    body: typeof d.selftext === 'string' && d.selftext.trim() ? d.selftext : null,
    permalink,
    author: typeof d.author === 'string' ? d.author : null,
    score: typeof d.score === 'number' ? d.score : null,
    numComments: typeof d.num_comments === 'number' ? d.num_comments : null,
    createdUtc: typeof d.created_utc === 'number' ? d.created_utc : null,
    locked: Boolean(d.locked),
    archived: Boolean(d.archived),
    over18: Boolean(d.over_18),
    isSelf: Boolean(d.is_self),
  };
}

export function normalizeRedditComment(raw: any): RedditComment | null {
  const d = raw?.data ?? raw;
  if (!d?.id || typeof d?.body !== 'string' || !d.body.trim()) return null;
  return {
    id: String(d.id),
    fullname: typeof d.name === 'string' ? d.name : `t1_${d.id}`,
    body: d.body,
    author: typeof d.author === 'string' ? d.author : null,
    score: typeof d.score === 'number' ? d.score : null,
    createdUtc: typeof d.created_utc === 'number' ? d.created_utc : null,
    permalink: typeof d.permalink === 'string' ? `https://www.reddit.com${d.permalink}` : null,
    subreddit: typeof d.subreddit === 'string' ? d.subreddit : null,
    linkId: typeof d.link_id === 'string' ? d.link_id : null,
    linkTitle: typeof d.link_title === 'string' ? d.link_title : null,
  };
}

export async function getRedditIdentity(token: string): Promise<RedditResult<{ id: string; name: string }>> {
  const res = await redditFetch<{ id?: string; name?: string }>(token, '/api/v1/me', { query: { raw_json: 1 } });
  if (!res.ok) return res;
  if (!res.data?.name) return { ok: false, status: 200, error: 'Reddit identity response did not include a username.' };
  return { ok: true, data: { id: String(res.data.id || ''), name: String(res.data.name) } };
}

export async function searchRedditPosts(
  token: string,
  params: {
    query: string;
    subreddit?: string;
    sort?: 'relevance' | 'new' | 'top' | 'comments';
    time?: 'day' | 'week' | 'month' | 'year' | 'all';
    limit?: number;
    username?: string | null;
  },
): Promise<RedditResult<RedditPost[]>> {
  const path = params.subreddit ? `/r/${params.subreddit}/search` : '/search';
  const query: Record<string, string | number | undefined> = {
    q: params.query,
    sort: params.sort || 'relevance',
    t: params.time || 'month',
    limit: Math.min(params.limit || 15, 50),
    type: 'link',
    raw_json: 1,
  };
  if (params.subreddit) query.restrict_sr = 1;
  const res = await redditFetch<any>(token, path, { query, username: params.username });
  if (!res.ok) return res;
  const children = res.data?.data?.children;
  if (!Array.isArray(children)) return { ok: true, data: [] };
  return { ok: true, data: children.map(normalizeRedditPost).filter((p: RedditPost | null): p is RedditPost => Boolean(p)) };
}

export async function getRedditPostComments(
  token: string,
  params: { postId: string; subreddit?: string; limit?: number; username?: string | null },
): Promise<RedditResult<RedditComment[]>> {
  const path = params.subreddit ? `/r/${params.subreddit}/comments/${params.postId}` : `/comments/${params.postId}`;
  const res = await redditFetch<any[]>(token, path, {
    query: { limit: Math.min(params.limit || 10, 50), sort: 'top', depth: 1, raw_json: 1 },
    username: params.username,
  });
  if (!res.ok) return res;
  const listing = Array.isArray(res.data) ? res.data[1] : null;
  const children = listing?.data?.children;
  if (!Array.isArray(children)) return { ok: true, data: [] };
  return { ok: true, data: children.map(normalizeRedditComment).filter((c: RedditComment | null): c is RedditComment => Boolean(c)) };
}

export async function getSubredditRules(
  token: string,
  subreddit: string,
  username?: string | null,
): Promise<RedditResult<{ rules: Array<{ shortName: string; description: string }>; siteRules: string[] }>> {
  const res = await redditFetch<any>(token, `/r/${subreddit}/about/rules`, { query: { raw_json: 1 }, username });
  if (!res.ok) return res;
  const rules = Array.isArray(res.data?.rules)
    ? res.data.rules.map((r: any) => ({ shortName: String(r.short_name || ''), description: String(r.description || '') }))
    : [];
  const siteRules = Array.isArray(res.data?.site_rules) ? res.data.site_rules.map((r: any) => String(r)) : [];
  return { ok: true, data: { rules, siteRules } };
}

export async function getUserComments(
  token: string,
  params: { username: string; limit?: number; usernameForUA?: string | null },
): Promise<RedditResult<RedditComment[]>> {
  const res = await redditFetch<any>(token, `/user/${params.username}/comments`, {
    query: { limit: Math.min(params.limit || 100, 100), sort: 'new', raw_json: 1 },
    username: params.usernameForUA,
  });
  if (!res.ok) return res;
  const children = res.data?.data?.children;
  if (!Array.isArray(children)) return { ok: true, data: [] };
  return { ok: true, data: children.map(normalizeRedditComment).filter((c: RedditComment | null): c is RedditComment => Boolean(c)) };
}

export async function getCommentById(
  token: string,
  fullname: string,
  username?: string | null,
): Promise<RedditResult<RedditComment | null>> {
  const res = await redditFetch<any>(token, '/api/info', { query: { id: fullname, raw_json: 1 }, username });
  if (!res.ok) return res;
  const child = res.data?.data?.children?.[0];
  if (!child || child.kind !== 't1') return { ok: true, data: null };
  return { ok: true, data: normalizeRedditComment(child) };
}
