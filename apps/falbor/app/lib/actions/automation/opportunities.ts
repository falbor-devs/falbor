'use server';

import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationOpportunities } from '~/lib/db/schema';
import { assertWorkspaceAccess } from '~/lib/automation/auth';
import { runDiscovery } from '~/lib/automation/discovery';
import { analyzeOpportunityService } from '~/lib/automation/scoringService';
import type {
  CommunityRuleCheck,
  OpportunityAnalysis,
  OpportunityFactorScores,
  OpportunityStatus,
  PromotionConfidence,
} from '~/lib/automation/types';

export type OpportunityListItem = {
  id: string;
  externalId: string;
  subreddit: string;
  title: string;
  body: string | null;
  url: string;
  author: string | null;
  score: number | null;
  numComments: number | null;
  postedAt: string | null;
  status: OpportunityStatus;
  relevanceScore: number | null;
  analyzedAt: string | null;
  promotionConfidence: PromotionConfidence | null;
  analysis: OpportunityAnalysis | null;
  factors: OpportunityFactorScores | null;
  rulesNotes: string | null;
  communityRules: CommunityRuleCheck | null;
  rulesCheckedAt: string | null;
};

function serializeOpportunity(row: typeof automationOpportunities.$inferSelect): OpportunityListItem {
  return {
    id: row.id,
    externalId: row.externalId,
    subreddit: row.subreddit,
    title: row.title,
    body: row.body,
    url: row.url,
    author: row.author,
    score: row.score,
    numComments: row.numComments,
    postedAt: row.postedAt ? row.postedAt.toISOString() : null,
    status: row.status as OpportunityStatus,
    relevanceScore: row.relevanceScore,
    analyzedAt: row.analyzedAt ? row.analyzedAt.toISOString() : null,
    promotionConfidence: (row.promotionConfidence as PromotionConfidence | null) ?? null,
    analysis: (row.analysis as OpportunityAnalysis | null) ?? null,
    factors: (row.factors as OpportunityFactorScores | null) ?? null,
    rulesNotes: row.rulesNotes,
    communityRules: (row.communityRules as CommunityRuleCheck | null) ?? null,
    rulesCheckedAt: row.rulesCheckedAt ? row.rulesCheckedAt.toISOString() : null,
  };
}

export async function listOpportunities(
  workspaceId: string,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ items: OpportunityListItem[]; total: number }> {
  await assertWorkspaceAccess(workspaceId);

  const where = options.status
    ? and(eq(automationOpportunities.workspaceId, workspaceId), eq(automationOpportunities.status, options.status))
    : eq(automationOpportunities.workspaceId, workspaceId);

  const limit = options.limit && options.limit > 0 ? options.limit : 50;
  const offset = options.offset && options.offset > 0 ? options.offset : 0;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(automationOpportunities)
      .where(where)
      .orderBy(sql`${automationOpportunities.relevanceScore} desc nulls last`, desc(automationOpportunities.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(automationOpportunities).where(where),
  ]);

  return { items: rows.map(serializeOpportunity), total: Number(totalRows[0]?.value || 0) };
}

export async function getOpportunity(workspaceId: string, opportunityId: string): Promise<OpportunityListItem | null> {
  await assertWorkspaceAccess(workspaceId);

  const row = await db.query.automationOpportunities.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.workspaceId, workspaceId), e(t.id, opportunityId)),
  });

  return row ? serializeOpportunity(row) : null;
}

export async function startDiscovery(workspaceId: string) {
  const userId = await assertWorkspaceAccess(workspaceId);
  return runDiscovery(workspaceId, userId);
}

export async function analyzeOpportunity(workspaceId: string, opportunityId: string): Promise<OpportunityListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const row = await analyzeOpportunityService(workspaceId, userId, opportunityId);
  return serializeOpportunity(row);
}

export async function setOpportunityStatus(
  workspaceId: string,
  opportunityId: string,
  status: 'saved' | 'dismissed' | 'new',
) {
  await assertWorkspaceAccess(workspaceId);

  const updated = await db
    .update(automationOpportunities)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(automationOpportunities.workspaceId, workspaceId), eq(automationOpportunities.id, opportunityId)))
    .returning({ id: automationOpportunities.id });

  if (updated.length === 0) throw new Error('Opportunity not found.');

  return { success: true };
}
