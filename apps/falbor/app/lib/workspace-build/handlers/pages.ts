import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { blogPosts, intelligenceSchema, productDecks, workspaceSources, workspaces } from '~/lib/db/schema';
import { orchestrate } from '../models';
import { errorMessage } from '../concurrency';
import { setStageStatus } from '../state';
import type { StageContext, StageHandler } from './types';

type PageKey = 'context' | 'sources' | 'canvas' | 'blog' | 'deck';

const PLATFORMS = ['Reddit', 'Facebook', 'LinkedIn', 'Twitter', 'ProductHunt', 'HackerNews', 'Directory', 'Contacts', 'Other'] as const;

async function loadGrounding(workspaceId: string) {
  const [workspace, profile, opportunities, criticality, questions, snapshot] = await Promise.all([
    db.query.workspaces.findFirst({ where: (w, { eq }) => eq(w.id, workspaceId) }),
    db.query.workspaceProductProfiles.findFirst({ where: (p, { eq }) => eq(p.workspaceId, workspaceId) }),
    db.query.acquisitionOpportunities.findMany({
      where: (o, { eq }) => eq(o.workspaceId, workspaceId),
      orderBy: (o, { desc }) => [desc(o.priorityScore)],
      limit: 6,
    }),
    db.query.questionCriticality.findMany({
      where: (c, { eq }) => eq(c.workspaceId, workspaceId),
      orderBy: (c, { desc }) => [desc(c.score)],
      limit: 6,
    }),
    db.query.buyerQuestions.findMany({ where: (q, { eq }) => eq(q.workspaceId, workspaceId) }),
    db.query.workspaceMetricSnapshots.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, workspaceId),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    }),
  ]);

  if (!workspace || !profile) {
    throw new Error('Workspace profile missing');
  }

  const questionText = new Map(questions.map((q) => [q.id, q.question]));
  const topGaps = criticality.map((c) => ({ question: questionText.get(c.questionId), criticality: c.score, level: c.level }));

  const summary = JSON.stringify({
    product: {
      name: profile.productName,
      summary: profile.summary,
      category: profile.category,
      icp: profile.icp,
      problem: profile.problem,
      positioning: profile.positioning,
      pricing: profile.pricing,
      features: profile.features,
      competitors: profile.knownCompetitors,
    },
    metrics: snapshot
      ? { visibility: snapshot.visibility, shareOfVoice: snapshot.shareOfVoice, productUnderstanding: snapshot.productUnderstanding }
      : null,
    topGaps,
    opportunities: opportunities.map((o) => ({ title: o.title, horizon: o.horizon, evidence: o.observedEvidence, recommendation: o.recommendation })),
  });

  return { workspace, profile, snapshot, opportunities, topGaps, summary };
}

async function generateContext(workspaceId: string) {
  const { workspace, summary } = await loadGrounding(workspaceId);

  if (workspace.intelligenceData) {
    return;
  }

  const intelligence = await orchestrate(
    intelligenceSchema,
    `Write a skeptical product intelligence report. Base every conclusion on the research data below; mark assumptions as assumptions and never invent traction, users or revenue.

Original onboarding context:
${workspace.contextPrompt ?? 'none'}

Research data:
${summary}`,
  );

  await db.update(workspaces).set({ intelligenceData: intelligence }).where(eq(workspaces.id, workspaceId));
}

const sourcesSchema = z.object({
  sources: z
    .array(
      z.object({
        title: z.string(),
        platform: z.enum(PLATFORMS),
        url: z.string().url(),
        relevanceScore: z.number().min(60).max(99),
        audienceSize: z.string(),
        strategy: z.string(),
      }),
    )
    .min(12)
    .max(30),
});

async function generateSources(workspaceId: string) {
  const { workspace, summary } = await loadGrounding(workspaceId);
  const existing = await db.query.workspaceSources.findFirst({ where: (s, { eq }) => eq(s.workspaceId, workspaceId) });

  if (existing) {
    return;
  }

  const { sources } = await orchestrate(
    sourcesSchema,
    `Find real acquisition sources (communities, groups, directories, people to contact) where this product's ICP is already discussing the problem. Use only real, well-known URLs (reddit.com/r/<sub>, x.com/search?q=, linkedin.com/search/results/all/?keywords=, facebook.com/search/groups/?q=, producthunt.com, betalist.com, news.ycombinator.com). Give an engagement strategy that avoids spam. Prefer places matching the highest-priority opportunities.

Research data:
${summary}`,
  );

  await db.insert(workspaceSources).values(
    sources.map((s) => ({ workspaceId, userId: workspace.userId, ...s, status: 'active' as const })),
  );
}

async function generateCanvas(workspaceId: string) {
  const { workspace, snapshot, opportunities, topGaps } = await loadGrounding(workspaceId);

  if (((workspace.canvasCards as unknown[]) ?? []).length > 0 || !snapshot) {
    return;
  }

  const breakdown = snapshot.breakdown as {
    competitors?: { name: string; mentions: number; shareOfVoice: number; providers: string[] }[];
    factConflicts?: { field: string; values: { provider: string; value: string }[]; recommendation: string }[];
  };
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const createdAt = new Date().toISOString();

  const cards = [
    {
      title: 'AI visibility snapshot',
      content: [
        `Based on ${snapshot.answersCount} analysed AI answers.`,
        `- Visibility: ${pct(snapshot.visibility)}`,
        `- Share of voice: ${pct(snapshot.shareOfVoice)}`,
        `- Average position: ${snapshot.averagePosition ? snapshot.averagePosition.toFixed(1) : 'not mentioned'}`,
        `- Product understanding: ${pct(snapshot.productUnderstanding)}`,
      ].join('\n'),
    },
    {
      title: 'Who is winning',
      content: (breakdown.competitors ?? []).slice(0, 5).map((c) => `- ${c.name}: ${c.mentions} mentions across ${c.providers.join(', ')}`).join('\n') || 'No competitors detected.',
    },
    {
      title: 'Biggest visibility gaps',
      content: topGaps.map((g) => `- ${g.question} (${g.level}, criticality ${g.criticality})`).join('\n') || 'No gaps scored.',
    },
    {
      title: 'Conflicting product information',
      content:
        (breakdown.factConflicts ?? []).map((c) => `- ${c.field}: ${c.values.map((v) => `${v.provider} says "${v.value}"`).join('; ')}. ${c.recommendation}`).join('\n') ||
        'No conflicting claims detected between models.',
    },
    {
      title: 'Priority opportunities',
      content: opportunities.map((o) => `- [${o.horizon}] ${o.title}: ${o.recommendation}`).join('\n') || 'No opportunities generated.',
    },
  ].map((card) => ({ id: crypto.randomUUID(), ...card, createdAt }));

  await db.update(workspaces).set({ canvasCards: cards }).where(eq(workspaces.id, workspaceId));
}

const blogSchema = z.object({ title: z.string(), html: z.string().describe('Article body using only p, h2, ul, li, strong tags') });

async function generateBlog(workspaceId: string) {
  const { summary } = await loadGrounding(workspaceId);
  const existing = await db.query.blogPosts.findFirst({ where: (p, { eq }) => eq(p.workspaceId, workspaceId) });

  if (existing) {
    return;
  }

  const post = await orchestrate(
    blogSchema,
    `Write one blog post that targets the single highest-priority gap or opportunity below: a real high-intent buyer question where the product is not being recommended. Write for the ICP, be specific, use only facts from the data, and never invent statistics, customers or pricing. Do not write a generic launch announcement.

Research data:
${summary}`,
  );

  await db.insert(blogPosts).values({ workspaceId, title: post.title, content: post.html, isPublished: false });
}

const deckSchema = z.object({
  slides: z
    .array(z.object({ id: z.number().int(), type: z.string(), title: z.string(), subtitle: z.string(), content: z.string() }))
    .length(12),
});

async function generateDeck(workspaceId: string) {
  const { profile, summary } = await loadGrounding(workspaceId);
  const existing = await db.query.productDecks.findFirst({ where: (d, { eq }) => eq(d.workspaceId, workspaceId) });

  if (existing) {
    return;
  }

  const { slides } = await orchestrate(
    deckSchema,
    `Create a 12-slide pitch deck: Cover, Problem, Solution, Product, Why Now, Market, Traction, Business Model, Competition, Go-to-Market, Team, Vision & Ask. Slide id is 1..12.
Each slide's content is an HTML string styled with Tailwind classes with strong contrast (text-gray-900 dark:text-gray-100).
Use the same positioning, ICP and category as the data below. Use only the real competitors, pricing and evidence provided. Where traction or team data is unknown, say it is not yet available instead of inventing numbers.

Research data:
${summary}`,
  );

  await db.insert(productDecks).values({
    workspaceId,
    title: `${profile.productName ?? 'Product'} Pitch Deck`,
    slides,
    isPublished: false,
  });
}

const GENERATORS: Record<PageKey, (workspaceId: string) => Promise<void>> = {
  context: generateContext,
  sources: generateSources,
  canvas: generateCanvas,
  blog: generateBlog,
  deck: generateDeck,
};

export const updateWorkspace: StageHandler = async ({ workspaceId, buildId }: StageContext) => {
  const stage = await db.query.workspaceBuildStages.findFirst({
    where: (s, { and, eq }) => and(eq(s.buildId, buildId), eq(s.stageKey, 'update_workspace')),
  });
  const previous = ((stage?.result as { pages?: Partial<Record<PageKey, string>> } | null)?.pages ?? {}) as Partial<Record<PageKey, string>>;
  const pages: Partial<Record<PageKey, string>> = { ...previous };
  const pending = (Object.keys(GENERATORS) as PageKey[]).filter((key) => pages[key] !== 'completed');

  await Promise.all(
    pending.map(async (key) => {
      try {
        await GENERATORS[key](workspaceId);
        pages[key] = 'completed';
      } catch (error) {
        pages[key] = `failed: ${errorMessage(error)}`;
      }
    }),
  );

  await setStageStatus(buildId, 'update_workspace', 'running', { result: { pages } });
  await db.update(workspaces).set({ updatedAt: new Date() }).where(and(eq(workspaces.id, workspaceId)));

  const failed = (Object.keys(GENERATORS) as PageKey[]).filter((key) => pages[key] !== 'completed');

  if (failed.length > 0) {
    throw new Error(`Pages not generated: ${failed.join(', ')}`);
  }

  return { pages };
};
