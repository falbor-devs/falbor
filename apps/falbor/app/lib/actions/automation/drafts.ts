'use server';

import { and, count, desc, eq, gte } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationDrafts, automationOpportunities, automationPublications, automationSettings, automationTasks } from '~/lib/db/schema';
import { assertWorkspaceAccess, requireRedditContext } from '~/lib/automation/auth';
import { DRAFT_MAX_BODY_CHARS } from '~/lib/automation/constants';
import { generateDraftService, regenerateDraftService } from '~/lib/automation/drafts';
import { recordAutomationEvent } from '~/lib/automation/events';
import { assertDraftTransition, canTransitionDraft, isPublishableDraft } from '~/lib/automation/state';
import { createPublishTask } from '~/lib/automation/tasks';
import { hashContent } from '~/lib/automation/tokens';
import type { DraftStatus } from '~/lib/automation/types';

export type DraftListItem = {
  id: string;
  opportunityId: string | null;
  contentType: string;
  body: string;
  status: string;
  aiReasoning: string | null;
  warnings: string[];
  productMentioned: boolean;
  model: string | null;
  generation: number;
  approvedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity: { id: string; title: string; subreddit: string; url: string; externalId: string } | null;
};

type DraftRow = typeof automationDrafts.$inferSelect;
type OpportunityRow = typeof automationOpportunities.$inferSelect;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function serializeDraft(draft: DraftRow, opportunity: OpportunityRow | null): DraftListItem {
  return {
    id: draft.id,
    opportunityId: draft.opportunityId,
    contentType: draft.contentType,
    body: draft.body,
    status: draft.status,
    aiReasoning: draft.aiReasoning,
    warnings: asStringArray(draft.warnings),
    productMentioned: draft.productMentioned,
    model: draft.model,
    generation: draft.generation,
    approvedAt: toIso(draft.approvedAt),
    verifiedAt: toIso(draft.verifiedAt),
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    opportunity: opportunity
      ? {
          id: opportunity.id,
          title: opportunity.title,
          subreddit: opportunity.subreddit,
          url: opportunity.url,
          externalId: opportunity.externalId,
        }
      : null,
  };
}

async function loadDraftWithOpportunity(workspaceId: string, draftId: string) {
  const rows = await db
    .select({ draft: automationDrafts, opportunity: automationOpportunities })
    .from(automationDrafts)
    .leftJoin(automationOpportunities, eq(automationDrafts.opportunityId, automationOpportunities.id))
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.id, draftId)))
    .limit(1);
  return rows[0] ?? null;
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function listDrafts(
  workspaceId: string,
  filters?: { status?: string; limit?: number },
): Promise<DraftListItem[]> {
  await assertWorkspaceAccess(workspaceId);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 50));
  const where = filters?.status
    ? and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.status, filters.status))
    : eq(automationDrafts.workspaceId, workspaceId);

  const rows = await db
    .select({ draft: automationDrafts, opportunity: automationOpportunities })
    .from(automationDrafts)
    .leftJoin(automationOpportunities, eq(automationDrafts.opportunityId, automationOpportunities.id))
    .where(where)
    .orderBy(desc(automationDrafts.createdAt))
    .limit(limit);

  return rows.map((row) => serializeDraft(row.draft, row.opportunity));
}

export async function getDraft(workspaceId: string, draftId: string): Promise<DraftListItem | null> {
  await assertWorkspaceAccess(workspaceId);
  const row = await loadDraftWithOpportunity(workspaceId, draftId);
  return row ? serializeDraft(row.draft, row.opportunity) : null;
}

export async function generateDraft(
  workspaceId: string,
  opportunityId: string,
  options?: { instructions?: string },
): Promise<DraftListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const draft = await generateDraftService(workspaceId, userId, opportunityId, options);
  const row = await loadDraftWithOpportunity(workspaceId, draft.id);
  return row ? serializeDraft(row.draft, row.opportunity) : serializeDraft(draft, null);
}

export async function regenerateDraft(
  workspaceId: string,
  draftId: string,
  instructions?: string,
): Promise<DraftListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const draft = await regenerateDraftService(workspaceId, userId, draftId, instructions);
  const row = await loadDraftWithOpportunity(workspaceId, draft.id);
  return row ? serializeDraft(row.draft, row.opportunity) : serializeDraft(draft, null);
}

export async function saveDraft(workspaceId: string, draftId: string, body: string): Promise<DraftListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const found = await loadDraftWithOpportunity(workspaceId, draftId);
  if (!found) throw new Error('Draft not found.');

  const nextBody = body.trim();
  if (!nextBody) throw new Error('Draft body cannot be empty.');
  if (nextBody.length > DRAFT_MAX_BODY_CHARS) {
    throw new Error(`Draft body must be ${DRAFT_MAX_BODY_CHARS} characters or fewer.`);
  }
  if (nextBody === found.draft.body) return serializeDraft(found.draft, found.opportunity);

  const resetsApproval = ['approved', 'draft', 'awaiting_approval'].includes(found.draft.status);
  const [updated] = await db
    .update(automationDrafts)
    .set({
      body: nextBody,
      status: resetsApproval ? 'awaiting_approval' : found.draft.status,
      approvedContentHash: null,
      approvedAt: null,
      approvedByUserId: null,
      updatedAt: new Date(),
    })
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.id, draftId)))
    .returning();

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'draft_saved',
    message: 'Draft body edited; approval was invalidated.',
    opportunityId: found.draft.opportunityId,
    draftId: updated.id,
  });

  return serializeDraft(updated, found.opportunity);
}

export async function approveDraft(workspaceId: string, draftId: string): Promise<DraftListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const found = await loadDraftWithOpportunity(workspaceId, draftId);
  if (!found) throw new Error('Draft not found.');

  const currentHash = hashContent(found.draft.body);
  if (found.draft.status === 'approved' && found.draft.approvedContentHash === currentHash) {
    return serializeDraft(found.draft, found.opportunity);
  }
  if (found.draft.status !== 'draft' && found.draft.status !== 'awaiting_approval') {
    throw new Error(`This draft cannot be approved from its current status (${found.draft.status}).`);
  }
  if (!found.draft.body.trim()) throw new Error('This draft is empty and cannot be approved.');

  assertDraftTransition(found.draft.status as DraftStatus, 'approved');
  const now = new Date();
  const [updated] = await db
    .update(automationDrafts)
    .set({
      status: 'approved',
      approvedContentHash: currentHash,
      approvedAt: now,
      approvedByUserId: userId,
      updatedAt: now,
    })
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.id, draftId)))
    .returning();

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'draft_approved',
    message: 'Draft approved and ready to publish.',
    opportunityId: found.draft.opportunityId,
    draftId: updated.id,
  });

  return serializeDraft(updated, found.opportunity);
}

export async function rejectDraft(workspaceId: string, draftId: string, reason?: string): Promise<DraftListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const found = await loadDraftWithOpportunity(workspaceId, draftId);
  if (!found) throw new Error('Draft not found.');
  if (!canTransitionDraft(found.draft.status as DraftStatus, 'rejected')) {
    throw new Error(`This draft cannot be rejected from its current status (${found.draft.status}).`);
  }

  assertDraftTransition(found.draft.status as DraftStatus, 'rejected');
  const now = new Date();
  const [updated] = await db
    .update(automationDrafts)
    .set({ status: 'rejected', rejectedAt: now, updatedAt: now })
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.id, draftId)))
    .returning();

  await db
    .update(automationTasks)
    .set({ status: 'cancelled', updatedAt: now })
    .where(
      and(
        eq(automationTasks.workspaceId, workspaceId),
        eq(automationTasks.draftId, draftId),
        eq(automationTasks.status, 'queued'),
      ),
    );

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'draft_rejected',
    message: reason?.trim() ? `Draft rejected: ${reason.trim()}` : 'Draft rejected.',
    opportunityId: found.draft.opportunityId,
    draftId: updated.id,
    meta: reason?.trim() ? { reason: reason.trim() } : undefined,
  });

  return serializeDraft(updated, found.opportunity);
}

export async function cancelDraft(workspaceId: string, draftId: string): Promise<DraftListItem> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const found = await loadDraftWithOpportunity(workspaceId, draftId);
  if (!found) throw new Error('Draft not found.');

  const currentStatus = found.draft.status as DraftStatus;
  if (!canTransitionDraft(currentStatus, 'cancelled')) {
    // outcome_unknown cannot jump to cancelled directly; the valid chain is outcome_unknown→failed→cancelled.
    if (currentStatus === 'outcome_unknown' && canTransitionDraft('outcome_unknown', 'failed') && canTransitionDraft('failed', 'cancelled')) {
      await db.update(automationDrafts).set({ status: 'failed', updatedAt: new Date() }).where(eq(automationDrafts.id, draftId));
    } else {
      throw new Error(`This draft cannot be cancelled from its current status (${found.draft.status}).`);
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(automationDrafts)
    .set({ status: 'cancelled', updatedAt: now })
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.id, draftId)))
    .returning();

  await db
    .update(automationTasks)
    .set({ status: 'cancelled', updatedAt: now })
    .where(
      and(
        eq(automationTasks.workspaceId, workspaceId),
        eq(automationTasks.draftId, draftId),
        eq(automationTasks.status, 'queued'),
      ),
    );

  await db
    .update(automationPublications)
    .set({ status: 'failed', lastError: 'Cancelled by user.', updatedAt: now })
    .where(
      and(
        eq(automationPublications.workspaceId, workspaceId),
        eq(automationPublications.draftId, draftId),
        eq(automationPublications.status, 'pending'),
      ),
    );

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'draft_cancelled',
    message: 'Draft cancelled.',
    opportunityId: found.draft.opportunityId,
    draftId: updated.id,
  });

  return serializeDraft(updated, found.opportunity);
}

export async function requestPublication(
  workspaceId: string,
  draftId: string,
): Promise<{ taskId: string; publicationId: string; draft: DraftListItem }> {
  const userId = await assertWorkspaceAccess(workspaceId);
  const found = await loadDraftWithOpportunity(workspaceId, draftId);
  if (!found) throw new Error('Draft not found.');
  const opportunity = found.opportunity;
  if (!opportunity) throw new Error('The discussion for this draft no longer exists.');

  const reddit = await requireRedditContext(workspaceId);

  const publishable = isPublishableDraft(
    { status: found.draft.status as DraftStatus, body: found.draft.body, approvedContentHash: found.draft.approvedContentHash },
    hashContent(found.draft.body),
  );
  if (!publishable.ok) throw new Error(publishable.reason || 'This draft is not ready for publication.');

  const settings = await db.query.automationSettings.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  });
  const maxPublicationsPerDay = settings?.maxPublicationsPerDay ?? 5;
  const publicationsToday = await db
    .select({ value: count() })
    .from(automationPublications)
    .where(and(eq(automationPublications.workspaceId, workspaceId), gte(automationPublications.createdAt, startOfToday())));
  if (Number(publicationsToday[0]?.value || 0) >= maxPublicationsPerDay) {
    throw new Error(`Daily publication limit reached (${maxPublicationsPerDay}). Adjust it in Automation settings.`);
  }

  const { task, publication } = await createPublishTask(workspaceId, userId, {
    draft: found.draft,
    opportunity,
    connection: reddit.connection,
  });

  assertDraftTransition(found.draft.status as DraftStatus, 'queued');
  await db
    .update(automationDrafts)
    .set({ status: 'queued', updatedAt: new Date() })
    .where(and(eq(automationDrafts.workspaceId, workspaceId), eq(automationDrafts.id, draftId)));

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'publication_requested',
    message: `Publication queued for r/${opportunity.subreddit}.`,
    opportunityId: opportunity.id,
    draftId: draftId,
    publicationId: publication.id,
    url: opportunity.url,
  });

  const refreshed = await loadDraftWithOpportunity(workspaceId, draftId);
  return {
    taskId: task.id,
    publicationId: publication.id,
    draft: refreshed ? serializeDraft(refreshed.draft, refreshed.opportunity) : serializeDraft(found.draft, opportunity),
  };
}
