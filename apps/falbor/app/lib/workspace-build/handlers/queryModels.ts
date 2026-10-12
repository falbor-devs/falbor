import { and, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { modelRuns } from '~/lib/db/schema';
import { askModel, getAvailableProviders, type ProviderId } from '../models';
import { runWithConcurrency, errorMessage } from '../concurrency';
import { MAX_STAGE_ATTEMPTS } from '../stages';
import type { StageHandler } from './types';

const CONCURRENCY = 4;
const SOURCES_SUFFIX = '\n\nIf you rely on specific websites, articles, reviews or communities for your recommendations, list them with their domains at the end.';

export const queryModels: StageHandler = async ({ workspaceId }) => {
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    throw new Error('No AI provider API keys are configured on the server');
  }

  const questions = await db.query.buyerQuestions.findMany({ where: (q, { eq }) => eq(q.workspaceId, workspaceId) });

  if (questions.length === 0) {
    throw new Error('No buyer questions to run');
  }

  await db
    .insert(modelRuns)
    .values(
      questions.flatMap((q) =>
        providers.map((p) => ({ workspaceId, questionId: q.id, provider: p.id, model: p.model })),
      ),
    )
    .onConflictDoNothing();

  const runs = await db.query.modelRuns.findMany({ where: (r, { eq }) => eq(r.workspaceId, workspaceId) });
  const promptByQuestion = new Map(questions.map((q) => [q.id, q.question]));
  const todo = runs.filter((r) => r.status !== 'completed' && r.attempts < MAX_STAGE_ATTEMPTS);

  await runWithConcurrency(todo, CONCURRENCY, async (run) => {
    const startedAt = new Date();

    try {
      const { text, latencyMs } = await askModel(
        run.provider as ProviderId,
        `${promptByQuestion.get(run.questionId)}${SOURCES_SUFFIX}`,
      );

      await db
        .update(modelRuns)
        .set({ status: 'completed', rawResponse: text, latencyMs, errorMessage: null, attempts: run.attempts + 1, updatedAt: startedAt })
        .where(eq(modelRuns.id, run.id));
    } catch (error) {
      await db
        .update(modelRuns)
        .set({ status: 'failed', errorMessage: errorMessage(error), attempts: run.attempts + 1, updatedAt: startedAt })
        .where(eq(modelRuns.id, run.id));
    }
  });

  const finalRuns = await db.query.modelRuns.findMany({ where: (r, { eq }) => eq(r.workspaceId, workspaceId) });
  const completed = finalRuns.filter((r) => r.status === 'completed');
  const retryable = finalRuns.filter((r) => r.status !== 'completed' && r.attempts < MAX_STAGE_ATTEMPTS);

  if (completed.length === 0) {
    throw new Error('Every model call failed');
  }

  if (retryable.length > 0) {
    throw new Error(`${retryable.length} model calls still need to be retried`);
  }

  return { completed: completed.length, failed: finalRuns.length - completed.length };
};

export async function resetExhaustedRuns(workspaceId: string) {
  await db
    .update(modelRuns)
    .set({ attempts: 0, status: 'pending', errorMessage: null })
    .where(and(eq(modelRuns.workspaceId, workspaceId), eq(modelRuns.status, 'failed')));
}
