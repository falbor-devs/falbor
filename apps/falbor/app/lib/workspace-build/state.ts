import { and, asc, eq, isNull, lt, ne, or } from 'drizzle-orm';
import { db } from '~/lib/db';
import { workspaceBuilds, workspaceBuildStages } from '~/lib/db/schema';
import {
  BUILD_STAGES,
  LEASE_DURATION_MS,
  type BuildState,
  type BuildStatus,
  type StageKey,
  type StageStatus,
} from './stages';

export async function ensureBuild(workspaceId: string) {
  await db.insert(workspaceBuilds).values({ workspaceId }).onConflictDoNothing();

  const build = await db.query.workspaceBuilds.findFirst({
    where: (b, { eq }) => eq(b.workspaceId, workspaceId),
  });

  if (!build) {
    throw new Error('Failed to initialise workspace build');
  }

  await db
    .insert(workspaceBuildStages)
    .values(
      BUILD_STAGES.map((stage, position) => ({
        buildId: build.id,
        workspaceId,
        stageKey: stage.key,
        position,
      })),
    )
    .onConflictDoNothing();

  return build;
}

export async function claimLease(workspaceId: string, owner: string) {
  const now = new Date();
  const claimed = await db
    .update(workspaceBuilds)
    .set({
      leaseOwner: owner,
      leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
      status: 'running',
      startedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(workspaceBuilds.workspaceId, workspaceId),
        ne(workspaceBuilds.status, 'completed'),
        or(isNull(workspaceBuilds.leaseExpiresAt), lt(workspaceBuilds.leaseExpiresAt, now)),
      ),
    )
    .returning();

  return claimed[0] ?? null;
}

export async function renewLease(workspaceId: string, owner: string) {
  await db
    .update(workspaceBuilds)
    .set({ leaseExpiresAt: new Date(Date.now() + LEASE_DURATION_MS), updatedAt: new Date() })
    .where(and(eq(workspaceBuilds.workspaceId, workspaceId), eq(workspaceBuilds.leaseOwner, owner)));
}

export async function finishBuild(
  workspaceId: string,
  status: BuildStatus,
  patch: { error?: string | null; lastSuccessfulStage?: StageKey | null; currentStage?: StageKey | null } = {},
) {
  await db
    .update(workspaceBuilds)
    .set({
      status,
      errorMessage: patch.error ?? null,
      currentStage: patch.currentStage ?? null,
      ...(patch.lastSuccessfulStage ? { lastSuccessfulStage: patch.lastSuccessfulStage } : {}),
      completedAt: status === 'completed' ? new Date() : null,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaceBuilds.workspaceId, workspaceId));
}

export async function setCurrentStage(workspaceId: string, stage: StageKey) {
  await db
    .update(workspaceBuilds)
    .set({ currentStage: stage, updatedAt: new Date() })
    .where(eq(workspaceBuilds.workspaceId, workspaceId));
}

export async function setStageStatus(
  buildId: string,
  stage: StageKey,
  status: StageStatus,
  patch: { error?: string | null; result?: unknown; incrementAttempts?: boolean } = {},
) {
  const current = await db.query.workspaceBuildStages.findFirst({
    where: (s, { and, eq }) => and(eq(s.buildId, buildId), eq(s.stageKey, stage)),
  });

  await db
    .update(workspaceBuildStages)
    .set({
      status,
      attempts: (current?.attempts ?? 0) + (patch.incrementAttempts ? 1 : 0),
      errorMessage: patch.error ?? null,
      ...(patch.result !== undefined ? { result: patch.result } : {}),
      startedAt: status === 'running' ? new Date() : current?.startedAt,
      completedAt: status === 'completed' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(workspaceBuildStages.buildId, buildId), eq(workspaceBuildStages.stageKey, stage)));
}

export async function resetFailedStages(buildId: string) {
  await db
    .update(workspaceBuildStages)
    .set({ status: 'pending', errorMessage: null, attempts: 0, updatedAt: new Date() })
    .where(and(eq(workspaceBuildStages.buildId, buildId), eq(workspaceBuildStages.status, 'failed')));
}

export async function getStageRows(buildId: string) {
  return db.query.workspaceBuildStages.findMany({
    where: (s, { eq }) => eq(s.buildId, buildId),
    orderBy: [asc(workspaceBuildStages.position)],
  });
}

export async function getBuildState(workspaceId: string): Promise<BuildState | null> {
  const build = await db.query.workspaceBuilds.findFirst({
    where: (b, { eq }) => eq(b.workspaceId, workspaceId),
  });

  if (!build) {
    return null;
  }

  const rows = await getStageRows(build.id);
  const byKey = new Map(rows.map((row) => [row.stageKey, row]));

  return {
    workspaceId,
    status: build.status as BuildStatus,
    currentStage: build.currentStage as StageKey | null,
    lastSuccessfulStage: build.lastSuccessfulStage as StageKey | null,
    retryCount: build.retryCount,
    error: build.errorMessage,
    completedAt: build.completedAt?.toISOString() ?? null,
    stages: BUILD_STAGES.map((stage) => {
      const row = byKey.get(stage.key);

      return {
        key: stage.key,
        label: stage.label,
        status: (row?.status as StageStatus) ?? 'pending',
        attempts: row?.attempts ?? 0,
        error: row?.errorMessage ?? null,
      };
    }),
  };
}
