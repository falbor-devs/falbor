import { eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { questionCriticality, workspaceMetricSnapshots } from '~/lib/db/schema';
import { getAvailableProviders } from '../models';
import {
  computeAveragePosition,
  computeCriticality,
  computeProductUnderstanding,
  computeShareOfVoice,
  computeVisibility,
  type AnswerFacts,
} from '../calculations';
import type { StageHandler } from './types';

export async function loadWorkspaceFacts(workspaceId: string) {
  const [runs, analyses, brands, sources, questions] = await Promise.all([
    db.query.modelRuns.findMany({ where: (r, { eq }) => eq(r.workspaceId, workspaceId) }),
    db.query.aiAnswerAnalyses.findMany({ where: (a, { eq }) => eq(a.workspaceId, workspaceId) }),
    db.query.aiAnswerBrands.findMany({ where: (b, { eq }) => eq(b.workspaceId, workspaceId) }),
    db.query.aiAnswerSources.findMany({ where: (s, { eq }) => eq(s.workspaceId, workspaceId) }),
    db.query.buyerQuestions.findMany({ where: (q, { eq }) => eq(q.workspaceId, workspaceId) }),
  ]);

  const runById = new Map(runs.map((r) => [r.id, r]));

  const answers: (AnswerFacts & { analysisId: string })[] = analyses.flatMap((analysis) => {
    const run = runById.get(analysis.modelRunId);

    if (!run) {
      return [];
    }

    const answerBrands = brands.filter((b) => b.analysisId === analysis.id);
    const competitors = answerBrands.filter((b) => !b.isUserProduct);

    return [
      {
        analysisId: analysis.id,
        questionId: run.questionId,
        provider: run.provider,
        mentioned: analysis.productMentioned,
        recommended: analysis.productRecommended,
        position: analysis.productPosition,
        descriptionAccurate: analysis.descriptionAccurate,
        pricingAccurate: analysis.pricingAccurate,
        statusAccurate: analysis.statusAccurate,
        misunderstands: analysis.misunderstandsProduct,
        competitorCount: competitors.length,
        competitorsAhead: analysis.productPosition === null
          ? competitors.length
          : competitors.filter((c) => c.position < (analysis.productPosition as number)).length,
        communitySources: sources.filter((s) => s.analysisId === analysis.id && s.isCommunity).length,
      },
    ];
  });

  return { runs, analyses, brands, sources, questions, answers };
}

import { z } from 'zod';
import { orchestrate } from '../models';
import { workspaceCompetitorProfiles } from '~/lib/db/schema';

const competitorProfileSchema = z.object({
  hasEvidence: z.boolean(),
  positioning: z.object({
    category: z.string(),
    targetAudience: z.string(),
    primaryProblem: z.string(),
    corePromise: z.string(),
    differentiators: z.array(z.string()),
  }),
  pricing: z.object({
    startingPrice: z.string(),
    plans: z.array(z.object({ name: z.string(), price: z.string(), limits: z.string() })),
    evidenceSource: z.string().nullable(),
  }),
  features: z.array(z.object({ name: z.string(), available: z.boolean(), note: z.string().optional() })),
  audience: z.object({
    icp: z.string(),
    companySize: z.string(),
    industry: z.string(),
    overlapPct: z.number(),
  }),
  whyRecommends: z.array(z.object({ factor: z.string(), score: z.number(), explanation: z.string() })),
  headToHead: z.object({
    whyTheyWin: z.string(),
    whatWeShouldImprove: z.string(),
    metrics: z.array(z.object({ area: z.string(), ourValue: z.string(), competitorValue: z.string(), winner: z.enum(['us', 'competitor', 'tie']) })),
  }),
  sources: z.array(z.object({ name: z.string(), domain: z.string().nullable(), type: z.enum(['review', 'community', 'first_party', 'media', 'search']), authority: z.number(), reasons: z.array(z.string()), influencesCompetitors: z.array(z.string()) })),
  newContent: z.array(z.object({ title: z.string(), type: z.string(), url: z.string(), whatChanged: z.string(), whyItMatters: z.string(), ourOpportunity: z.string(), date: z.string() })),
  messagingChanges: z.array(z.object({ area: z.string(), previous: z.string(), current: z.string(), impact: z.string() })),
  communityPresence: z.array(z.object({ platform: z.string(), mentionsCount: z.number(), sentiment: z.enum(['positive', 'neutral', 'mixed']), opportunity: z.string(), link: z.string().optional() })),
  ads: z.object({ activeAdsCount: z.number(), platforms: z.array(z.string()), messagingTheme: z.string(), topOffer: z.string() }),
  timelineEvents: z.array(z.object({ date: z.string(), title: z.string(), whatChanged: z.string(), evidence: z.string(), whyItMatters: z.string() })),
});

export const analyzeCompetitors: StageHandler = async ({ workspaceId, buildId }) => {
  const { analyses, brands, questions, answers } = await loadWorkspaceFacts(workspaceId);

  if (answers.length === 0) {
    throw new Error('No analysed answers available');
  }

  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });

  const providerCount = new Set(answers.map((a) => a.provider)).size || getAvailableProviders().length;
  const userMentions = brands.filter((b) => b.isUserProduct).length;
  const competitorBrands = brands.filter((b) => !b.isUserProduct);

  const competitors = new Map<string, { name: string; domain: string | null; mentions: number; providers: Set<string>; wins: number; reasons: Set<string> }>();
  const providerByAnalysis = new Map(answers.map((a) => [a.analysisId, a.provider]));
  const topByAnalysis = new Map<string, string>();

  for (const brand of brands) {
    const best = topByAnalysis.get(brand.analysisId);
    const current = brands.find((b) => b.analysisId === brand.analysisId && b.brandName === best);

    if (!best || brand.position < (current?.position ?? Infinity)) {
      topByAnalysis.set(brand.analysisId, brand.brandName);
    }
  }

  for (const brand of competitorBrands) {
    const key = brand.brandName.toLowerCase();
    const entry = competitors.get(key) ?? { name: brand.brandName, domain: brand.domain, mentions: 0, providers: new Set<string>(), wins: 0, reasons: new Set<string>() };
    entry.mentions += 1;
    if (brand.reason) entry.reasons.add(brand.reason);
    entry.providers.add(providerByAnalysis.get(brand.analysisId) ?? 'unknown');
    competitors.set(key, entry);
  }

  for (const [analysisId, top] of topByAnalysis) {
    const entry = competitors.get(top.toLowerCase());

    if (entry && providerByAnalysis.has(analysisId)) {
      entry.wins += 1;
    }
  }

  const totalMentions = userMentions + competitorBrands.length;
  const topCompetitorsList = [...competitors.values()]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  // Independently analyze and persist rich profile for each discovered competitor
  for (const comp of topCompetitorsList) {
    try {
      const prompt = `Analyze this competitor strictly based on factual workspace evidence.
Product Name: ${profile?.productName || 'Our Product'}
Category: ${profile?.category || 'SaaS'}
Target Audience: ${profile?.icp || 'Buyers'}

Competitor: ${comp.name}
Domain: ${comp.domain || 'unknown'}
Observed AI Reasons: ${JSON.stringify([...comp.reasons])}

Produce detailed, competitor-specific intelligence JSON for:
- whyRecommends
- headToHead
- sources
- positioning
- pricing
- features
- audience
- newContent
- messagingChanges
- communityPresence
- ads
- timelineEvents

If there is insufficient evidence for pricing, features, ads, or content, set hasEvidence to false or leave arrays empty without fabricating facts.`;

      const aiProfile = await orchestrate(competitorProfileSchema, prompt);

      await db
        .insert(workspaceCompetitorProfiles)
        .values({
          workspaceId,
          brandName: comp.name,
          domain: comp.domain,
          positioning: aiProfile.positioning,
          pricing: aiProfile.pricing,
          features: aiProfile.features,
          audience: aiProfile.audience,
          whyRecommends: aiProfile.whyRecommends,
          headToHead: aiProfile.headToHead,
          sources: aiProfile.sources,
          newContent: aiProfile.newContent,
          messagingChanges: aiProfile.messagingChanges,
          communityPresence: aiProfile.communityPresence,
          ads: aiProfile.ads,
          timelineEvents: aiProfile.timelineEvents,
          hasEvidence: aiProfile.hasEvidence,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [workspaceCompetitorProfiles.workspaceId, workspaceCompetitorProfiles.brandName],
          set: {
            domain: comp.domain,
            positioning: aiProfile.positioning,
            pricing: aiProfile.pricing,
            features: aiProfile.features,
            audience: aiProfile.audience,
            whyRecommends: aiProfile.whyRecommends,
            headToHead: aiProfile.headToHead,
            sources: aiProfile.sources,
            newContent: aiProfile.newContent,
            messagingChanges: aiProfile.messagingChanges,
            communityPresence: aiProfile.communityPresence,
            ads: aiProfile.ads,
            timelineEvents: aiProfile.timelineEvents,
            hasEvidence: aiProfile.hasEvidence,
            updatedAt: new Date(),
          },
        });
    } catch (e) {
      console.error(`[workspace-build] Competitor profile analysis failed for ${comp.name}:`, e);
    }
  }

  const topCompetitors = topCompetitorsList.map((c) => ({
    name: c.name,
    domain: c.domain,
    mentions: c.mentions,
    shareOfVoice: computeShareOfVoice(c.mentions, totalMentions),
    answerShare: c.mentions / answers.length,
    providers: [...c.providers],
    topRankedCount: c.wins,
  }));

  const existing = await db.query.workspaceMetricSnapshots.findFirst({
    where: (s, { eq }) => eq(s.buildId, buildId),
  });

  const values = {
    workspaceId,
    buildId,
    visibility: computeVisibility(answers),
    shareOfVoice: computeShareOfVoice(userMentions, totalMentions),
    averagePosition: computeAveragePosition(answers),
    productUnderstanding: computeProductUnderstanding(answers),
    answersCount: answers.length,
    breakdown: {
      competitors: topCompetitors,
      byProvider: Object.fromEntries(
        [...new Set(answers.map((a) => a.provider))].map((provider) => {
          const subset = answers.filter((a) => a.provider === provider);

          return [provider, { visibility: computeVisibility(subset), averagePosition: computeAveragePosition(subset), answers: subset.length }];
        }),
      ),
      recommendedAnswers: answers.filter((a) => a.recommended).length,
      totalAnalyses: analyses.length,
    },
  };

  if (existing) {
    await db
      .update(workspaceMetricSnapshots)
      .set({ ...values, breakdown: { ...(existing.breakdown as object), ...values.breakdown } })
      .where(eq(workspaceMetricSnapshots.id, existing.id));
  } else {
    await db.insert(workspaceMetricSnapshots).values(values);
  }

  for (const question of questions) {
    const subset = answers.filter((a) => a.questionId === question.id);
    const result = computeCriticality({ id: question.id, intent: question.intent as 'low' | 'medium' | 'high' }, subset, providerCount);

    if (!result) {
      continue;
    }

    await db
      .insert(questionCriticality)
      .values({ workspaceId, questionId: question.id, ...result })
      .onConflictDoUpdate({
        target: questionCriticality.questionId,
        set: { ...result, updatedAt: new Date() },
      });
  }

  return { competitors: topCompetitors.length, questionsScored: questions.length };
};
