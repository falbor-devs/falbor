import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { acquisitionOpportunities } from '~/lib/db/schema';
import { orchestrate } from '../models';
import { computePriority } from '../calculations';
import { loadWorkspaceFacts } from './metrics';
import type { StageHandler } from './types';

const score = z.number().min(0).max(1);

const opportunitiesSchema = z.object({
  opportunities: z
    .array(
      z.object({
        title: z.string(),
        horizon: z.enum(['quick', 'medium', 'long']),
        channel: z.string(),
        observedEvidence: z.array(z.string()).min(1).describe('Facts taken verbatim from the provided data only'),
        recommendation: z.string(),
        expectedOutcome: z.string().describe('Qualitative only; never promise a user count'),
        measurement: z.string(),
        reach: score,
        intent: score,
        icpRelevance: score,
        competitiveGap: score,
        effort: score,
        confidence: score,
        relatedQuestionIds: z.array(z.string()),
      }),
    )
    .min(1)
    .max(10),
});

export const findOpportunities: StageHandler = async ({ workspaceId, buildId }) => {
  const existing = await db.query.acquisitionOpportunities.findFirst({
    where: (o, { eq }) => eq(o.buildId, buildId),
  });

  if (existing) {
    return { reused: true };
  }

  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });

  const snapshot = await db.query.workspaceMetricSnapshots.findFirst({ where: (s, { eq }) => eq(s.buildId, buildId) });
  const criticality = await db.query.questionCriticality.findMany({
    where: (c, { eq }) => eq(c.workspaceId, workspaceId),
    orderBy: (c, { desc }) => [desc(c.score)],
    limit: 8,
  });
  const { questions, answers } = await loadWorkspaceFacts(workspaceId);

  if (!profile || !snapshot) {
    throw new Error('Workspace analysis incomplete');
  }

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const gaps = criticality.map((c) => ({
    questionId: c.questionId,
    question: questionById.get(c.questionId)?.question,
    criticality: c.score,
    level: c.level,
    modelsMentioningProduct: answers.filter((a) => a.questionId === c.questionId && a.mentioned).length,
    modelsAnswered: answers.filter((a) => a.questionId === c.questionId).length,
  }));

  const { opportunities } = await orchestrate(
    opportunitiesSchema,
    `Identify real user-acquisition opportunities for this product. Visibility is not acquisition; connect observed AI-answer evidence to concrete actions.
Rules:
- Every observedEvidence entry must be a fact present in the data below. Do not invent threads, pages or numbers.
- Do not suggest generic actions such as "write more blog posts" unless tied to a specific gap above.
- Separate quick wins (days), medium (weeks), long (months).
- If conversionBlockers exist, include an opportunity that fixes them before driving traffic.
- Never promise a number of users.

Product: ${JSON.stringify({ name: profile.productName, category: profile.category, icp: profile.icp, problem: profile.problem, positioning: profile.positioning })}
Conversion blockers: ${JSON.stringify(profile.conversionBlockers)}
Metrics: ${JSON.stringify({ visibility: snapshot.visibility, shareOfVoice: snapshot.shareOfVoice, averagePosition: snapshot.averagePosition, productUnderstanding: snapshot.productUnderstanding })}
Breakdown: ${JSON.stringify(snapshot.breakdown)}
Highest-criticality gaps: ${JSON.stringify(gaps)}`,
  );

  const validQuestionIds = new Set(questions.map((q) => q.id));

  await db.insert(acquisitionOpportunities).values(
    opportunities.map((o) => ({
      workspaceId,
      buildId,
      title: o.title,
      horizon: o.horizon,
      channel: o.channel,
      observedEvidence: o.observedEvidence,
      recommendation: o.recommendation,
      expectedOutcome: o.expectedOutcome,
      measurement: o.measurement,
      reach: o.reach,
      intent: o.intent,
      icpRelevance: o.icpRelevance,
      competitiveGap: o.competitiveGap,
      effort: o.effort,
      confidence: o.confidence,
      priorityScore: 0,
      relatedQuestionIds: o.relatedQuestionIds.filter((id) => validQuestionIds.has(id)),
    })),
  );

  return { created: opportunities.length };
};

export const buildGrowthPlan: StageHandler = async ({ workspaceId, buildId }) => {
  const rows = await db.query.acquisitionOpportunities.findMany({
    where: (o, { and, eq }) => and(eq(o.workspaceId, workspaceId), eq(o.buildId, buildId)),
  });

  for (const row of rows) {
    await db
      .update(acquisitionOpportunities)
      .set({ priorityScore: computePriority(row) })
      .where(and(eq(acquisitionOpportunities.id, row.id), eq(acquisitionOpportunities.workspaceId, workspaceId)));
  }

  return { prioritised: rows.length };
};
