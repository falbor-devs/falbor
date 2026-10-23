import { and, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationDrafts, automationMetricSnapshots, automationOpportunities, automationPublications } from '~/lib/db/schema';
import { requireRedditContext } from './auth';
import { PUBLICATION_MATCH_WINDOW_HOURS } from './constants';
import { recordAutomationEvent } from './events';
import { redditFullname } from './queries';
import { getCommentById, getUserComments } from './reddit';
import { canTransitionDraft, canTransitionPublication, textsMatch } from './state';
import type { DraftStatus, PublicationStatus } from './types';

export type AutomationPublicationRow = typeof automationPublications.$inferSelect;

const NOT_FOUND_YET = 'Not found yet among your 100 most recent comments. Reddit may still be processing it.';
const NOT_FOUND_ANYMORE = 'The comment could no longer be found in your recent comment history.';

async function loadPublication(workspaceId: string, publicationId: string): Promise<AutomationPublicationRow> {
  const publication = await db.query.automationPublications.findFirst({
    where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.id, publicationId)),
  });
  if (!publication) throw new Error('Publication not found.');
  return publication;
}

function inMatchWindow(createdUtc: number | null, now: Date): boolean {
  if (!createdUtc) return false;
  return now.getTime() - createdUtc * 1000 <= PUBLICATION_MATCH_WINDOW_HOURS * 3_600_000;
}

async function applyNotFound(publication: AutomationPublicationRow): Promise<AutomationPublicationRow> {
  const now = new Date();
  if (publication.verifiedAt) {
    const status = canTransitionPublication(publication.status as PublicationStatus, 'removed_or_unavailable')
      ? 'removed_or_unavailable'
      : publication.status;
    await db
      .update(automationPublications)
      .set({ status, lastCheckedAt: now, lastError: NOT_FOUND_ANYMORE, updatedAt: now })
      .where(eq(automationPublications.id, publication.id));
    await recordAutomationEvent({
      workspaceId: publication.workspaceId,
      type: 'publication_removed',
      message: NOT_FOUND_ANYMORE,
      opportunityId: publication.opportunityId,
      draftId: publication.draftId,
      publicationId: publication.id,
    });
  } else {
    await db
      .update(automationPublications)
      .set({ lastCheckedAt: now, lastError: NOT_FOUND_YET, updatedAt: now })
      .where(eq(automationPublications.id, publication.id));
  }

  const refreshed = await db.query.automationPublications.findFirst({
    where: eq(automationPublications.id, publication.id),
  });
  return refreshed ?? publication;
}

export async function reconcilePublicationService(
  workspaceId: string,
  publicationId: string,
): Promise<AutomationPublicationRow> {
  const context = await requireRedditContext(workspaceId);
  const publication = await loadPublication(workspaceId, publicationId);
  if (!publication.body) throw new Error('This publication has no stored body to match against.');
  if (!context.username) throw new Error('The connected Reddit account has no username. Reconnect Reddit and try again.');

  const commentsResult = await getUserComments(context.accessToken, {
    username: context.username,
    limit: 100,
    usernameForUA: context.username,
  });
  if (!commentsResult.ok) throw new Error(commentsResult.error);

  const opportunity = publication.opportunityId
    ? await db.query.automationOpportunities.findFirst({
        where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.id, publication.opportunityId!)),
      })
    : null;
  const threadFullname = opportunity ? redditFullname('post', opportunity.externalId) : null;
  const now = new Date();

  const preferred = commentsResult.data.find(
    (comment) => threadFullname !== null && comment.linkId?.toLowerCase() === threadFullname && textsMatch(comment.body, publication.body),
  );
  const fallback = commentsResult.data.find(
    (comment) => inMatchWindow(comment.createdUtc, now) && textsMatch(comment.body, publication.body),
  );
  const match = preferred ?? fallback ?? null;

  if (!match) return applyNotFound(publication);

  const status = canTransitionPublication(publication.status as PublicationStatus, 'verified')
    ? 'verified'
    : publication.status;
  await db
    .update(automationPublications)
    .set({
      externalId: match.fullname,
      url: match.permalink,
      status,
      verifiedAt: now,
      lastCheckedAt: now,
      lastError: null,
      verificationMethod: 'reddit_api',
      updatedAt: now,
    })
    .where(eq(automationPublications.id, publication.id));

  await db.insert(automationMetricSnapshots).values({
    workspaceId,
    publicationId: publication.id,
    score: match.score,
    commentCount: null,
    source: 'reddit_api',
    raw: { body: match.body.slice(0, 500) },
  });

  if (publication.draftId) {
    const draft = await db.query.automationDrafts.findFirst({
      where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.id, publication.draftId!)),
    });
    if (draft && canTransitionDraft(draft.status as DraftStatus, 'verified')) {
      await db
        .update(automationDrafts)
        .set({ status: 'verified', verifiedAt: now, updatedAt: now })
        .where(eq(automationDrafts.id, draft.id));
    }
  }

  await recordAutomationEvent({
    workspaceId,
    type: 'publication_verified',
    message: 'The comment was found on Reddit and marked as verified.',
    opportunityId: publication.opportunityId,
    draftId: publication.draftId,
    publicationId: publication.id,
    url: match.permalink,
  });
  await recordAutomationEvent({
    workspaceId,
    type: 'metrics_updated',
    message: 'A new metric snapshot was recorded from Reddit.',
    draftId: publication.draftId,
    publicationId: publication.id,
    meta: { score: match.score },
  });

  const refreshed = await db.query.automationPublications.findFirst({
    where: eq(automationPublications.id, publication.id),
  });
  return refreshed ?? publication;
}

export async function refreshPublicationMetricsService(
  workspaceId: string,
  publicationId: string,
): Promise<AutomationPublicationRow> {
  const context = await requireRedditContext(workspaceId);
  const publication = await loadPublication(workspaceId, publicationId);
  if (!publication.externalId) throw new Error('This publication has no Reddit identifier yet. Reconcile it first.');

  const result = await getCommentById(context.accessToken, publication.externalId, context.username);
  if (!result.ok) throw new Error(result.error);
  if (!result.data) return applyNotFound(publication);

  const now = new Date();
  await db.insert(automationMetricSnapshots).values({
    workspaceId,
    publicationId: publication.id,
    score: result.data.score,
    commentCount: null,
    source: 'reddit_api',
    raw: { body: result.data.body.slice(0, 500) },
  });
  await db
    .update(automationPublications)
    .set({ lastCheckedAt: now, lastError: null, updatedAt: now })
    .where(eq(automationPublications.id, publication.id));

  await recordAutomationEvent({
    workspaceId,
    type: 'metrics_updated',
    message: 'A new metric snapshot was recorded from Reddit.',
    opportunityId: publication.opportunityId,
    draftId: publication.draftId,
    publicationId: publication.id,
    meta: { score: result.data.score },
  });

  const refreshed = await db.query.automationPublications.findFirst({
    where: eq(automationPublications.id, publication.id),
  });
  return refreshed ?? publication;
}
