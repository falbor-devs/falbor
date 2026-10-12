import { createHash } from 'crypto';
import { z } from 'zod';
import { db } from '~/lib/db';
import { buyerQuestions } from '~/lib/db/schema';
import { orchestrate } from '../models';
import type { StageHandler } from './types';

const QUESTION_COUNT = 16;

const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        category: z.enum(['discovery', 'alternative', 'comparison', 'problem', 'high_intent', 'audience', 'understanding']),
        intent: z.enum(['low', 'medium', 'high']),
        audience: z.string().nullable(),
        rationale: z.string(),
      }),
    )
    .min(8)
    .max(24),
});

const hashQuestion = (question: string) =>
  createHash('sha256').update(question.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex');

export const generateQuestions: StageHandler = async ({ workspaceId, buildId }) => {
  const existing = await db.query.buyerQuestions.findMany({ where: (q, { eq }) => eq(q.workspaceId, workspaceId) });

  if (existing.length > 0) {
    return { generated: 0, total: existing.length };
  }

  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });

  if (!profile) {
    throw new Error('Product profile missing');
  }

  const { questions } = await orchestrate(
    questionsSchema,
    `Simulate how real potential customers ask an AI assistant to find software. Produce about ${QUESTION_COUNT} diverse, high-signal questions for this product.
Cover discovery, alternatives to named competitors, comparisons, problem-based, high-intent (category + specific ICP or budget), audience-specific, and a few that test whether an AI understands this exact product.
Never mention the product name in discovery, alternative, problem, high-intent or audience questions. Use the product name only in comparison and understanding questions.
Do not pad with near-duplicates.

Product: ${profile.productName}
Summary: ${profile.summary}
Category: ${profile.category}
ICP: ${profile.icp}
Problem: ${profile.problem}
Pricing: ${profile.pricing ?? 'unknown'}
Use cases: ${JSON.stringify(profile.useCases)}
Competitors: ${JSON.stringify(profile.knownCompetitors)}`,
  );

  const unique = new Map(questions.map((q) => [hashQuestion(q.question), q]));

  await db
    .insert(buyerQuestions)
    .values(
      [...unique.entries()].map(([questionHash, q]) => ({
        workspaceId,
        buildId,
        questionHash,
        question: q.question,
        category: q.category,
        intent: q.intent,
        audience: q.audience,
        rationale: q.rationale,
      })),
    )
    .onConflictDoNothing();

  return { generated: unique.size };
};
