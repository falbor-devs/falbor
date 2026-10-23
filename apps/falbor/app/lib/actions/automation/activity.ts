'use server';

import { and, desc, eq, gte, inArray, isNull, lt, ne } from 'drizzle-orm';
import { db } from '~/lib/db';
import {
  automationDiscoveryRuns,
  automationDrafts,
  automationEvents,
  automationMetricSnapshots,
  automationOpportunities,
  automationPublications,
} from '~/lib/db/schema';
import { assertWorkspaceAccess } from '~/lib/automation/auth';
import { reconcilePublicationService, refreshPublicationMetricsService } from '~/lib/automation/publications';

export type AutomationActivityItem = {
  id: string;
  type: string;
  message: string;
  url: string | null;
  opportunityId: string | null;
  draftId: string | null;
  publicationId: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

export type PublicationItem = {
  id: string;
  draftId: string | null;
  opportunityId: string | null;
  kind: string;
  subreddit: string;
  externalId: string | null;
  url: string | null;
  status: string;
  verificationMethod: string | null;
  accountUsername: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  body: string;
  createdAt: string;
  latestMetrics: { score: number | null; commentCount: number | null; retrievedAt: string } | null;
};

export type PerformanceSummary = {
  sinceDays: number;
  counts: { published: number; verified: number; failed: number; outcomeUnknown: number };
  totalScore: number | null;
  totalComments: number | null;
  snapshots: Array<{ date: string; count: number }>;
  newestSnapshotAt: string | null;
};

export type Recommendation = {
  id: string;
  title: string;
  observation: string;
  whyItMatters: string;
  suggestedAction: string;
  evidenceIds: string[];
  requiresApproval: boolean;
};

type PublicationRow = typeof automationPublications.$inferSelect;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function serializePublication(
  row: PublicationRow,
  latest: { score: number | null; commentCount: number | null; retrievedAt: string } | null,
): PublicationItem {
  return {
    id: row.id,
    draftId: row.draftId,
    opportunityId: row.opportunityId,
    kind: row.kind,
    subreddit: row.subreddit,
    externalId: row.externalId,
    url: row.url,
    status: row.status,
    verificationMethod: row.verificationMethod,
    accountUsername: row.accountUsername,
    submittedAt: toIso(row.submittedAt),
    verifiedAt: toIso(row.verifiedAt),
    lastCheckedAt: toIso(row.lastCheckedAt),
    lastError: row.lastError,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    latestMetrics: latest,
  };
}

async function loadLatestSnapshots(
  workspaceId: string,
  publicationIds: string[],
): Promise<Map<string, { score: number | null; commentCount: number | null; retrievedAt: string }>> {
  const latest = new Map<string, { score: number | null; commentCount: number | null; retrievedAt: string }>();
  if (!publicationIds.length) return latest;

  const snapshots = await db
    .select()
    .from(automationMetricSnapshots)
    .where(
      and(
        eq(automationMetricSnapshots.workspaceId, workspaceId),
        inArray(automationMetricSnapshots.publicationId, publicationIds),
      ),
    )
    .orderBy(desc(automationMetricSnapshots.retrievedAt));

  for (const snapshot of snapshots) {
    if (latest.has(snapshot.publicationId)) continue;
    latest.set(snapshot.publicationId, {
      score: snapshot.score,
      commentCount: snapshot.commentCount,
      retrievedAt: snapshot.retrievedAt.toISOString(),
    });
  }
  return latest;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function listAutomationActivity(workspaceId: string, limit = 50): Promise<AutomationActivityItem[]> {
  await assertWorkspaceAccess(workspaceId);
  const rows = await db.query.automationEvents.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(automationEvents.createdAt)],
    limit: Math.min(200, Math.max(1, limit)),
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    url: row.url,
    opportunityId: row.opportunityId,
    draftId: row.draftId,
    publicationId: row.publicationId,
    createdAt: row.createdAt.toISOString(),
    meta: asRecord(row.meta),
  }));
}

export async function listPublications(workspaceId: string, limit = 100): Promise<PublicationItem[]> {
  await assertWorkspaceAccess(workspaceId);
  const rows = await db.query.automationPublications.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(automationPublications.createdAt)],
    limit: Math.min(200, Math.max(1, limit)),
  });
  const latest = await loadLatestSnapshots(
    workspaceId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => serializePublication(row, latest.get(row.id) ?? null));
}

export async function refreshPublicationMetrics(workspaceId: string, publicationId: string): Promise<PublicationItem> {
  await assertWorkspaceAccess(workspaceId);
  const row = await refreshPublicationMetricsService(workspaceId, publicationId);
  const latest = await loadLatestSnapshots(workspaceId, [row.id]);
  return serializePublication(row, latest.get(row.id) ?? null);
}

export async function reconcilePublication(workspaceId: string, publicationId: string): Promise<PublicationItem> {
  await assertWorkspaceAccess(workspaceId);
  const row = await reconcilePublicationService(workspaceId, publicationId);
  const latest = await loadLatestSnapshots(workspaceId, [row.id]);
  return serializePublication(row, latest.get(row.id) ?? null);
}

export async function getPerformanceSummary(workspaceId: string, sinceDays = 30): Promise<PerformanceSummary> {
  await assertWorkspaceAccess(workspaceId);
  const days = Math.min(365, Math.max(1, Math.round(sinceDays)));
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const publications = await db
    .select({
      id: automationPublications.id,
      status: automationPublications.status,
      createdAt: automationPublications.createdAt,
    })
    .from(automationPublications)
    .where(and(eq(automationPublications.workspaceId, workspaceId), gte(automationPublications.createdAt, since)));

  const counts = { published: 0, verified: 0, failed: 0, outcomeUnknown: 0 };
  for (const publication of publications) {
    if (publication.status === 'submitted' || publication.status === 'verified') counts.published += 1;
    if (publication.status === 'verified') counts.verified += 1;
    if (publication.status === 'failed') counts.failed += 1;
    if (publication.status === 'outcome_unknown') counts.outcomeUnknown += 1;
  }

  const latest = await loadLatestSnapshots(
    workspaceId,
    publications.map((publication) => publication.id),
  );
  const snapshotsForRange = [...latest.values()];
  const scores = snapshotsForRange.map((snapshot) => snapshot.score).filter((score): score is number => score !== null);
  const commentCounts = snapshotsForRange
    .map((snapshot) => snapshot.commentCount)
    .filter((count): count is number => count !== null);

  const timelineDays = Math.min(days, 30);
  const timelineStart = new Date();
  timelineStart.setHours(0, 0, 0, 0);
  timelineStart.setDate(timelineStart.getDate() - (timelineDays - 1));
  const buckets = new Map<string, number>();
  for (const publication of publications) {
    if (publication.createdAt < timelineStart) continue;
    const key = dateKey(publication.createdAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const snapshots = Array.from({ length: timelineDays }, (_, index) => {
    const date = new Date(timelineStart.getTime() + index * 86_400_000);
    const key = dateKey(date);
    return { date: key, count: buckets.get(key) ?? 0 };
  });

  const newest = await db
    .select({ retrievedAt: automationMetricSnapshots.retrievedAt })
    .from(automationMetricSnapshots)
    .where(eq(automationMetricSnapshots.workspaceId, workspaceId))
    .orderBy(desc(automationMetricSnapshots.retrievedAt))
    .limit(1);

  return {
    sinceDays: days,
    counts,
    totalScore: latest.size === 0 || scores.length === 0 ? null : scores.reduce((sum, score) => sum + score, 0),
    totalComments: latest.size === 0 || commentCounts.length === 0 ? null : commentCounts.reduce((sum, value) => sum + value, 0),
    snapshots,
    newestSnapshotAt: newest[0]?.retrievedAt ? newest[0].retrievedAt.toISOString() : null,
  };
}

export async function getRecommendations(workspaceId: string): Promise<Recommendation[]> {
  await assertWorkspaceAccess(workspaceId);
  const recommendations: Recommendation[] = [];
  const push = (recommendation: Recommendation) => {
    if (recommendations.length < 5) recommendations.push(recommendation);
  };
  const evidence = (ids: string[]) => ids.slice(0, 10);

  const unknownPublications = await db
    .select({ id: automationPublications.id })
    .from(automationPublications)
    .where(and(eq(automationPublications.workspaceId, workspaceId), eq(automationPublications.status, 'outcome_unknown')))
    .limit(50);
  if (unknownPublications.length) {
    push({
      id: 'reconcile-outcome-unknown',
      title: `Reconcile ${unknownPublications.length} submission${unknownPublications.length === 1 ? '' : 's'} with unknown outcome`,
      observation: `${unknownPublications.length} publication${unknownPublications.length === 1 ? '' : 's'} could not be confirmed on Reddit.`,
      whyItMatters: 'Until they are reconciled you cannot tell whether Reddit accepted the comment, and retrying blindly could double-post.',
      suggestedAction: 'Run reconciliation for these publications to check your recent Reddit comments.',
      evidenceIds: evidence(unknownPublications.map((row) => row.id)),
      requiresApproval: true,
    });
  }

  const approvedDrafts = await db
    .select({ id: automationDrafts.id })
    .from(automationDrafts)
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.status, 'approved')))
    .limit(50);
  if (approvedDrafts.length) {
    const linked = await db
      .select({ draftId: automationPublications.draftId })
      .from(automationPublications)
      .where(
        and(
          eq(automationPublications.workspaceId, workspaceId),
          inArray(
            automationPublications.draftId,
            approvedDrafts.map((draft) => draft.id),
          ),
        ),
      );
    const linkedIds = new Set(linked.map((row) => row.draftId));
    const pending = approvedDrafts.filter((draft) => !linkedIds.has(draft.id));
    if (pending.length) {
      push({
        id: 'publish-approved-drafts',
        title: `Publish ${pending.length} approved draft${pending.length === 1 ? '' : 's'}`,
        observation: `${pending.length} approved draft${pending.length === 1 ? ' has' : 's have'} no publication queued yet.`,
        whyItMatters: 'Approved drafts only reach Reddit after a publication request is made.',
        suggestedAction: 'Request publication for the approved drafts you want to post.',
        evidenceIds: evidence(pending.map((draft) => draft.id)),
        requiresApproval: true,
      });
    }
  }

  const dayAgo = new Date(Date.now() - 86_400_000);
  const staleMetricPublications = await db
    .select({ id: automationPublications.id })
    .from(automationPublications)
    .where(
      and(
        eq(automationPublications.workspaceId, workspaceId),
        inArray(automationPublications.status, ['submitted', 'verified']),
        lt(automationPublications.createdAt, dayAgo),
      ),
    )
    .limit(50);
  if (staleMetricPublications.length) {
    const withSnapshots = await db
      .select({ publicationId: automationMetricSnapshots.publicationId })
      .from(automationMetricSnapshots)
      .where(
        and(
          eq(automationMetricSnapshots.workspaceId, workspaceId),
          inArray(
            automationMetricSnapshots.publicationId,
            staleMetricPublications.map((row) => row.id),
          ),
        ),
      );
    const known = new Set(withSnapshots.map((row) => row.publicationId));
    const missing = staleMetricPublications.filter((row) => !known.has(row.id));
    if (missing.length) {
      push({
        id: 'refresh-metrics',
        title: `Refresh metrics for ${missing.length} publication${missing.length === 1 ? '' : 's'}`,
        observation: `${missing.length} publication${missing.length === 1 ? '' : 's'} older than 24 hours have no metric snapshot.`,
        whyItMatters: 'Without snapshots there is no real performance data to judge which contributions work.',
        suggestedAction: 'Fetch the latest score and comment activity from Reddit for these publications.',
        evidenceIds: evidence(missing.map((row) => row.id)),
        requiresApproval: false,
      });
    }
  }

  const unanalyzed = await db
    .select({ id: automationOpportunities.id, subreddit: automationOpportunities.subreddit })
    .from(automationOpportunities)
    .where(
      and(
        eq(automationOpportunities.workspaceId, workspaceId),
        isNull(automationOpportunities.analysis),
        ne(automationOpportunities.status, 'dismissed'),
        ne(automationOpportunities.status, 'saved'),
      ),
    )
    .limit(300);
  const bySubreddit = new Map<string, string[]>();
  for (const opportunity of unanalyzed) {
    const ids = bySubreddit.get(opportunity.subreddit) ?? [];
    ids.push(opportunity.id);
    bySubreddit.set(opportunity.subreddit, ids);
  }
  const qualified = [...bySubreddit.entries()]
    .filter(([, ids]) => ids.length >= 3)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [subreddit, ids] of qualified) {
    push({
      id: `analyze-subreddit:${subreddit}`,
      title: `Analyze ${ids.length} discussions in r/${subreddit}`,
      observation: `${ids.length} discovered discussions in r/${subreddit} have not been analyzed yet.`,
      whyItMatters: 'Analysis determines whether a discussion is a genuine fit before any drafting effort is spent.',
      suggestedAction: `Start analysis for the unanalyzed discussions in r/${subreddit}.`,
      evidenceIds: evidence(ids),
      requiresApproval: false,
    });
    if (recommendations.length >= 5) break;
  }

  if (recommendations.length < 5) {
    const unavailable = await db
      .select({ id: automationOpportunities.id })
      .from(automationOpportunities)
      .where(
        and(
          eq(automationOpportunities.workspaceId, workspaceId),
          eq(automationOpportunities.promotionConfidence, 'unavailable'),
          ne(automationOpportunities.status, 'dismissed'),
        ),
      )
      .limit(10);
    if (unavailable.length) {
      push({
        id: 'review-community-rules',
        title: `Review community rules for ${unavailable.length} discussion${unavailable.length === 1 ? '' : 's'}`,
        observation: `${unavailable.length} analyzed discussion${unavailable.length === 1 ? '' : 's'} could not confirm promotion rules for their subreddit.`,
        whyItMatters: 'Without verified rules the safest option is to avoid mentioning the product, which weakens the draft.',
        suggestedAction: 'Review the community rules manually and confirm whether product mentions are allowed.',
        evidenceIds: evidence(unavailable.map((row) => row.id)),
        requiresApproval: false,
      });
    }
  }

  if (recommendations.length < 5) {
    const lastRun = await db.query.automationDiscoveryRuns.findFirst({
      where: (t, { eq }) => eq(t.workspaceId, workspaceId),
      orderBy: [desc(automationDiscoveryRuns.createdAt)],
    });
    if (!lastRun) {
      push({
        id: 'run-discovery',
        title: 'Run discovery',
        observation: 'No discovery run has been recorded for this workspace yet.',
        whyItMatters: 'Without discovery there are no fresh Reddit discussions to evaluate.',
        suggestedAction: 'Run discovery to find recent discussions that match the product.',
        evidenceIds: [workspaceId],
        requiresApproval: false,
      });
    } else if (Date.now() - lastRun.createdAt.getTime() > 7 * 86_400_000) {
      push({
        id: 'run-discovery',
        title: 'Run discovery',
        observation: `The last discovery run was on ${lastRun.createdAt.toISOString().slice(0, 10)}.`,
        whyItMatters: 'Old opportunities go stale; fresh discussions are more likely to still be active.',
        suggestedAction: 'Run discovery to find recent discussions that match the product.',
        evidenceIds: [lastRun.id],
        requiresApproval: false,
      });
    }
  }

  return recommendations;
}
