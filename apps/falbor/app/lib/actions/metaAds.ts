'use server';

import { db } from '~/lib/db';
import { metaAdAccounts, metaCampaigns, metaCampaignDrafts, workspaceMedia } from '~/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getCurrentUserId, requireMetaContext, decryptToken } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';
import { encrypt } from '~/lib/crypto';
import {
  createAd,
  createAdCreative,
  createAdSet,
  createCampaign,
  createPage,
  deleteObject,
  getAdAccounts,
  getObjectiveConfig,
  getPromotablePages,
  normalizeAdAccountId,
  updateAdSetBudget,
  updateCampaignName,
  updateCampaignStatus,
  uploadImage,
  uploadVideo,
  waitForVideoReady,
  graphRequest,
  META_GENDERS,
} from '~/lib/services/metaAds';

async function assertWorkspaceAccess(workspaceId: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Unauthorized');
  const workspace = await getAccessibleWorkspace(workspaceId, userId);
  if (!workspace) throw new Error('Forbidden');
  return userId;
}

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/* ─────────────────────── Account management ─────────────────────── */

export async function getMetaAccounts(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);
  const accounts = await db.query.metaAdAccounts.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(metaAdAccounts.updatedAt)],
  });
  return accounts.map((a) => ({
    id: a.id,
    adAccountId: a.adAccountId,
    name: a.name,
    currency: a.currency,
    timezoneName: a.timezoneName,
    accountStatus: a.accountStatus,
    isEnabled: a.isEnabled,
  }));
}

export async function selectMetaAdAccount(workspaceId: string, adAccountId: string) {
  await assertWorkspaceAccess(workspaceId);
  await db
    .update(metaAdAccounts)
    .set({ isEnabled: false, updatedAt: new Date() })
    .where(eq(metaAdAccounts.workspaceId, workspaceId));
  await db
    .update(metaAdAccounts)
    .set({ isEnabled: true, updatedAt: new Date() })
    .where(and(eq(metaAdAccounts.workspaceId, workspaceId), eq(metaAdAccounts.adAccountId, adAccountId)));
  return { success: true };
}

export async function disconnectMeta(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);
  await db.delete(metaAdAccounts).where(eq(metaAdAccounts.workspaceId, workspaceId));
  return { success: true };
}

/** Re-fetch the ad accounts available to the stored token and upsert them. */
export async function refreshMetaAccounts(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);
  const existing = await db.query.metaAdAccounts.findFirst({
    where: eq(metaAdAccounts.workspaceId, workspaceId),
    orderBy: [desc(metaAdAccounts.updatedAt)],
  });
  if (!existing) throw new Error('Meta account not connected.');

  const token = decryptToken(existing.accessTokenEncrypted);
  if (!token) throw new Error('Meta access token missing. Please reconnect.');

  const res = await getAdAccounts(token);
  if (!res.ok) throw new Error(res.error.message);

  const enabledId = existing.adAccountId;
  for (const account of res.data) {
    const adAccountId = normalizeAdAccountId(account.id || account.account_id || '');
    if (!adAccountId) continue;
    const found = await db.query.metaAdAccounts.findFirst({
      where: and(eq(metaAdAccounts.workspaceId, workspaceId), eq(metaAdAccounts.adAccountId, adAccountId)),
    });
    if (found) {
      await db
        .update(metaAdAccounts)
        .set({
          name: account.name || found.name,
          currency: account.currency || found.currency,
          timezoneName: account.timezone_name || found.timezoneName,
          accountStatus: typeof account.account_status === 'number' ? account.account_status : found.accountStatus,
          accessTokenEncrypted: encrypt(token),
          updatedAt: new Date(),
        })
        .where(eq(metaAdAccounts.id, found.id));
    } else {
      await db.insert(metaAdAccounts).values({
        workspaceId,
        adAccountId,
        name: account.name || null,
        currency: account.currency || null,
        timezoneName: account.timezone_name || null,
        accountStatus: typeof account.account_status === 'number' ? account.account_status : null,
        isEnabled: adAccountId === enabledId,
        accessTokenEncrypted: encrypt(token),
      });
    }
  }
  return getMetaAccounts(workspaceId);
}

export async function getMetaPromotablePages(workspaceId: string) {
  const context = await requireMetaContext(workspaceId);
  const res = await getPromotablePages(context.accessToken);
  if (!res.ok) throw new Error(res.error.message);
  return res.data.map((p) => ({
    id: p.id,
    name: p.name,
    instagramAccountId: p.instagram_business_account?.id || null,
    instagramUsername: p.instagram_business_account?.username || null,
  }));
}

/**
 * Attempt to create a Facebook Page for the connected user. Meta restricts this
 * to select partners, so a failure is expected for most apps — the UI must fall
 * back to the official Facebook flow rather than pretending success.
 */
export async function createMetaPage(
  workspaceId: string,
  input: { name: string; category: string; about?: string },
) {
  const context = await requireMetaContext(workspaceId);
  if (!input.name?.trim()) throw new Error('Page name is required.');
  if (!input.category) throw new Error('Please choose a Page category.');

  const res = await createPage(context.accessToken, {
    name: input.name.trim(),
    category: input.category,
    about: input.about?.trim() || undefined,
  });
  if (!res.ok) throw new Error(res.error.message);
  return { success: true, pageId: res.data.id };
}

export async function searchMetaInterests(workspaceId: string, query: string) {
  const context = await requireMetaContext(workspaceId);
  if (!query || query.trim().length < 2) return [];
  const res = await graphRequest<{ data: Array<{ id: string; name: string; audience_size?: number }> }>({
    path: '/search',
    accessToken: context.accessToken,
    params: {
      type: 'adinterest',
      q: query.trim(),
      limit: 10,
    },
  });
  if (!res.ok) return [];
  return res.data.data || [];
}

/* ─────────────────────── Media registration ─────────────────────── */

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } catch {
    return null;
  }
}

/**
 * Make sure a workspace media item is registered with the given Meta ad account.
 * Returns the Meta image hash or video id, caching the result on the media row.
 */
async function ensureMediaRegistered(
  workspaceId: string,
  adAccountId: string,
  accessToken: string,
  mediaId: string,
): Promise<{ imageHash?: string; videoId?: string }> {
  const media = await db.query.workspaceMedia.findFirst({
    where: and(eq(workspaceMedia.id, mediaId), eq(workspaceMedia.workspaceId, workspaceId)),
  });
  if (!media) throw new Error('Media not found in this workspace.');

  const hashes = (media.metaHashes as Record<string, { imageHash?: string; videoId?: string }>) || {};
  const cached = hashes[adAccountId];
  if (cached && (cached.imageHash || cached.videoId)) return cached;

  let base64 = media.data || '';
  if (!base64 && media.url) {
    const fetched = await urlToBase64(media.url);
    if (fetched) base64 = fetched;
  }
  if (!base64) throw new Error('Media could not be read for upload to Meta.');

  const filename = `falbor-${mediaId}.${media.kind === 'video' ? 'mp4' : 'jpg'}`;
  const result =
    media.kind === 'video'
      ? await uploadVideo(accessToken, adAccountId, base64, filename)
      : await uploadImage(accessToken, adAccountId, base64, filename);

  if (!result.ok) throw new Error(result.error.message);

  // Ad creatives fail if the video is not fully processed yet — wait for it.
  if (media.kind === 'video') {
    const ready = await waitForVideoReady(accessToken, (result.data as { id: string }).id);
    if (!ready.ok) throw new Error(ready.error.message);
  }

  const entry: { imageHash?: string; videoId?: string } =
    media.kind === 'video'
      ? { videoId: (result.data as { id: string }).id }
      : { imageHash: (result.data as { hash: string }).hash };

  await db
    .update(workspaceMedia)
    .set({ metaHashes: { ...hashes, [adAccountId]: entry } })
    .where(eq(workspaceMedia.id, mediaId));

  return entry;
}

/* ─────────────────────── Campaign CRUD ─────────────────────── */

export type MetaCampaignTargeting = {
  countries?: string[];
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  interests?: Array<{ id: string; name: string }>;
};

export type MetaCampaignPlacements = {
  publisherPlatforms?: string[];
  facebookPositions?: string[];
  instagramPositions?: string[];
};

export type CreateMetaCampaignInput = {
  name: string;
  objective: string;
  specialAdCategories?: string[];
  budgetType: 'daily' | 'lifetime';
  budgetAmount: number; // currency units (e.g. dollars)
  startDate?: string;
  endDate?: string;
  targeting: MetaCampaignTargeting;
  placements: MetaCampaignPlacements;
  optimizationGoal?: string;
  billingEvent?: string;
  // Ad creative
  pageId: string;
  instagramAccountId?: string;
  adName?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  linkUrl: string;
  callToAction?: string;
  mediaId?: string;
  imageHash?: string;
  videoId?: string;
  urlTags?: string;
};

function buildTargeting(input: MetaCampaignTargeting, placements: MetaCampaignPlacements) {
  const targeting: Record<string, any> = {
    geo_locations: { countries: input.countries?.length ? input.countries : ['US'] },
    age_min: input.ageMin ?? 18,
    age_max: input.ageMax ?? 65,
    // Facebook requires an upper bound below 66 for some objectives; clamp.
    genders: [META_GENDERS[input.gender || 'all'] ?? 0],
  };
  if (input.interests?.length) {
    targeting.flexible_spec = [{ interests: input.interests.map((i) => ({ id: i.id, name: i.name })) }];
  }
  if (placements.publisherPlatforms?.length) {
    targeting.publisher_platforms = placements.publisherPlatforms;
  }
  if (placements.facebookPositions?.length) {
    targeting.facebook_positions = placements.facebookPositions;
  }
  if (placements.instagramPositions?.length) {
    targeting.instagram_positions = placements.instagramPositions;
  }
  return targeting;
}

/**
 * Create a full campaign → ad set → creative → ad pipeline, all PAUSED.
 * Returns the created Meta ids and the local record id.
 */
export async function createMetaCampaign(workspaceId: string, input: CreateMetaCampaignInput) {
  const context = await requireMetaContext(workspaceId);

  if (!input.name?.trim()) throw new Error('Campaign name is required.');
  if (!input.linkUrl?.trim()) throw new Error('Destination URL is required.');
  if (!input.pageId) throw new Error('A Facebook Page is required for the ad.');
  if (!input.mediaId && !input.imageHash && !input.videoId) {
    throw new Error('An image or video is required for the ad creative.');
  }
  if (!input.budgetAmount || input.budgetAmount <= 0) throw new Error('A valid budget is required.');

  const objectiveConfig = getObjectiveConfig(input.objective);
  const optimizationGoal = input.optimizationGoal || objectiveConfig?.defaultOptimizationGoal || 'LINK_CLICKS';
  const billingEvent = input.billingEvent || objectiveConfig?.defaultBillingEvent || 'IMPRESSIONS';

  // Resolve media → Meta hash/id (registering if needed).
  let imageHash = input.imageHash;
  let videoId = input.videoId;
  if (input.mediaId) {
    const registered = await ensureMediaRegistered(workspaceId, context.adAccountId, context.accessToken, input.mediaId);
    imageHash = registered.imageHash || imageHash;
    videoId = registered.videoId || videoId;
  }

  // 1. Campaign (paused).
  const campaignRes = await createCampaign(context.accessToken, context.adAccountId, {
    name: input.name.trim(),
    objective: input.objective,
    status: 'PAUSED',
    specialAdCategories: input.specialAdCategories || [],
  });
  if (!campaignRes.ok) throw new Error(campaignRes.error.message);
  const metaCampaignId = campaignRes.data.id;

  // 2. Ad set (paused).
  const targeting = buildTargeting(input.targeting, input.placements);
  const adSetRes = await createAdSet(context.accessToken, context.adAccountId, {
    name: `${input.name.trim()} — Ad Set`,
    campaignId: metaCampaignId,
    dailyBudget: input.budgetType === 'daily' ? toMinorUnits(input.budgetAmount) : undefined,
    lifetimeBudget: input.budgetType === 'lifetime' ? toMinorUnits(input.budgetAmount) : undefined,
    billingEvent,
    optimizationGoal,
    targeting,
    status: 'PAUSED',
    startTime: input.startDate,
    endTime: input.endDate,
  });
  if (!adSetRes.ok) {
    // Roll back the orphan campaign so we don't leave a partial setup.
    await deleteObject(context.accessToken, metaCampaignId);
    throw new Error(adSetRes.error.message);
  }
  const metaAdSetId = adSetRes.data.id;

  // 3. Creative.
  const creativeRes = await createAdCreative(context.accessToken, context.adAccountId, {
    name: `${input.name.trim()} — Creative`,
    pageId: input.pageId,
    instagramAccountId: input.instagramAccountId,
    message: input.primaryText,
    headline: input.headline,
    description: input.description,
    link: input.linkUrl,
    callToActionType: input.callToAction || 'LEARN_MORE',
    imageHash,
    videoId,
    urlTags: input.urlTags,
  });
  if (!creativeRes.ok) {
    await deleteObject(context.accessToken, metaCampaignId);
    throw new Error(creativeRes.error.message);
  }
  const metaCreativeId = creativeRes.data.id;

  // 4. Ad (paused).
  const adRes = await createAd(context.accessToken, context.adAccountId, {
    name: input.adName || `${input.name.trim()} — Ad`,
    adSetId: metaAdSetId,
    creativeId: metaCreativeId,
    status: 'PAUSED',
  });
  if (!adRes.ok) {
    await deleteObject(context.accessToken, metaCampaignId);
    throw new Error(adRes.error.message);
  }
  const metaAdId = adRes.data.id;

  // 5. Persist locally.
  const [record] = await db
    .insert(metaCampaigns)
    .values({
      workspaceId,
      adAccountId: context.adAccountId,
      metaCampaignId,
      metaAdSetId,
      metaAdId,
      metaCreativeId,
      name: input.name.trim(),
      objective: input.objective,
      status: 'PAUSED',
      effectiveStatus: 'PAUSED',
      specialAdCategories: input.specialAdCategories || [],
      budgetType: input.budgetType,
      budgetAmount: toMinorUnits(input.budgetAmount),
      optimizationGoal,
      billingEvent,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      targeting,
      placements: input.placements || {},
      pageId: input.pageId,
      instagramAccountId: input.instagramAccountId || null,
      adName: input.adName || null,
      creativeBody: input.primaryText || null,
      creativeHeadline: input.headline || null,
      creativeDescription: input.description || null,
      creativeLinkUrl: input.linkUrl,
      callToAction: input.callToAction || null,
      mediaId: input.mediaId || null,
      metaImageHash: imageHash || null,
      metaVideoId: videoId || null,
      utmParameters: input.urlTags ? { url_tags: input.urlTags } : {},
      lastSyncedAt: new Date(),
    })
    .returning({ id: metaCampaigns.id });

  return {
    success: true,
    recordId: record.id,
    campaignId: metaCampaignId,
    adSetId: metaAdSetId,
    creativeId: metaCreativeId,
    adId: metaAdId,
  };
}

export async function listMetaCampaigns(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);
  return db.query.metaCampaigns.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(metaCampaigns.createdAt)],
  });
}

export async function setMetaCampaignStatus(
  workspaceId: string,
  metaCampaignId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
) {
  const context = await requireMetaContext(workspaceId);
  if (!metaCampaignId) throw new Error('metaCampaignId is required.');

  const res = await updateCampaignStatus(context.accessToken, metaCampaignId, status);
  if (!res.ok) throw new Error(res.error.message);

  await db
    .update(metaCampaigns)
    .set({ status, effectiveStatus: status, lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(metaCampaigns.workspaceId, workspaceId), eq(metaCampaigns.metaCampaignId, metaCampaignId)));

  return { success: true, status };
}

/** Resolve the ad set id budget updates should target. */
async function resolveAdSetId(accessToken: string, workspaceId: string, metaCampaignId: string): Promise<string | null> {
  const local = await db.query.metaCampaigns.findFirst({
    where: and(eq(metaCampaigns.workspaceId, workspaceId), eq(metaCampaigns.metaCampaignId, metaCampaignId)),
  });
  if (local?.metaAdSetId) return local.metaAdSetId;

  const res = await graphRequest<{ data: Array<{ id: string }> }>({
    path: `/${metaCampaignId}/adsets`,
    accessToken,
    params: { fields: 'id', limit: 1 },
  });
  if (res.ok && res.data.data?.[0]?.id) return res.data.data[0].id;
  return null;
}

export async function updateMetaCampaignBudget(
  workspaceId: string,
  metaCampaignId: string,
  budgetAmount: number,
  budgetType: 'daily' | 'lifetime',
) {
  const context = await requireMetaContext(workspaceId);
  if (!metaCampaignId) throw new Error('metaCampaignId is required.');
  if (!budgetAmount || budgetAmount <= 0) throw new Error('A valid budget is required.');

  const adSetId = await resolveAdSetId(context.accessToken, workspaceId, metaCampaignId);
  if (!adSetId) throw new Error('Could not find the ad set for this campaign.');

  const minor = toMinorUnits(budgetAmount);
  const res =
    budgetType === 'lifetime'
      ? await updateAdSetBudget(context.accessToken, adSetId, { lifetimeBudget: minor })
      : await updateAdSetBudget(context.accessToken, adSetId, { dailyBudget: minor });
  if (!res.ok) throw new Error(res.error.message);

  await db
    .update(metaCampaigns)
    .set({ budgetAmount: minor, budgetType, lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(metaCampaigns.workspaceId, workspaceId), eq(metaCampaigns.metaCampaignId, metaCampaignId)));

  return { success: true, budgetAmount: minor };
}

export async function renameMetaCampaign(workspaceId: string, metaCampaignId: string, name: string) {
  const context = await requireMetaContext(workspaceId);
  if (!metaCampaignId) throw new Error('metaCampaignId is required.');
  if (!name?.trim()) throw new Error('Name is required.');

  const res = await updateCampaignName(context.accessToken, metaCampaignId, name.trim());
  if (!res.ok) throw new Error(res.error.message);

  await db
    .update(metaCampaigns)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(and(eq(metaCampaigns.workspaceId, workspaceId), eq(metaCampaigns.metaCampaignId, metaCampaignId)));

  return { success: true, name: name.trim() };
}

export async function deleteMetaCampaign(workspaceId: string, metaCampaignId: string) {
  const context = await requireMetaContext(workspaceId);
  if (!metaCampaignId) throw new Error('metaCampaignId is required.');

  const res = await deleteObject(context.accessToken, metaCampaignId);
  if (!res.ok) throw new Error(res.error.message);

  await db
    .delete(metaCampaigns)
    .where(and(eq(metaCampaigns.workspaceId, workspaceId), eq(metaCampaigns.metaCampaignId, metaCampaignId)));
  return { success: true };
}

/* ─────────────────────── Campaign drafts ─────────────────────── */

export type MetaCampaignDraft = {
  step: number;
  state: Record<string, any>;
  adAccountId?: string | null;
  updatedAt: string;
};

/** Load the current user's in-progress draft for a workspace, if any. */
export async function getMetaCampaignDraft(workspaceId: string): Promise<MetaCampaignDraft | null> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const draft = await db.query.metaCampaignDrafts.findFirst({
    where: and(eq(metaCampaignDrafts.workspaceId, workspaceId), eq(metaCampaignDrafts.userId, userId)),
  });
  if (!draft) return null;
  return {
    step: draft.step,
    state: (draft.state as Record<string, any>) || {},
    adAccountId: draft.adAccountId,
    updatedAt: draft.updatedAt.toISOString(),
  };
}

/** Upsert the current user's draft for a workspace. */
export async function saveMetaCampaignDraft(
  workspaceId: string,
  input: { step: number; state: Record<string, any>; adAccountId?: string | null },
) {
  const userId = await assertWorkspaceAccess(workspaceId);
  const step = Number.isFinite(input.step) ? Math.min(Math.max(Math.trunc(input.step), 1), 6) : 1;
  const state = input.state || {};
  if (JSON.stringify(state).length > 200_000) {
    throw new Error('This draft is too large to save.');
  }
  const now = new Date();

  await db
    .insert(metaCampaignDrafts)
    .values({
      workspaceId,
      userId,
      adAccountId: input.adAccountId || null,
      step,
      state,
      clientUpdatedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [metaCampaignDrafts.workspaceId, metaCampaignDrafts.userId],
      set: {
        adAccountId: input.adAccountId || null,
        step,
        state,
        clientUpdatedAt: now,
        updatedAt: now,
      },
    });

  return { success: true, savedAt: now.toISOString() };
}

/** Delete the current user's draft (discard, or after a successful creation). */
export async function deleteMetaCampaignDraft(workspaceId: string) {
  const userId = await assertWorkspaceAccess(workspaceId);
  await db
    .delete(metaCampaignDrafts)
    .where(and(eq(metaCampaignDrafts.workspaceId, workspaceId), eq(metaCampaignDrafts.userId, userId)));
  return { success: true };
}
