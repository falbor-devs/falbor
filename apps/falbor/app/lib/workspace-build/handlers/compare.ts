import { z } from 'zod';
import { db } from '~/lib/db';
import { aiAnswerAnalyses, aiAnswerBrands, aiAnswerSources, modelRuns } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { orchestrate } from '../models';
import { runWithConcurrency } from '../concurrency';
import type { StageHandler } from './types';

const CONCURRENCY = 4;

const SOURCE_TYPES = [
  'first_party',
  'review_site',
  'comparison_article',
  'community',
  'news',
  'documentation',
  'directory',
  'blog',
  'social_media',
  'forum',
  'other',
] as const;

const extractionSchema = z.object({
  productMentioned: z.boolean(),
  productRecommended: z.boolean(),
  productPosition: z.number().int().nullable().describe('1-based rank among recommended brands, null if not mentioned'),
  describedProduct: z.string().nullable(),
  descriptionAccurate: z.boolean().nullable(),
  pricingAccurate: z.boolean().nullable(),
  statusAccurate: z.boolean().nullable(),
  attributedFeatures: z.array(z.string()),
  misunderstandsProduct: z.boolean(),
  recognition: z.object({
    brandRecognised: z.boolean(),
    categoryRecognised: z.boolean(),
    problemAssociated: z.boolean(),
    audienceAssociated: z.boolean(),
    recommendationLikely: z.boolean(),
    preferredOverProduct: z.string().nullable(),
    claims: z.object({
      pricing: z.string().nullable(),
      availability: z.string().nullable(),
      targetAudience: z.string().nullable(),
      category: z.string().nullable(),
      integrations: z.string().nullable(),
    }),
  }),
  brands: z.array(
    z.object({
      name: z.string(),
      domain: z.string().nullable(),
      position: z.number().int(),
      isUserProduct: z.boolean(),
      reason: z.string().nullable(),
    }),
  ),
  sources: z.array(
    z.object({
      domain: z.string(),
      url: z.string().nullable(),
      sourceType: z.string().describe("Source type, e.g., 'first_party', 'review_site', 'community', 'blog', 'news', 'documentation', 'directory', 'other'"),
      discussesProduct: z.boolean(),
      discussesProblem: z.boolean(),
      mentionsCompetitors: z.boolean(),
      isCurrent: z.boolean().nullable(),
    }),
  ),
});

function normaliseDomain(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();
}

export const compareResponses: StageHandler = async ({ workspaceId }) => {
  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });

  if (!profile) {
    throw new Error('Product profile missing');
  }

  const runs = await db.query.modelRuns.findMany({ where: (r, { eq }) => eq(r.workspaceId, workspaceId) });
  const questions = await db.query.buyerQuestions.findMany({ where: (q, { eq }) => eq(q.workspaceId, workspaceId) });
  const questionText = new Map(questions.map((q) => [q.id, q.question]));
  const productDomain = profile.domain ? normaliseDomain(profile.domain) : null;
  const pending = runs.filter((r) => r.status === 'completed' && r.analysisStatus !== 'completed' && r.rawResponse);

  await runWithConcurrency(pending, CONCURRENCY, async (run) => {
    try {
      const extracted = await orchestrate(
        extractionSchema,
        `Analyse this AI assistant answer to a buyer question. Report only what the answer says. Judge accuracy strictly against the ground truth profile; use null when the answer says nothing about that aspect.

Ground truth profile:
Name: ${profile.productName}
Domain: ${profile.domain ?? 'unknown'}
Summary: ${profile.summary}
Category: ${profile.category}
ICP: ${profile.icp}
Pricing: ${profile.pricing ?? 'unknown'}
Maturity: ${profile.maturity ?? 'unknown'}
Features: ${JSON.stringify(profile.features)}

Question: ${questionText.get(run.questionId)}

Answer (${run.provider}):
${run.rawResponse}`,
      );

      const [analysis] = await db
        .insert(aiAnswerAnalyses)
        .values({
          workspaceId,
          modelRunId: run.id,
          productMentioned: extracted.productMentioned,
          productRecommended: extracted.productRecommended,
          productPosition: extracted.productMentioned ? extracted.productPosition : null,
          describedProduct: extracted.describedProduct,
          descriptionAccurate: extracted.descriptionAccurate,
          pricingAccurate: extracted.pricingAccurate,
          statusAccurate: extracted.statusAccurate,
          attributedFeatures: extracted.attributedFeatures,
          misunderstandsProduct: extracted.misunderstandsProduct,
          recognition: extracted.recognition,
        })
        .onConflictDoNothing()
        .returning();

      if (analysis) {
        if (extracted.brands.length > 0) {
          await db.insert(aiAnswerBrands).values(
            extracted.brands.map((b) => ({
              workspaceId,
              analysisId: analysis.id,
              brandName: b.name,
              domain: b.domain ? normaliseDomain(b.domain) : null,
              position: b.position,
              isUserProduct: b.isUserProduct,
              reason: b.reason,
            })),
          );
        }

        if (extracted.sources.length > 0) {
          await db.insert(aiAnswerSources).values(
            extracted.sources.map((s) => {
              const domain = normaliseDomain(s.domain);
              const isFirstParty = productDomain !== null && (domain === productDomain || domain.endsWith(`.${productDomain}`));

              return {
                workspaceId,
                analysisId: analysis.id,
                domain,
                url: s.url,
                sourceType: isFirstParty ? 'first_party' : s.sourceType,
                isFirstParty,
                isCommunity: s.sourceType === 'community',
                discussesProduct: s.discussesProduct,
                discussesProblem: s.discussesProblem,
                mentionsCompetitors: s.mentionsCompetitors,
                isCurrent: s.isCurrent,
              };
            }),
          );
        }
      }

      await db.update(modelRuns).set({ analysisStatus: 'completed' }).where(eq(modelRuns.id, run.id));
    } catch (err) {
      console.error(`[workspace-build] Model run analysis failed for run ${run.id}:`, err);
      await db.update(modelRuns).set({ analysisStatus: 'failed' }).where(eq(modelRuns.id, run.id));
    }
  });

  const after = await db.query.modelRuns.findMany({ where: (r, { eq }) => eq(r.workspaceId, workspaceId) });
  const analysed = after.filter((r) => r.analysisStatus === 'completed').length;
  const failed = after.filter((r) => r.status === 'completed' && r.analysisStatus === 'failed').length;

  if (analysed === 0) {
    throw new Error('No model answers could be analysed');
  }

  if (failed > 0 && analysed < Math.ceil(after.length * 0.5)) {
    throw new Error(`${failed} out of ${after.length} answers failed analysis and need retry`);
  }

  return { analysed, failed };
};
