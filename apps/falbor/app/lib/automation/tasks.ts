import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationDrafts, automationOpportunities, automationPublications, automationTasks } from '~/lib/db/schema';
import { AutomationAuthError, type RedditConnectionRow } from './auth';
import { TASK_LEASE_MINUTES } from './constants';
import { recordAutomationEvent } from './events';
import { publicationIdempotencyKey } from './queries';
import { assertDraftTransition, canTransitionDraft, canTransitionPublication } from './state';
import { hashContent } from './tokens';
import type { AutomationDraftRow, AutomationOpportunityRow } from './drafts';
import type { DraftStatus, ExtensionTaskPayload, ExtensionTaskResult, PublicationStatus } from './types';

export type AutomationTaskRow = typeof automationTasks.$inferSelect;
export type AutomationPublicationRow = typeof automationPublications.$inferSelect;

const TASK_TYPE_PUBLISH = 'publish_comment';
const LEASE_EXPIRED_MESSAGE = 'Extension did not report a result before the lease expired.';

function normalizeCommentExternalId(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('t1_') ? trimmed : `t1_${trimmed}`;
}

export async function createPublishTask(
  workspaceId: string,
  userId: string,
  input: { draft: AutomationDraftRow; opportunity: AutomationOpportunityRow; connection: RedditConnectionRow },
): Promise<{ task: AutomationTaskRow; publication: AutomationPublicationRow }> {
  const { draft, opportunity, connection } = input;
  const contentHash = hashContent(draft.body);
  const payload: ExtensionTaskPayload = {
    draftId: draft.id,
    opportunityId: opportunity.id,
    subreddit: opportunity.subreddit,
    threadUrl: opportunity.url,
    threadExternalId: opportunity.externalId,
    title: opportunity.title,
    body: draft.body,
    contentHash,
  };
  const idempotencyKey = publicationIdempotencyKey(draft.id, contentHash);

  await db
    .insert(automationTasks)
    .values({
      workspaceId,
      userId,
      type: TASK_TYPE_PUBLISH,
      status: 'queued',
      draftId: draft.id,
      payload,
      idempotencyKey,
    })
    .onConflictDoNothing({ target: [automationTasks.workspaceId, automationTasks.idempotencyKey] });

  const task = await db.query.automationTasks.findFirst({
    where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.idempotencyKey, idempotencyKey)),
  });
  if (!task) throw new Error('Could not create the publication task.');

  await db
    .insert(automationPublications)
    .values({
      workspaceId,
      draftId: draft.id,
      opportunityId: opportunity.id,
      taskId: task.id,
      redditConnectionId: connection.id,
      accountUsername: connection.username,
      kind: 'comment',
      subreddit: opportunity.subreddit,
      body: draft.body,
      status: 'pending',
    })
    .onConflictDoNothing({ target: [automationPublications.taskId] });

  const publication = await db.query.automationPublications.findFirst({
    where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.taskId, task.id)),
  });
  if (!publication) throw new Error('Could not create the publication record.');

  return { task, publication };
}

export async function reconcileStaleTasks(workspaceId: string): Promise<number> {
  const now = new Date();
  const stale = await db
    .select()
    .from(automationTasks)
    .where(
      and(
        eq(automationTasks.workspaceId, workspaceId),
        eq(automationTasks.status, 'running'),
        lt(automationTasks.leaseExpiresAt, now),
      ),
    );

  for (const task of stale) {
    if (task.type === TASK_TYPE_PUBLISH) {
      await db
        .update(automationTasks)
        .set({ status: 'failed', errorMessage: LEASE_EXPIRED_MESSAGE, completedAt: now, updatedAt: now })
        .where(and(eq(automationTasks.id, task.id), eq(automationTasks.status, 'running')));

      if (task.draftId) {
        const draft = await db.query.automationDrafts.findFirst({
          where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.id, task.draftId!)),
        });
        if (draft && canTransitionDraft(draft.status as DraftStatus, 'outcome_unknown')) {
          await db
            .update(automationDrafts)
            .set({ status: 'outcome_unknown', updatedAt: now })
            .where(eq(automationDrafts.id, draft.id));
        }
      }

      const publication = await db.query.automationPublications.findFirst({
        where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.taskId, task.id)),
      });
      if (publication && canTransitionPublication(publication.status as PublicationStatus, 'outcome_unknown')) {
        await db
          .update(automationPublications)
          .set({ status: 'outcome_unknown', lastError: LEASE_EXPIRED_MESSAGE, lastCheckedAt: now, updatedAt: now })
          .where(eq(automationPublications.id, publication.id));
      }

      await recordAutomationEvent({
        workspaceId,
        type: 'publication_outcome_unknown',
        message: LEASE_EXPIRED_MESSAGE,
        draftId: task.draftId,
        publicationId: publication?.id ?? null,
      });
      continue;
    }

    if (task.attempts < task.maxAttempts) {
      await db
        .update(automationTasks)
        .set({ status: 'queued', leaseExpiresAt: null, installationId: null, updatedAt: now })
        .where(and(eq(automationTasks.id, task.id), eq(automationTasks.status, 'running')));
    } else {
      await db
        .update(automationTasks)
        .set({ status: 'failed', errorMessage: LEASE_EXPIRED_MESSAGE, completedAt: now, updatedAt: now })
        .where(and(eq(automationTasks.id, task.id), eq(automationTasks.status, 'running')));
      await recordAutomationEvent({
        workspaceId,
        type: 'task_failed',
        message: `Task ${task.type} failed: ${LEASE_EXPIRED_MESSAGE}`,
        draftId: task.draftId,
      });
    }
  }

  return stale.length;
}

export async function claimNextTask(installation: {
  installationId: string;
  workspaceId: string;
}): Promise<AutomationTaskRow | null> {
  await reconcileStaleTasks(installation.workspaceId);
  const now = new Date();

  const result = await db.execute(sql`
    UPDATE automation_tasks
    SET status = 'running',
        started_at = now(),
        lease_expires_at = now() + make_interval(mins => ${TASK_LEASE_MINUTES}),
        attempts = attempts + 1,
        installation_id = ${installation.installationId},
        updated_at = now()
    WHERE id = (
      SELECT id FROM automation_tasks
      WHERE workspace_id = ${installation.workspaceId}
        AND status = 'queued'
        AND (not_before IS NULL OR not_before <= now())
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `);
  const rawResult = result as unknown as { rows?: Array<{ id?: string }> } | Array<{ id?: string }>;
  const rows = Array.isArray(rawResult) ? rawResult : rawResult?.rows ?? [];
  const claimedId = rows[0]?.id;
  if (!claimedId) return null;

  const task = await db.query.automationTasks.findFirst({
    where: and(eq(automationTasks.workspaceId, installation.workspaceId), eq(automationTasks.id, claimedId)),
  });
  if (!task) return null;

  if (task.type === TASK_TYPE_PUBLISH) {
    if (task.draftId) {
      const draft = await db.query.automationDrafts.findFirst({
        where: (t, { eq, and }) => and(eq(t.workspaceId, installation.workspaceId), eq(t.id, task.draftId!)),
      });
      if (draft && draft.status === 'queued') {
        assertDraftTransition('queued', 'submitting');
        await db
          .update(automationDrafts)
          .set({ status: 'submitting', updatedAt: now })
          .where(and(eq(automationDrafts.id, draft.id), eq(automationDrafts.status, 'queued')));
      }
    }

    await recordAutomationEvent({
      workspaceId: installation.workspaceId,
      type: 'execution_claimed',
      message: 'The browser extension claimed the publication task.',
      draftId: task.draftId,
    });
  }

  return task;
}

export async function completeTaskFromExtension(params: {
  task: AutomationTaskRow;
  installation: { installationId: string; workspaceId: string };
  result: ExtensionTaskResult;
}): Promise<{ taskStatus: string; draftStatus: string | null; publicationStatus: string | null }> {
  const { task, installation, result } = params;
  if (task.workspaceId !== installation.workspaceId || task.installationId !== installation.installationId) {
    throw new AutomationAuthError(403, 'This task belongs to another extension installation.');
  }

  const publication = await db.query.automationPublications.findFirst({
    where: (t, { eq, and }) => and(eq(t.workspaceId, task.workspaceId), eq(t.taskId, task.id)),
  });
  const draft = task.draftId
    ? await db.query.automationDrafts.findFirst({
        where: (t, { eq, and }) => and(eq(t.workspaceId, task.workspaceId), eq(t.id, task.draftId!)),
      })
    : null;

  if (task.status !== 'running') {
    return { taskStatus: task.status, draftStatus: draft?.status ?? null, publicationStatus: publication?.status ?? null };
  }

  const now = new Date();

  if (result.status === 'submitted_observed') {
    const submittedUrl = result.url?.trim() || publication?.url || null;
    await db
      .update(automationTasks)
      .set({ status: 'completed', result, errorMessage: null, completedAt: now, updatedAt: now })
      .where(eq(automationTasks.id, task.id));

    if (publication && canTransitionPublication(publication.status as PublicationStatus, 'submitted')) {
      const patch: {
        status: string;
        submittedAt: Date;
        lastCheckedAt: Date;
        verificationMethod: string;
        lastError: null;
        updatedAt: Date;
        url?: string;
        externalId?: string;
      } = {
        status: 'submitted',
        submittedAt: now,
        lastCheckedAt: now,
        verificationMethod: 'extension_observed',
        lastError: null,
        updatedAt: now,
      };
      if (result.url?.trim()) patch.url = result.url.trim();
      if (result.externalId?.trim()) patch.externalId = normalizeCommentExternalId(result.externalId);
      await db.update(automationPublications).set(patch).where(eq(automationPublications.id, publication.id));
    }

    if (draft && canTransitionDraft(draft.status as DraftStatus, 'submitted')) {
      assertDraftTransition(draft.status as DraftStatus, 'submitted');
      await db.update(automationDrafts).set({ status: 'submitted', updatedAt: now }).where(eq(automationDrafts.id, draft.id));
    }

    await recordAutomationEvent({
      workspaceId: task.workspaceId,
      type: 'publication_submitted',
      message: 'The extension submitted the draft to Reddit; verification is pending.',
      opportunityId: publication?.opportunityId ?? null,
      draftId: task.draftId,
      publicationId: publication?.id ?? null,
      url: submittedUrl,
    });
  } else if (result.status === 'failed') {
    const message = result.error?.trim() || 'The extension reported a failed submission.';
    await db
      .update(automationTasks)
      .set({ status: 'failed', result, errorMessage: message, completedAt: now, updatedAt: now })
      .where(eq(automationTasks.id, task.id));

    if (publication && canTransitionPublication(publication.status as PublicationStatus, 'failed')) {
      await db
        .update(automationPublications)
        .set({ status: 'failed', lastError: message, updatedAt: now })
        .where(eq(automationPublications.id, publication.id));
    }
    if (draft && canTransitionDraft(draft.status as DraftStatus, 'failed')) {
      await db.update(automationDrafts).set({ status: 'failed', updatedAt: now }).where(eq(automationDrafts.id, draft.id));
    }

    await recordAutomationEvent({
      workspaceId: task.workspaceId,
      type: 'publication_failed',
      message,
      opportunityId: publication?.opportunityId ?? null,
      draftId: task.draftId,
      publicationId: publication?.id ?? null,
    });
  } else if (result.status === 'outcome_unknown') {
    const message = 'The extension could not determine whether Reddit accepted the submission.';
    await db
      .update(automationTasks)
      .set({ status: 'failed', result, errorMessage: message, completedAt: now, updatedAt: now })
      .where(eq(automationTasks.id, task.id));

    if (publication && canTransitionPublication(publication.status as PublicationStatus, 'outcome_unknown')) {
      await db
        .update(automationPublications)
        .set({ status: 'outcome_unknown', lastError: result.error?.trim() || message, lastCheckedAt: now, updatedAt: now })
        .where(eq(automationPublications.id, publication.id));
    }
    if (draft && canTransitionDraft(draft.status as DraftStatus, 'outcome_unknown')) {
      await db
        .update(automationDrafts)
        .set({ status: 'outcome_unknown', updatedAt: now })
        .where(eq(automationDrafts.id, draft.id));
    }

    await recordAutomationEvent({
      workspaceId: task.workspaceId,
      type: 'publication_outcome_unknown',
      message,
      opportunityId: publication?.opportunityId ?? null,
      draftId: task.draftId,
      publicationId: publication?.id ?? null,
    });
  } else {
    await db
      .update(automationTasks)
      .set({ status: 'cancelled', result, errorMessage: null, completedAt: now, updatedAt: now })
      .where(eq(automationTasks.id, task.id));

    if (publication && canTransitionPublication(publication.status as PublicationStatus, 'failed')) {
      await db
        .update(automationPublications)
        .set({ status: 'failed', lastError: 'Cancelled in the browser by the user.', updatedAt: now })
        .where(eq(automationPublications.id, publication.id));
    }

    if (draft) {
      // The user cancelled before anything was posted. The state machine only allows
      // submitting→failed, so walk the valid failed→draft path to make it editable again
      // (or set approved directly when the claim transition never happened).
      if (canTransitionDraft(draft.status as DraftStatus, 'approved')) {
        await db.update(automationDrafts).set({ status: 'approved', updatedAt: now }).where(eq(automationDrafts.id, draft.id));
      } else if (canTransitionDraft(draft.status as DraftStatus, 'failed')) {
        await db.update(automationDrafts).set({ status: 'failed', updatedAt: now }).where(eq(automationDrafts.id, draft.id));
        if (canTransitionDraft('failed', 'draft')) {
          await db.update(automationDrafts).set({ status: 'draft', updatedAt: now }).where(eq(automationDrafts.id, draft.id));
        }
      }
    }

    await recordAutomationEvent({
      workspaceId: task.workspaceId,
      type: 'publication_failed',
      message: 'The user cancelled the submission in the browser.',
      opportunityId: publication?.opportunityId ?? null,
      draftId: task.draftId,
      publicationId: publication?.id ?? null,
    });
  }

  const [freshTask, freshDraft, freshPublication] = await Promise.all([
    db.query.automationTasks.findFirst({ where: eq(automationTasks.id, task.id) }),
    draft ? db.query.automationDrafts.findFirst({ where: eq(automationDrafts.id, draft.id) }) : Promise.resolve(null),
    publication
      ? db.query.automationPublications.findFirst({ where: eq(automationPublications.id, publication.id) })
      : Promise.resolve(null),
  ]);

  return {
    taskStatus: freshTask?.status ?? task.status,
    draftStatus: freshDraft?.status ?? null,
    publicationStatus: freshPublication?.status ?? null,
  };
}
