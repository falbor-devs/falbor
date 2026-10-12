import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { workspaceProductProfiles } from '~/lib/db/schema';
import { orchestrate } from '../models';
import type { StageHandler } from './types';

const SITE_FETCH_TIMEOUT_MS = 10_000;
const SITE_TEXT_LIMIT = 8000;

function isPublicHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return false;
  }

  if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host)) {
    return false;
  }

  return host.includes('.');
}

async function fetchSiteText(domain: string | null) {
  if (!domain) {
    return '';
  }

  try {
    const url = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`);

    if (!isPublicHost(url.hostname)) {
      return '';
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(SITE_FETCH_TIMEOUT_MS), redirect: 'follow' });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();

    return html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, SITE_TEXT_LIMIT);
  } catch {
    return '';
  }
}

const productSchema = z.object({
  productName: z.string(),
  summary: z.string(),
  features: z.array(z.string()).max(12),
  pricing: z.string().nullable(),
  maturity: z.string().nullable(),
  conversionBlockers: z
    .array(z.object({ issue: z.string(), evidence: z.string() }))
    .describe('Only issues directly supported by the provided website text'),
});

const marketSchema = z.object({
  category: z.string(),
  icp: z.string(),
  problem: z.string(),
  positioning: z.string(),
  useCases: z.array(z.string()).max(8),
  knownCompetitors: z.array(z.object({ name: z.string(), domain: z.string().nullable() })).max(10),
});

async function loadWorkspace(workspaceId: string) {
  const workspace = await db.query.workspaces.findFirst({ where: (w, { eq }) => eq(w.id, workspaceId) });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  return workspace;
}

export const scanProduct: StageHandler = async ({ workspaceId }) => {
  const workspace = await loadWorkspace(workspaceId);
  const siteText = await fetchSiteText(workspace.domain);

  const profile = await orchestrate(
    productSchema,
    `Extract a factual product profile. Use only the information below. Do not invent pricing, features or traction; use null when unknown.

Workspace onboarding context:
${workspace.contextPrompt ?? 'none'}

Product name hint: ${workspace.name ?? 'unknown'}
Domain: ${workspace.domain ?? 'unknown'}

Website text:
${siteText || 'unavailable'}`,
  );

  await db
    .insert(workspaceProductProfiles)
    .values({ workspaceId, domain: workspace.domain, ...profile })
    .onConflictDoUpdate({
      target: workspaceProductProfiles.workspaceId,
      set: { domain: workspace.domain, ...profile, updatedAt: new Date() },
    });

  return { websiteScanned: siteText.length > 0 };
};

export const understandMarket: StageHandler = async ({ workspaceId }) => {
  const workspace = await loadWorkspace(workspaceId);
  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });

  if (!profile) {
    throw new Error('Product profile missing');
  }

  const market = await orchestrate(
    marketSchema,
    `Describe the market this product competes in. Only name competitors you are confident really exist.

Product: ${profile.productName}
Summary: ${profile.summary}
Features: ${JSON.stringify(profile.features)}
Pricing: ${profile.pricing ?? 'unknown'}
Onboarding context: ${workspace.contextPrompt ?? 'none'}`,
  );

  await db
    .update(workspaceProductProfiles)
    .set({ ...market, updatedAt: new Date() })
    .where(eq(workspaceProductProfiles.workspaceId, workspaceId));

  return { competitors: market.knownCompetitors.length };
};
