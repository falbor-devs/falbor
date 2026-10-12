import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { workspaceMetricSnapshots } from '~/lib/db/schema';
import { orchestrate } from '../models';
import { loadWorkspaceFacts } from './metrics';
import type { StageHandler } from './types';

const FIELDS = ['pricing', 'availability', 'targetAudience', 'category', 'integrations'] as const;

const conflictSchema = z.object({
  conflicts: z.array(
    z.object({
      field: z.enum(FIELDS),
      conflicting: z.boolean(),
      values: z.array(z.object({ provider: z.string(), value: z.string() })),
      reliableValue: z.string().nullable(),
      recommendation: z.string(),
    }),
  ),
});

export const analyzeSources: StageHandler = async ({ workspaceId, buildId }) => {
  const { analyses, runs, sources, answers } = await loadWorkspaceFacts(workspaceId);
  const providerByAnalysis = new Map(answers.map((a) => [a.analysisId, a.provider]));

  const domains = new Map<
    string,
    { domain: string; mentions: number; providers: Set<string>; types: Set<string>; firstParty: boolean; community: boolean; discussesProduct: number; discussesProblem: number; withCompetitors: number }
  >();

  for (const source of sources) {
    const entry = domains.get(source.domain) ?? {
      domain: source.domain,
      mentions: 0,
      providers: new Set<string>(),
      types: new Set<string>(),
      firstParty: source.isFirstParty,
      community: source.isCommunity,
      discussesProduct: 0,
      discussesProblem: 0,
      withCompetitors: 0,
    };

    entry.mentions += 1;
    entry.providers.add(providerByAnalysis.get(source.analysisId) ?? 'unknown');
    entry.types.add(source.sourceType);
    entry.discussesProduct += source.discussesProduct ? 1 : 0;
    entry.discussesProblem += source.discussesProblem ? 1 : 0;
    entry.withCompetitors += source.mentionsCompetitors ? 1 : 0;
    domains.set(source.domain, entry);
  }

  const sourceSummary = [...domains.values()]
    .map((d) => ({
      domain: d.domain,
      mentions: d.mentions,
      providers: [...d.providers],
      types: [...d.types],
      isFirstParty: d.firstParty,
      isCommunity: d.community,
      discussesProduct: d.discussesProduct,
      discussesProblem: d.discussesProblem,
      mentionsCompetitors: d.withCompetitors,
      influencesMultipleModels: d.providers.size > 1,
    }))
    .sort((a, b) => b.providers.length - a.providers.length || b.mentions - a.mentions)
    .slice(0, 30);

  const claimsByField = FIELDS.map((field) => ({
    field,
    claims: analyses.flatMap((analysis) => {
      const claims = (analysis.recognition as { claims?: Record<string, string | null> } | null)?.claims;
      const value = claims?.[field];
      const run = runs.find((r) => r.id === analysis.modelRunId);

      return value && run ? [{ provider: run.provider, value }] : [];
    }),
  })).filter((entry) => new Set(entry.claims.map((c) => c.provider)).size > 1);

  let conflicts: z.infer<typeof conflictSchema>['conflicts'] = [];

  if (claimsByField.length > 0) {
    const profile = await db.query.workspaceProductProfiles.findFirst({
      where: (p, { eq }) => eq(p.workspaceId, workspaceId),
    });

    const result = await orchestrate(
      conflictSchema,
      `Several AI models made claims about a product. For each field decide whether the models genuinely contradict each other (ignore wording differences). Prefer the product's own profile as the reliable value when it covers the field; otherwise return null. Recommend a concrete fix only when a real conflict exists.

Product profile (first-party truth):
${JSON.stringify({ pricing: profile?.pricing, category: profile?.category, icp: profile?.icp, maturity: profile?.maturity })}

Claims:
${JSON.stringify(claimsByField)}`,
    );

    conflicts = result.conflicts.filter((c) => c.conflicting);
  }

  const snapshot = await db.query.workspaceMetricSnapshots.findFirst({ where: (s, { eq }) => eq(s.buildId, buildId) });

  if (!snapshot) {
    throw new Error('Metric snapshot missing');
  }

  await db
    .update(workspaceMetricSnapshots)
    .set({ breakdown: { ...(snapshot.breakdown as object), sources: sourceSummary, factConflicts: conflicts } })
    .where(eq(workspaceMetricSnapshots.id, snapshot.id));

  return { domains: sourceSummary.length, conflicts: conflicts.length };
};
