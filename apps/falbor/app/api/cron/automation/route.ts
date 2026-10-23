import { NextResponse } from 'next/server';
import { and, asc, desc, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { automationDiscoveryRuns, automationSettings, automationTasks, workspaces } from '~/lib/db/schema';
import { getRedditConnection } from '~/lib/automation/auth';
import { TASK_LEASE_MINUTES } from '~/lib/automation/constants';
import { runDiscovery } from '~/lib/automation/discovery';
import { recordAutomationEvent } from '~/lib/automation/events';
import { reconcilePublicationService } from '~/lib/automation/publications';
import { reconcileStaleTasks } from '~/lib/automation/tasks';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ workspaceId: z.string().trim().min(1).max(255).optional() }).optional();

async function reconcileStaleDiscoveryRuns(workspaceId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60_000);
  const now = new Date();
  const rows = await db
    .update(automationDiscoveryRuns)
    .set({ status: 'failed', errorMessage: 'Interrupted.', completedAt: now, updatedAt: now })
    .where(
      and(
        eq(automationDiscoveryRuns.workspaceId, workspaceId),
        eq(automationDiscoveryRuns.status, 'running'),
        or(
          lt(automationDiscoveryRuns.startedAt, cutoff),
          and(isNull(automationDiscoveryRuns.startedAt), lt(automationDiscoveryRuns.createdAt, cutoff)),
        ),
      ),
    )
    .returning({ id: automationDiscoveryRuns.id });
  return rows.length;
}

async function processQueuedVerifyTasks(workspaceId: string): Promise<number> {
  const queued = await db
    .select()
    .from(automationTasks)
    .where(
      and(
        eq(automationTasks.workspaceId, workspaceId),
        eq(automationTasks.type, 'verify_publication'),
        eq(automationTasks.status, 'queued'),
      ),
    )
    .orderBy(asc(automationTasks.createdAt))
    .limit(5);

  let processed = 0;
  for (const task of queued) {
    const payload = task.payload as { publicationId?: unknown } | null;
    const publicationId = typeof payload?.publicationId === 'string' ? payload.publicationId : null;
    if (!publicationId) {
      const now = new Date();
      await db
        .update(automationTasks)
        .set({
          status: 'failed',
          errorMessage: 'Task payload is missing a publicationId.',
          completedAt: now,
          updatedAt: now,
        })
        .where(and(eq(automationTasks.id, task.id), eq(automationTasks.status, 'queued')));
      await recordAutomationEvent({
        workspaceId,
        type: 'task_failed',
        message: 'A verification task had an invalid payload.',
      });
      processed += 1;
      continue;
    }

    const now = new Date();
    const claimed = await db
      .update(automationTasks)
      .set({
        status: 'running',
        attempts: task.attempts + 1,
        startedAt: now,
        leaseExpiresAt: new Date(now.getTime() + TASK_LEASE_MINUTES * 60_000),
        updatedAt: now,
      })
      .where(and(eq(automationTasks.id, task.id), eq(automationTasks.status, 'queued')))
      .returning({ id: automationTasks.id });
    if (!claimed.length) continue;

    try {
      const publication = await reconcilePublicationService(workspaceId, publicationId);
      const doneAt = new Date();
      await db
        .update(automationTasks)
        .set({
          status: 'completed',
          result: { publicationStatus: publication.status, verified: publication.status === 'verified' },
          completedAt: doneAt,
          updatedAt: doneAt,
        })
        .where(eq(automationTasks.id, task.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed.';
      const failedAt = new Date();
      await db
        .update(automationTasks)
        .set({ status: 'failed', errorMessage: message, completedAt: failedAt, updatedAt: failedAt })
        .where(eq(automationTasks.id, task.id));
      await recordAutomationEvent({
        workspaceId,
        type: 'task_failed',
        message: `Publication verification failed: ${message}`,
        publicationId,
      });
    }
    processed += 1;
  }
  return processed;
}

async function runDiscoveryIfDue(workspaceId: string): Promise<boolean> {
  const settings = await db.query.automationSettings.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  });
  if (!settings?.enabled || !settings.autoDiscovery) return false;

  const lastRun = await db.query.automationDiscoveryRuns.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(automationDiscoveryRuns.createdAt)],
  });
  if (lastRun) {
    if (lastRun.status === 'queued' || lastRun.status === 'running') return false;
    if (Date.now() - lastRun.createdAt.getTime() < 24 * 3_600_000) return false;
  }

  const connection = await getRedditConnection(workspaceId);
  if (!connection || connection.status === 'revoked') return false;

  const workspace = await db.query.workspaces.findFirst({
    where: (t, { eq }) => eq(t.id, workspaceId),
  });
  if (!workspace) return false;

  await runDiscovery(workspaceId, workspace.userId);
  return true;
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const requestedWorkspaceId = parsed.data?.workspaceId;

  try {
    const candidates = new Set<string>();
    if (requestedWorkspaceId) {
      candidates.add(requestedWorkspaceId);
    } else {
      const settingsRows = await db
        .select({ workspaceId: automationSettings.workspaceId })
        .from(automationSettings)
        .orderBy(desc(automationSettings.updatedAt))
        .limit(10);
      for (const row of settingsRows) candidates.add(row.workspaceId);

      const taskRows = await db
        .selectDistinct({ workspaceId: automationTasks.workspaceId })
        .from(automationTasks)
        .where(inArray(automationTasks.status, ['queued', 'running']))
        .limit(10);
      for (const row of taskRows) candidates.add(row.workspaceId);
    }
    const workspaceIds = [...candidates].slice(0, 10);

    const processed = {
      workspaces: 0,
      staleDiscoveryRuns: 0,
      staleTasks: 0,
      verifyTasks: 0,
      discoveries: 0,
      errors: [] as string[],
    };
    let discoveryRuns = 0;

    for (const workspaceId of workspaceIds) {
      processed.workspaces += 1;
      try {
        processed.staleDiscoveryRuns += await reconcileStaleDiscoveryRuns(workspaceId);
        processed.staleTasks += await reconcileStaleTasks(workspaceId);
        processed.verifyTasks += await processQueuedVerifyTasks(workspaceId);

        if (discoveryRuns < 2) {
          const ran = await runDiscoveryIfDue(workspaceId);
          if (ran) {
            discoveryRuns += 1;
            processed.discoveries += 1;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        processed.errors.push(`${workspaceId}: ${message}`);
        console.error(`Automation cron failed for workspace ${workspaceId}:`, error);
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    console.error('Automation cron failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
