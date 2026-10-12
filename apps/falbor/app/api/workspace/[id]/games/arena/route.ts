import { NextResponse, type NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';
import { orchestrate } from '~/lib/workspace-build/models';
import { workspaceCompetitorProfiles } from '~/lib/db/schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspace = await getAccessibleWorkspace(params.id, userId);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const [productProfile, snapshot, competitorProfiles, answerBrands] = await Promise.all([
    db.query.workspaceProductProfiles.findFirst({
      where: (p, { eq }) => eq(p.workspaceId, params.id),
    }),
    db.query.workspaceMetricSnapshots.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, params.id),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    }),
    db.query.workspaceCompetitorProfiles.findMany({
      where: (cp, { eq }) => eq(cp.workspaceId, params.id),
    }),
    db.query.aiAnswerBrands.findMany({
      where: (b, { eq }) => eq(b.workspaceId, params.id),
    }),
  ]);

  const competitorMap = new Map<string, { brandName: string; domain: string | null }>();

  for (const b of answerBrands) {
    if (b.isUserProduct) continue;
    const name = b.brandName.trim();
    const key = name.toLowerCase();
    if (!competitorMap.has(key)) {
      competitorMap.set(key, { brandName: name, domain: b.domain ?? null });
    } else if (b.domain && !competitorMap.get(key)!.domain) {
      competitorMap.get(key)!.domain = b.domain;
    }
  }

  for (const cp of competitorProfiles) {
    const name = cp.brandName.trim();
    const key = name.toLowerCase();
    if (!competitorMap.has(key)) {
      competitorMap.set(key, { brandName: name, domain: cp.domain ?? null });
    } else if (cp.domain && !competitorMap.get(key)!.domain) {
      competitorMap.get(key)!.domain = cp.domain;
    }
  }

  const allCompetitors = [...competitorMap.values()];

  return NextResponse.json({
    productProfile,
    snapshot,
    competitors: allCompetitors,
  });
}

const battleAnalysisSchema = z.object({
  overallWinner: z.enum(['A', 'B', 'TIE']),
  overallSummary: z.string(),
  rounds: z.array(
    z.object({
      id: z.string(),
      categoryName: z.string(),
      winner: z.enum(['A', 'B', 'TIE']),
      winnerName: z.string(),
      reasoning: z.array(z.string()),
      evidence: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          source: z.string().optional(),
        })
      ),
      hasEnoughEvidence: z.boolean(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspace = await getAccessibleWorkspace(params.id, userId);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const body = await req.json();
  const { startupA, startupB, judges = ['OpenAI', 'Anthropic', 'DeepSeek'] } = body;

  const [productProfile, snapshot, competitors] = await Promise.all([
    db.query.workspaceProductProfiles.findFirst({
      where: (p, { eq }) => eq(p.workspaceId, params.id),
    }),
    db.query.workspaceMetricSnapshots.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, params.id),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    }),
    db.query.workspaceCompetitorProfiles.findMany({
      where: (cp, { eq }) => eq(cp.workspaceId, params.id),
    }),
  ]);

  const nameA = startupA?.name || productProfile?.productName || 'Startup A';
  const nameB = startupB?.name || 'Competitor B';

  let profileB = competitors.find(
    (c) => c.brandName.toLowerCase() === nameB.toLowerCase() || (c.domain && startupB?.domain && c.domain.toLowerCase() === startupB.domain.toLowerCase())
  );

  // If competitor B profile is missing, analyze and store it
  if (!profileB && nameB.trim().length > 1) {
    try {
      const prompt = `Analyze competitor "${nameB}" for AI Startup Arena comparison against ${nameA}.
Category: ${productProfile?.category || 'SaaS'}
Target Audience: ${productProfile?.icp || 'Buyers'}

Produce structured competitor intelligence JSON.`;

      const schema = z.object({
        hasEvidence: z.boolean(),
        positioning: z.object({ category: z.string(), targetAudience: z.string(), primaryProblem: z.string(), corePromise: z.string(), differentiators: z.array(z.string()) }),
        pricing: z.object({ startingPrice: z.string(), plans: z.array(z.object({ name: z.string(), price: z.string(), limits: z.string() })), evidenceSource: z.string().nullable() }),
        features: z.array(z.object({ name: z.string(), available: z.boolean() })),
        audience: z.object({ icp: z.string(), companySize: z.string(), industry: z.string(), overlapPct: z.number() }),
        whyRecommends: z.array(z.object({ factor: z.string(), score: z.number(), explanation: z.string() })),
        headToHead: z.object({ whyTheyWin: z.string(), whatWeShouldImprove: z.string(), metrics: z.array(z.object({ area: z.string(), ourValue: z.string(), competitorValue: z.string(), winner: z.enum(['us', 'competitor', 'tie']) })) }),
        sources: z.array(z.object({ name: z.string(), domain: z.string().nullable(), type: z.enum(['review', 'community', 'first_party', 'media', 'search']), authority: z.number(), reasons: z.array(z.string()), influencesCompetitors: z.array(z.string()) })),
        newContent: z.array(z.object({ title: z.string(), type: z.string(), url: z.string(), whatChanged: z.string(), whyItMatters: z.string(), ourOpportunity: z.string(), date: z.string() })),
        messagingChanges: z.array(z.object({ area: z.string(), previous: z.string(), current: z.string(), impact: z.string() })),
        communityPresence: z.array(z.object({ platform: z.string(), mentionsCount: z.number(), sentiment: z.enum(['positive', 'neutral', 'mixed']), opportunity: z.string() })),
        ads: z.object({ activeAdsCount: z.number(), platforms: z.array(z.string()), messagingTheme: z.string(), topOffer: z.string() }),
        timelineEvents: z.array(z.object({ date: z.string(), title: z.string(), whatChanged: z.string(), evidence: z.string(), whyItMatters: z.string() })),
      });

      const generated = await orchestrate(schema, prompt);

      const [inserted] = await db
        .insert(workspaceCompetitorProfiles)
        .values({
          workspaceId: params.id,
          brandName: nameB,
          domain: startupB?.domain || null,
          positioning: generated.positioning,
          pricing: generated.pricing,
          features: generated.features,
          audience: generated.audience,
          whyRecommends: generated.whyRecommends,
          headToHead: generated.headToHead,
          sources: generated.sources,
          newContent: generated.newContent,
          messagingChanges: generated.messagingChanges,
          communityPresence: generated.communityPresence,
          ads: generated.ads,
          timelineEvents: generated.timelineEvents,
          hasEvidence: generated.hasEvidence,
        })
        .returning();

      profileB = inserted;
    } catch (e) {
      console.error('Failed to auto-analyze startup B profile:', e);
    }
  }

  const promptArena = `You are the Head Judge of the AI Startup Arena evaluating a head-to-head match between two startups:

Startup A: ${nameA}
Ground truth profile: ${JSON.stringify(productProfile || {})}
Metrics Snapshot: ${JSON.stringify(snapshot || {})}

Startup B: ${nameB}
Competitor Intelligence: ${JSON.stringify(profileB || {})}

Panel of AI Judges: ${(judges as string[]).map((j: string) => (j === 'Anthropic' ? 'Anthropic (claude-haiku-4-5)' : j)).join(', ')}

Analyze both startups strictly using the factual evidence provided across these 9 categories:
1. AI Recommendation (Visibility & Recommendation probability in AI models)
2. Positioning (Clarity of category definition & core promise)
3. Features (Breadth and depth of capability)
4. Pricing (Transparency and competitive value)
5. Audience / ICP (Target buyer alignment & market coverage)
6. Sources & Authority (Third-party citation authority & domain backlinks)
7. Community Presence (Social discussion signals & forum presence)
8. Content & Messaging (Quality of landing pages & recent messaging updates)
9. AI Perception (Model consensus sentiment & intent score)

For each category:
- Determine winner ('A', 'B', or 'TIE')
- Provide clear factual reasons (why they won)
- Include concrete evidence bullets (urls, metrics, sources)
- If evidence is lacking for both, set hasEnoughEvidence to false.

Return JSON matching battleAnalysisSchema.`;

  const battleResult = await orchestrate(battleAnalysisSchema, promptArena);

  return NextResponse.json({
    startupA: {
      name: nameA,
      domain: productProfile?.domain || null,
    },
    startupB: {
      name: nameB,
      domain: profileB?.domain || startupB?.domain || null,
    },
    judges,
    result: battleResult,
  });
}
