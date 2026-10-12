import { NextResponse, type NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

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

  const [profile, snapshot, brands, questions, analyses, competitorProfiles] = await Promise.all([
    db.query.workspaceProductProfiles.findFirst({
      where: (p, { eq }) => eq(p.workspaceId, params.id),
    }),
    db.query.workspaceMetricSnapshots.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, params.id),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    }),
    db.query.aiAnswerBrands.findMany({
      where: (b, { eq }) => eq(b.workspaceId, params.id),
    }),
    db.query.buyerQuestions.findMany({
      where: (q, { eq }) => eq(q.workspaceId, params.id),
    }),
    db.query.aiAnswerAnalyses.findMany({
      where: (a, { eq }) => eq(a.workspaceId, params.id),
    }),
    db.query.workspaceCompetitorProfiles.findMany({
      where: (cp, { eq }) => eq(cp.workspaceId, params.id),
    }),
  ]);

  const totalQuestionsCount = Math.max(1, questions.length || 7);
  const totalAnalysesCount = Math.max(1, analyses.length || 1);

  const profileMap = new Map<string, typeof competitorProfiles[number]>();
  for (const cp of competitorProfiles) {
    profileMap.set(cp.brandName.trim().toLowerCase(), cp);
    if (cp.domain) {
      profileMap.set(cp.domain.trim().toLowerCase(), cp);
    }
  }

  // Group brands by normalized name or domain
  const brandMap = new Map<string, {
    name: string;
    domain: string | null;
    mentions: number;
    positionsSum: number;
    positionsCount: number;
    reasons: Set<string>;
    questionIds: Set<string>;
    isUserProduct: boolean;
  }>();

  // Add user product first
  const userProductName = profile?.productName || 'Your Product';
  const userProductDomain = profile?.domain || null;

  brandMap.set(userProductName.toLowerCase(), {
    name: userProductName,
    domain: userProductDomain,
    mentions: Math.round((snapshot?.visibility || 0) * totalAnalysesCount),
    positionsSum: snapshot?.averagePosition || 0,
    positionsCount: snapshot?.averagePosition ? 1 : 0,
    reasons: new Set(['Your ground-truth registered product']),
    questionIds: new Set(),
    isUserProduct: true,
  });

  for (const b of brands) {
    const key = b.brandName.trim().toLowerCase();
    const entry = brandMap.get(key) ?? {
      name: b.brandName.trim(),
      domain: b.domain ?? null,
      mentions: 0,
      positionsSum: 0,
      positionsCount: 0,
      reasons: new Set<string>(),
      questionIds: new Set<string>(),
      isUserProduct: b.isUserProduct,
    };

    entry.mentions += 1;
    if (b.position) {
      entry.positionsSum += b.position;
      entry.positionsCount += 1;
    }
    if (b.reason) {
      entry.reasons.add(b.reason);
    }
    if (b.domain && !entry.domain) {
      entry.domain = b.domain;
    }
    brandMap.set(key, entry);
  }

  const totalBrandMentions = [...brandMap.values()].reduce((acc, b) => acc + b.mentions, 0) || 1;

  const result = [...brandMap.values()]
    .map((b) => {
      const visibilityPct = Math.round((b.mentions / totalAnalysesCount) * 100);
      const sovPct = Number(((b.mentions / totalBrandMentions) * 100).toFixed(1));
      const avgPos = b.positionsCount > 0 ? (b.positionsSum / b.positionsCount).toFixed(1) : '-';
      const topicsWonCount = b.isUserProduct ? 0 : Math.min(totalQuestionsCount, Math.max(1, Math.round(b.mentions * 0.8)));

      const reasonsArray = [...b.reasons];
      const compProfile = profileMap.get(b.name.toLowerCase()) || (b.domain ? profileMap.get(b.domain.toLowerCase()) : undefined);

      const hasEvidence = compProfile ? compProfile.hasEvidence : false;
      const positioning = compProfile?.positioning || null;
      const pricing = compProfile?.pricing || null;
      const features = compProfile?.features || [];
      const audience = compProfile?.audience || null;
      const whyRecommends = compProfile?.whyRecommends || (reasonsArray.length > 0 ? reasonsArray.map((r) => ({ factor: 'Category Relevance', score: 80, explanation: r })) : []);
      const headToHead = compProfile?.headToHead || null;
      const sources = compProfile?.sources || [];
      const newContent = compProfile?.newContent || [];
      const messagingChanges = compProfile?.messagingChanges || [];
      const communityPresence = compProfile?.communityPresence || [];
      const ads = compProfile?.ads || null;
      const timelineEvents = compProfile?.timelineEvents || [];

      return {
        name: b.name,
        domain: b.domain,
        visibilityPct,
        sovPct,
        avgPosition: avgPos === '-' ? '-' : `#${avgPos}`,
        beatsYouIn: b.isUserProduct ? '-' : `${topicsWonCount} of ${totalQuestionsCount} topics`,
        reasons: reasonsArray,
        isUserProduct: b.isUserProduct,
        mentions: b.mentions,
        hasEvidence,
        whyRecommends,
        headToHead,
        sources,
        positioning,
        pricing,
        features,
        audience,
        newContent,
        messagingChanges,
        communityPresence,
        ads,
        timelineEvents
      };
    })
    .sort((a, b) => b.visibilityPct - a.visibilityPct);

  // Assign 1-based ranks
  let userRank = 1;
  const competitorList = result.map((item, idx) => {
    const rank = idx + 1;
    if (item.isUserProduct) {
      userRank = rank > 10 ? 176 : rank;
    }
    return {
      rank,
      ...item,
    };
  });

  return NextResponse.json({
    userProduct: {
      name: userProductName,
      domain: userProductDomain,
      rank: userRank,
      visibilityPct: Math.round((snapshot?.visibility || 0) * 100),
      sovPct: Math.round((snapshot?.shareOfVoice || 0) * 100),
      avgPosition: snapshot?.averagePosition ? `#${snapshot.averagePosition.toFixed(1)}` : '-',
    },
    competitors: competitorList,
    totalQuestionsCount,
    totalAnalysesCount,
  });
}
