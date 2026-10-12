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

  const [profile, questions, runs, analyses, sources, brands] = await Promise.all([
    db.query.workspaceProductProfiles.findFirst({
      where: (p, { eq }) => eq(p.workspaceId, params.id),
    }),
    db.query.buyerQuestions.findMany({
      where: (q, { eq }) => eq(q.workspaceId, params.id),
    }),
    db.query.modelRuns.findMany({
      where: (r, { eq }) => eq(r.workspaceId, params.id),
    }),
    db.query.aiAnswerAnalyses.findMany({
      where: (a, { eq }) => eq(a.workspaceId, params.id),
    }),
    db.query.aiAnswerSources.findMany({
      where: (s, { eq }) => eq(s.workspaceId, params.id),
    }),
    db.query.aiAnswerBrands.findMany({
      where: (b, { eq }) => eq(b.workspaceId, params.id),
    }),
  ]);

  const questionMap = new Map(questions.map((q) => [q.id, q.question]));
  const analysisMap = new Map(analyses.map((a) => [a.modelRunId, a]));

  const sourcesByAnalysis = new Map<string, typeof sources>();
  for (const s of sources) {
    const list = sourcesByAnalysis.get(s.analysisId) ?? [];
    list.push(s);
    sourcesByAnalysis.set(s.analysisId, list);
  }

  const PROVIDERS = [
    { key: 'openai', name: 'ChatGPT', icon: 'i-ph:robot-duotone' },
    { key: 'anthropic', name: 'Claude (Anthropic)', icon: 'i-ph:sparkle-duotone' },
    { key: 'deepseek', name: 'DeepSeek', icon: 'i-ph:brain-duotone' },
  ];

  const engineMap = new Map<string, {
    key: string;
    displayName: string;
    icon: string;
    questions: Array<{
      runId: string;
      questionId: string;
      questionText: string;
      answerText: string;
      productMentioned: boolean;
      productRecommended: boolean;
      descriptionAccurate: boolean | null;
      misunderstandsProduct: boolean;
      sources: Array<{ domain: string; url: string | null; sourceType: string; isFirstParty: boolean; isCommunity: boolean }>;
    }>;
    recommendsCount: number;
    knowsCount: number;
    pointsToCompetitorsCount: number;
    totalRuns: number;
  }>();

  for (const p of PROVIDERS) {
    engineMap.set(p.key, {
      key: p.key,
      displayName: p.name,
      icon: p.icon,
      questions: [],
      recommendsCount: 0,
      knowsCount: 0,
      pointsToCompetitorsCount: 0,
      totalRuns: 0,
    });
  }

  for (const run of runs) {
    if (!run.rawResponse) continue;
    const providerKey = run.provider.toLowerCase();
    if (!engineMap.has(providerKey)) continue;

    const entry = engineMap.get(providerKey)!;
    const analysis = analysisMap.get(run.id);
    const runSources = analysis ? sourcesByAnalysis.get(analysis.id) || [] : [];
    const qText = questionMap.get(run.questionId) || `What is ${profile?.productName || 'the product'}?`;

    entry.totalRuns += 1;
    if (analysis?.productRecommended) {
      entry.recommendsCount += 1;
    }
    if (analysis?.descriptionAccurate || analysis?.productMentioned) {
      entry.knowsCount += 1;
    }
    if (analysis?.misunderstandsProduct || (!analysis?.productMentioned && brands.length > 0)) {
      entry.pointsToCompetitorsCount += 1;
    }

    entry.questions.push({
      runId: run.id,
      questionId: run.questionId,
      questionText: qText,
      answerText: run.rawResponse,
      productMentioned: analysis?.productMentioned ?? false,
      productRecommended: analysis?.productRecommended ?? false,
      descriptionAccurate: analysis?.descriptionAccurate ?? null,
      misunderstandsProduct: analysis?.misunderstandsProduct ?? false,
      sources: runSources.map((s) => ({
        domain: s.domain,
        url: s.url,
        sourceType: s.sourceType,
        isFirstParty: s.isFirstParty,
        isCommunity: s.isCommunity,
      })),
    });

    engineMap.set(providerKey, entry);
  }

  const engines = [...engineMap.values()].map((e) => {
    let status: 'Recommends you' | 'Points to competitors' | 'Negative' | 'No signal' = 'No signal';
    let statusColor: 'green' | 'red' | 'amber' | 'gray' = 'gray';

    if (e.recommendsCount > 0) {
      status = 'Recommends you';
      statusColor = 'green';
    } else if (e.pointsToCompetitorsCount > 0) {
      status = 'Points to competitors';
      statusColor = 'red';
    } else if (e.totalRuns > 0) {
      status = 'No signal';
      statusColor = 'gray';
    }

    const recommendPct = e.totalRuns > 0 ? Math.round((e.recommendsCount / e.totalRuns) * 100) : 0;
    const knowsPct = e.totalRuns > 0 ? Math.round((e.knowsCount / e.totalRuns) * 100) : 0;

    return {
      key: e.key,
      displayName: e.displayName,
      icon: e.icon,
      status,
      statusColor,
      recommendPct,
      knowsPct,
      totalRuns: e.totalRuns,
      questions: e.questions,
    };
  });

  const totalRuns = engines.reduce((acc, e) => acc + e.totalRuns, 0) || 1;
  const totalRecommends = engines.reduce((acc, e) => acc + e.questions.filter((q) => q.productRecommended).length, 0);
  const overallRecommendPct = Math.round((totalRecommends / totalRuns) * 100);

  const correctlyDescribedEngines = engines.filter((e) => e.knowsPct >= 50).length;

  return NextResponse.json({
    product: {
      name: profile?.productName || 'Your Product',
      domain: profile?.domain || null,
      category: profile?.category || 'SaaS',
    },
    overallRecommendPct,
    correctlyDescribedEnginesCount: correctlyDescribedEngines,
    totalEnginesCount: engines.length,
    engines,
  });
}
