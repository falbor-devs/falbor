/**
 * Meta (Facebook) Marketing API service — Graph API v19.0
 *
 * Centralizes every Graph API interaction used by the Meta Ads feature so the
 * OAuth callback, server actions and API routes all speak to Meta the same way.
 * No React/Next imports here — this is plain server-side fetch usage.
 */

import {
  META_API_VERSION,
  META_GRAPH_BASE,
  META_OAUTH_DIALOG,
  META_OAUTH_SCOPES,
  META_OBJECTIVES,
  META_CALL_TO_ACTIONS,
  META_GENDERS,
  META_PAGE_CATEGORIES,
  META_PAGE_CREATE_URL,
  META_PAGES_URL,
  getObjectiveConfig,
  type ObjectiveConfig,
} from './metaAdsConstants';

export {
  META_API_VERSION,
  META_GRAPH_BASE,
  META_OAUTH_DIALOG,
  META_OAUTH_SCOPES,
  META_OBJECTIVES,
  META_CALL_TO_ACTIONS,
  META_GENDERS,
  META_PAGE_CATEGORIES,
  META_PAGE_CREATE_URL,
  META_PAGES_URL,
  getObjectiveConfig,
  type ObjectiveConfig,
};

export type MetaApiError = {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  isAuthError?: boolean;
  isRateLimit?: boolean;
};

export type MetaResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: MetaApiError };

export function normalizeAdAccountId(id: string): string {
  const trimmed = (id || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`;
}

function parseMetaError(payload: any, status: number): MetaApiError {
  const err = payload?.error || {};
  const code = typeof err.code === 'number' ? err.code : undefined;
  const message = err.message || `Meta request failed (HTTP ${status})`;
  // Graph API auth/permission codes: 190 (token), 102 (session), 463/467 (expired), 10/200/294 (perm)
  const isAuthError = code === 190 || code === 102 || code === 463 || code === 467 || status === 401;
  const isRateLimit = code === 17 || code === 613 || code === 4 || status === 429;
  return {
    message: isRateLimit
      ? 'Meta API rate limit reached. Please wait a few minutes and try again.'
      : message,
    type: err.type,
    code,
    error_subcode: err.error_subcode,
    fbtrace_id: err.fbtrace_id,
    isAuthError,
    isRateLimit,
  };
}

type GraphRequestArgs = {
  path: string;
  method?: 'GET' | 'POST' | 'DELETE';
  accessToken: string;
  params?: Record<string, string | number | undefined>;
  body?: FormData | Record<string, string>;
};

export async function graphRequest<T = any>({
  path,
  method = 'GET',
  accessToken,
  params,
  body,
}: GraphRequestArgs): Promise<MetaResult<T>> {
  try {
    const url = new URL(`${META_GRAPH_BASE}${path.startsWith('/') ? path : `/${path}`}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    let requestBody: FormData | string | undefined;

    if (body instanceof FormData) {
      requestBody = body;
    } else if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    // Guard against a stalled Meta endpoint hanging the request forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method,
        headers,
        body: requestBody,
        cache: 'no-store',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok || json?.error) {
      return { ok: false, error: parseMetaError(json, res.status) };
    }
    return { ok: true, data: json as T };
  } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    return {
      ok: false,
      error: {
        message: aborted ? 'Meta did not respond in time. Please try again.' : e?.message || 'Network error contacting Meta.',
      },
    };
  }
}

/* ─────────────────────────── OAuth ─────────────────────────── */

export function buildMetaOAuthUrl(redirectUri: string, state: string, scopes: string = META_OAUTH_SCOPES): string {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const url = new URL(META_OAUTH_DIALOG);
  url.searchParams.set('client_id', appId || '');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

/** Exchange an authorization code for a short-lived user access token. */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaResult<{ access_token: string; expires_in?: number }>> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: { message: 'Meta App credentials are not configured on the server.' } };
  }
  try {
    const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('code', code);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const json: any = await res.json();
    if (!res.ok || json?.error || !json?.access_token) {
      return { ok: false, error: parseMetaError(json, res.status) };
    }
    return { ok: true, data: json };
  } catch (e: any) {
    return { ok: false, error: { message: e?.message || 'Failed to exchange Meta authorization code.' } };
  }
}

/** Exchange a short-lived token for a long-lived (~60 day) user token. */
export async function exchangeForLongLivedToken(shortToken: string): Promise<MetaResult<{ access_token: string; expires_in?: number }>> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: { message: 'Meta App credentials are not configured on the server.' } };
  }
  try {
    const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('fb_exchange_token', shortToken);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const json: any = await res.json();
    if (!res.ok || json?.error || !json?.access_token) {
      // Fall back to the short-lived token so the user is at least connected.
      return { ok: true, data: { access_token: shortToken } };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: true, data: { access_token: shortToken } };
  }
}

/** Verify a token and return its debug metadata (validity, scopes, expiry). */
export async function debugToken(token: string): Promise<MetaResult<any>> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: { message: 'Meta App credentials are not configured on the server.' } };
  }
  return graphRequest({
    path: '/debug_token',
    accessToken: `${appId}|${appSecret}`,
    params: { input_token: token },
  });
}

/* ─────────────────────── Ad accounts / pages ─────────────────────── */

export type MetaAdAccount = {
  id: string; // act_<id>
  account_id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
  business?: { id: string; name: string };
};

/** List the ad accounts the connected user can access. */
export async function getAdAccounts(accessToken: string): Promise<MetaResult<MetaAdAccount[]>> {
  const result = await graphRequest<{ data: MetaAdAccount[] }>({
    path: '/me/adaccounts',
    accessToken,
    params: {
      fields: 'id,account_id,name,currency,timezone_name,account_status,business{id,name}',
      limit: 200,
    },
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data || [] };
}

export type MetaPromoteablePage = {
  id: string;
  name: string;
  instagram_business_account?: { id: string; username?: string };
};

const PAGE_FIELDS = 'id,name,instagram_business_account{id,username}';

function mergePages(target: Map<string, MetaPromoteablePage>, pages: MetaPromoteablePage[] | undefined) {
  for (const page of pages || []) {
    if (page?.id && !target.has(page.id)) target.set(page.id, page);
  }
}

/**
 * List Facebook Pages (with linked Instagram business accounts) the user manages.
 * Pages can be reachable via a direct user role (`/me/accounts`) or through a
 * Business they belong to (`owned_pages` / `client_pages`), so we union all sources.
 */
export async function getPromotablePages(accessToken: string): Promise<MetaResult<MetaPromoteablePage[]>> {
  const byId = new Map<string, MetaPromoteablePage>();
  let firstError: MetaApiError | null = null;

  const collect = async (result: MetaResult<{ data: MetaPromoteablePage[] }>) => {
    if (result.ok) {
      mergePages(byId, result.data.data);
    } else if (!firstError) {
      firstError = result.error;
    }
  };

  await collect(
    await graphRequest<{ data: MetaPromoteablePage[] }>({
      path: '/me/accounts',
      accessToken,
      params: { fields: PAGE_FIELDS, limit: 200 },
    }),
  );

  const businessesRes = await graphRequest<{ data: Array<{ id: string }> }>({
    path: '/me/businesses',
    accessToken,
    params: { fields: 'id', limit: 50 },
  });

  if (businessesRes.ok) {
    for (const business of businessesRes.data.data || []) {
      if (!business?.id) continue;
      for (const edge of ['owned_pages', 'client_pages'] as const) {
        await collect(
          await graphRequest<{ data: MetaPromoteablePage[] }>({
            path: `/${business.id}/${edge}`,
            accessToken,
            params: { fields: PAGE_FIELDS, limit: 200 },
          }),
        );
      }
    }
  }

  const pages = Array.from(byId.values());
  if (pages.length === 0 && firstError) return { ok: false, error: firstError };
  return { ok: true, data: pages };
}

/**
 * Attempt to create a Facebook Page for the connected user.
 *
 * NOTE: Meta restricts Page creation via the Graph API to select partners; for
 * most apps this returns a permission/unsupported error. Callers must surface the
 * error and fall back to Facebook's official Page creation flow. We only forward
 * the documented parameters and never fabricate a success.
 */
export async function createPage(
  accessToken: string,
  input: { name: string; category: string; about?: string },
): Promise<MetaResult<{ id: string }>> {
  return graphRequest<{ id: string }>({
    path: '/me/accounts',
    method: 'POST',
    accessToken,
    body: {
      name: input.name,
      category_enum: input.category,
      ...(input.about ? { about: input.about } : {}),
    },
  });
}

/* ─────────────────────────── Campaigns ─────────────────────────── */

export type MetaCampaign = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  buying_type?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  special_ad_categories?: string[];
  adsets?: { data?: Array<{ id: string; daily_budget?: string; lifetime_budget?: string }> };
};

export async function getCampaigns(accessToken: string, adAccountId: string, limit = 100): Promise<MetaResult<MetaCampaign[]>> {
  const actId = normalizeAdAccountId(adAccountId);
  const result = await graphRequest<{ data: MetaCampaign[] }>({
    path: `/${actId}/campaigns`,
    accessToken,
    params: {
      fields: 'id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,special_ad_categories,adsets.limit(1){id,daily_budget,lifetime_budget}',
      limit,
    },
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data || [] };
}

export type MetaInsightsFields = {
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
};

/** Fetch insights for a single object (campaign/adset/ad) using lifetime or a date preset. */
export async function getInsights(
  accessToken: string,
  objectId: string,
  datePreset: 'lifetime' | 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'maximum' = 'lifetime',
): Promise<MetaResult<MetaInsightsFields>> {
  const result = await graphRequest<{ data: MetaInsightsFields[] }>({
    path: `/${objectId}/insights`,
    accessToken,
    params: {
      fields: 'impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,actions,cost_per_action_type',
      date_preset: datePreset,
    },
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data?.[0] || {} };
}

export type CreateCampaignInput = {
  name: string;
  objective: string;
  status?: 'PAUSED' | 'ACTIVE';
  specialAdCategories?: string[];
  buyingType?: string;
  dailyBudget?: number; // in smallest currency unit
  lifetimeBudget?: number;
  bidStrategy?: string;
};

export async function createCampaign(
  accessToken: string,
  adAccountId: string,
  input: CreateCampaignInput,
): Promise<MetaResult<{ id: string }>> {
  const actId = normalizeAdAccountId(adAccountId);
  const body: Record<string, string> = {
    name: input.name,
    objective: input.objective,
    status: input.status || 'PAUSED',
    special_ad_categories: JSON.stringify(input.specialAdCategories || []),
  };
  if (input.buyingType) body.buying_type = input.buyingType;
  if (input.dailyBudget) body.daily_budget = String(Math.round(input.dailyBudget));
  if (input.lifetimeBudget) body.lifetime_budget = String(Math.round(input.lifetimeBudget));
  if (input.bidStrategy) body.bid_strategy = input.bidStrategy;

  return graphRequest<{ id: string }>({
    path: `/${actId}/campaigns`,
    method: 'POST',
    accessToken,
    body,
  });
}

export type CreateAdSetInput = {
  name: string;
  campaignId: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  billingEvent: string;
  optimizationGoal: string;
  bidStrategy?: string;
  bidAmount?: number;
  targeting: Record<string, any>;
  status?: 'PAUSED' | 'ACTIVE';
  startTime?: string;
  endTime?: string;
  promotedObject?: Record<string, any>;
  destinationType?: string;
};

export async function createAdSet(
  accessToken: string,
  adAccountId: string,
  input: CreateAdSetInput,
): Promise<MetaResult<{ id: string }>> {
  const actId = normalizeAdAccountId(adAccountId);
  const body: Record<string, string> = {
    name: input.name,
    campaign_id: input.campaignId,
    billing_event: input.billingEvent,
    optimization_goal: input.optimizationGoal,
    targeting: JSON.stringify(input.targeting),
    status: input.status || 'PAUSED',
  };
  if (input.dailyBudget) body.daily_budget = String(Math.round(input.dailyBudget));
  if (input.lifetimeBudget) body.lifetime_budget = String(Math.round(input.lifetimeBudget));
  if (input.bidStrategy) body.bid_strategy = input.bidStrategy;
  if (input.bidAmount) body.bid_amount = String(Math.round(input.bidAmount));
  if (input.startTime) body.start_time = input.startTime;
  if (input.endTime) body.end_time = input.endTime;
  if (input.promotedObject) body.promoted_object = JSON.stringify(input.promotedObject);
  if (input.destinationType) body.destination_type = input.destinationType;

  return graphRequest<{ id: string }>({
    path: `/${actId}/adsets`,
    method: 'POST',
    accessToken,
    body,
  });
}

/* ─────────────────────────── Media ─────────────────────────── */

/** Upload an image (base64) to the ad account. Returns the Meta image hash. */
export async function uploadImage(
  accessToken: string,
  adAccountId: string,
  base64: string,
  filename: string,
): Promise<MetaResult<{ hash: string; url?: string }>> {
  const actId = normalizeAdAccountId(adAccountId);
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(cleaned, 'base64');
  const form = new FormData();
  form.append('filename', new Blob([bytes]), filename);
  const result = await graphRequest<{ images: Record<string, { hash: string; url?: string }> }>({
    path: `/${actId}/adimages`,
    method: 'POST',
    accessToken,
    body: form,
  });
  if (!result.ok) return result;
  const images = result.data.images || {};
  const first = Object.values(images)[0];
  if (!first?.hash) {
    return { ok: false, error: { message: 'Meta did not return an image hash.' } };
  }
  return { ok: true, data: { hash: first.hash, url: first.url } };
}

/** Upload a video (base64) to the ad account. Returns the Meta video id. */
export async function uploadVideo(
  accessToken: string,
  adAccountId: string,
  base64: string,
  filename: string,
): Promise<MetaResult<{ id: string }>> {
  const actId = normalizeAdAccountId(adAccountId);
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(cleaned, 'base64');
  const form = new FormData();
  form.append('source', new Blob([bytes]), filename);
  const result = await graphRequest<{ id: string }>({
    path: `/${actId}/advideos`,
    method: 'POST',
    accessToken,
    body: form,
  });
  if (!result.ok) return result;
  if (!result.data?.id) {
    return { ok: false, error: { message: 'Meta did not return a video id.' } };
  }
  return { ok: true, data: { id: result.data.id } };
}

/** Poll a video's processing status. Returns true when ready. */
export async function getVideoStatus(accessToken: string, videoId: string): Promise<MetaResult<{ status?: string }>> {
  return graphRequest<{ status?: any }>({
    path: `/${videoId}`,
    accessToken,
    params: { fields: 'status' },
  });
}

function readVideoStatus(status: any): string | undefined {
  if (!status) return undefined;
  if (typeof status === 'string') return status;
  return status.video_status || status.processing_phase?.status || status.publishing_phase?.status;
}

/**
 * Block until Meta finishes processing an uploaded video. Ad creatives referencing
 * a video that is not yet `ready` fail with a confusing error, so we wait.
 */
export async function waitForVideoReady(
  accessToken: string,
  videoId: string,
  { timeoutMs = 90000, intervalMs = 3000 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<MetaResult<{ ready: boolean }>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await getVideoStatus(accessToken, videoId);
    if (res.ok) {
      const status = readVideoStatus(res.data.status);
      if (status === 'ready' || status === 'complete') return { ok: true, data: { ready: true } };
      if (status === 'error' || status === 'failed') {
        return { ok: false, error: { message: 'Meta failed to process the video. Please try a different file.' } };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { ok: false, error: { message: 'The video is still processing on Meta. Please try again in a moment.' } };
}

/* ─────────────────────── Creative & Ad ─────────────────────── */

export type CreateCreativeInput = {
  name: string;
  pageId: string;
  instagramAccountId?: string;
  message?: string; // primary text
  headline?: string;
  description?: string;
  link: string; // destination URL
  callToActionType?: string;
  imageHash?: string;
  videoId?: string;
  urlTags?: string;
  specialAdCategories?: string[];
};

export async function createAdCreative(
  accessToken: string,
  adAccountId: string,
  input: CreateCreativeInput,
): Promise<MetaResult<{ id: string }>> {
  const actId = normalizeAdAccountId(adAccountId);

  const linkData: Record<string, any> = {
    link: input.link,
    message: input.message || '',
    name: input.headline || '',
    description: input.description || '',
  };
  if (input.callToActionType) {
    linkData.call_to_action = { type: input.callToActionType };
  }
  // Prefer video when present, otherwise image.
  if (input.videoId) {
    linkData.video_id = input.videoId;
  } else if (input.imageHash) {
    linkData.image_hash = input.imageHash;
  }

  const objectStorySpec: Record<string, any> = {
    page_id: input.pageId,
    link_data: linkData,
  };
  if (input.instagramAccountId) {
    objectStorySpec.instagram_actor_id = input.instagramAccountId;
  }

  const body: Record<string, string> = {
    name: input.name,
    object_story_spec: JSON.stringify(objectStorySpec),
  };
  if (input.urlTags) body.url_tags = input.urlTags;

  return graphRequest<{ id: string }>({
    path: `/${actId}/adcreatives`,
    method: 'POST',
    accessToken,
    body,
  });
}

export async function createAd(
  accessToken: string,
  adAccountId: string,
  input: { name: string; adSetId: string; creativeId: string; status?: 'PAUSED' | 'ACTIVE' },
): Promise<MetaResult<{ id: string }>> {
  const actId = normalizeAdAccountId(adAccountId);
  return graphRequest<{ id: string }>({
    path: `/${actId}/ads`,
    method: 'POST',
    accessToken,
    body: {
      name: input.name,
      adset_id: input.adSetId,
      creative: JSON.stringify({ creative_id: input.creativeId }),
      status: input.status || 'PAUSED',
    },
  });
}

/* ─────────────────────── Management actions ─────────────────────── */

export async function updateCampaignStatus(
  accessToken: string,
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED',
): Promise<MetaResult<{ success?: boolean }>> {
  return graphRequest<{ success?: boolean }>({
    path: `/${campaignId}`,
    method: 'POST',
    accessToken,
    body: { status },
  });
}

export async function updateAdSetBudget(
  accessToken: string,
  adSetId: string,
  budget: { dailyBudget?: number; lifetimeBudget?: number },
): Promise<MetaResult<{ success?: boolean }>> {
  const body: Record<string, string> = {};
  if (budget.dailyBudget) body.daily_budget = String(Math.round(budget.dailyBudget));
  if (budget.lifetimeBudget) body.lifetime_budget = String(Math.round(budget.lifetimeBudget));
  return graphRequest<{ success?: boolean }>({
    path: `/${adSetId}`,
    method: 'POST',
    accessToken,
    body,
  });
}

export async function updateCampaignBudget(
  accessToken: string,
  campaignId: string,
  budget: { dailyBudget?: number; lifetimeBudget?: number },
): Promise<MetaResult<{ success?: boolean }>> {
  const body: Record<string, string> = {};
  if (budget.dailyBudget) body.daily_budget = String(Math.round(budget.dailyBudget));
  if (budget.lifetimeBudget) body.lifetime_budget = String(Math.round(budget.lifetimeBudget));
  return graphRequest<{ success?: boolean }>({
    path: `/${campaignId}`,
    method: 'POST',
    accessToken,
    body,
  });
}

export async function updateCampaignName(accessToken: string, campaignId: string, name: string): Promise<MetaResult<{ success?: boolean }>> {
  return graphRequest<{ success?: boolean }>({
    path: `/${campaignId}`,
    method: 'POST',
    accessToken,
    body: { name },
  });
}

/** Delete an object (campaign/adset/ad). Meta requires DELETE with the object id. */
export async function deleteObject(accessToken: string, objectId: string): Promise<MetaResult<{ success?: boolean }>> {
  return graphRequest<{ success?: boolean }>({
    path: `/${objectId}`,
    method: 'DELETE',
    accessToken,
  });
}

