import { randomUUID } from 'crypto';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import { db } from '~/lib/db';
import { workspaceBuilds } from '~/lib/db/schema';
import { errorMessage } from './concurrency';
import { compareResponses } from './handlers/compare';
import { analyzeCompetitors } from './handlers/metrics';
import { buildGrowthPlan, findOpportunities } from './handlers/opportunities';
import { updateWorkspace } from './handlers/pages';
import { scanProduct, understandMarket } from './handlers/profile';
import { generateQuestions } from './handlers/questions';
import { queryModels, resetExhaustedRuns } from './handlers/queryModels';
import { analyzeSources } from './handlers/sources';
import type { StageHandler } from './handlers/types';
import { BUILD_STAGES, MAX_STAGE_ATTEMPTS, type StageKey } from './stages';
import {
  claimLease,
  ensureBuild,
  finishBuild,
  getStageRows,
  renewLease,
  resetFailedStages,
  setCurrentStage,
  setStageStatus,
} from './state';

const HANDLERS: Record<StageKey, StageHandler> = {
  scan_product: scanProduct,
  understand_market: understandMarket,
  generate_questions: generateQuestions,
  query_models: queryModels,
  compare_responses: compareResponses,
  analyze_competitors: analyzeCompetitors,
  analyze_sources: analyzeSources,
  find_opportunities: findOpportunities,
  build_growth_plan: buildGrowthPlan,
  update_workspace: updateWorkspace,
};

const LEASE_RENEW_INTERVAL_MS = 60_000;
const RETRY_BACKOFF_MS = 3_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runWorkspaceBuild(workspaceId: string) {
  const build = await ensureBuild(workspaceId);
  const owner = randomUUID();
  const claimed = await claimLease(workspaceId, owner);

  if (!claimed) {
    return { started: false };
  }

  const heartbeat = setInterval(() => {
    renewLease(workspaceId, owner).catch(() => undefined);
  }, LEASE_RENEW_INTERVAL_MS);

  let lastSuccessfulStage: StageKey | null = claimed.lastSuccessfulStage as StageKey | null;

  try {
    for (const stage of BUILD_STAGES) {
      let done = false;

      while (!done) {
        const rows = await getStageRows(build.id);
        const row = rows.find((r) => r.stageKey === stage.key);

        if (row?.status === 'completed') {
          done = true;
          continue;
        }

        if ((row?.attempts ?? 0) >= MAX_STAGE_ATTEMPTS) {
          await finishBuild(workspaceId, 'failed', {
            error: row?.errorMessage ?? 'Stage failed',
            currentStage: stage.key,
            lastSuccessfulStage,
          });

          return { started: true, status: 'failed' as const };
        }

        await setCurrentStage(workspaceId, stage.key);
        await setStageStatus(build.id, stage.key, 'running', { incrementAttempts: true });

        try {
          const result = await HANDLERS[stage.key]({ workspaceId, buildId: build.id });
          await setStageStatus(build.id, stage.key, 'completed', { result });
          lastSuccessfulStage = stage.key;
          await db
            .update(workspaceBuilds)
            .set({ lastSuccessfulStage: stage.key, updatedAt: new Date() })
            .where(eq(workspaceBuilds.workspaceId, workspaceId));
          done = true;
        } catch (error) {
          const errStr = errorMessage(error);
          console.error(`[workspace-build] Stage "${stage.key}" failed for workspace ${workspaceId}:`, error);
          await setStageStatus(build.id, stage.key, 'failed', { error: errStr });
          await sleep(RETRY_BACKOFF_MS);
        }
      }
    }

    await finishBuild(workspaceId, 'completed', { lastSuccessfulStage });

    return { started: true, status: 'completed' as const };
  } catch (error) {
    await finishBuild(workspaceId, 'failed', { error: errorMessage(error), lastSuccessfulStage });

    return { started: true, status: 'failed' as const };
  } finally {
    clearInterval(heartbeat);
  }
}

export function triggerWorkspaceBuild(workspaceId: string) {
  runWorkspaceBuild(workspaceId).catch((error) => {
    console.error('Workspace build crashed', workspaceId, error);
  });
}

export async function retryFailedBuild(workspaceId: string) {
  const build = await db.query.workspaceBuilds.findFirst({ where: (b, { eq }) => eq(b.workspaceId, workspaceId) });

  if (!build || build.status !== 'failed') {
    return false;
  }

  await resetFailedStages(build.id);
  await resetExhaustedRuns(workspaceId);
  await db
    .update(workspaceBuilds)
    .set({ status: 'pending', retryCount: build.retryCount + 1, errorMessage: null, updatedAt: new Date() })
    .where(eq(workspaceBuilds.id, build.id));

  triggerWorkspaceBuild(workspaceId);

  return true;
}

export async function resumeStaleBuilds(workspaceId?: string) {
  const now = new Date();
  const stale = await db
    .select({ workspaceId: workspaceBuilds.workspaceId })
    .from(workspaceBuilds)
    .where(
      and(
        inArray(workspaceBuilds.status, ['pending', 'running']),
        or(isNull(workspaceBuilds.leaseExpiresAt), lt(workspaceBuilds.leaseExpiresAt, now)),
        workspaceId ? eq(workspaceBuilds.workspaceId, workspaceId) : undefined,
      ),
    )
    .limit(5);

  stale.forEach((row) => triggerWorkspaceBuild(row.workspaceId));

  return stale.length;
}
