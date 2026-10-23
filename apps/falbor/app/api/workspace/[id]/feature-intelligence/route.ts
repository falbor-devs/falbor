import { NextResponse, type NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { featureIntelligenceOpportunities, workspaceCompetitorProfiles, workspaces } from '~/lib/db/schema';
import { requireWorkspaceActor } from '~/lib/agents/authorization';
import { keywordResearchSearch } from '~/lib/services/searchTools';
import { analyzeResearchEvidence } from '~/lib/intelligence/research';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireWorkspaceActor(params.id);
  const opportunities = await db.select().from(featureIntelligenceOpportunities).where(eq(featureIntelligenceOpportunities.workspaceId, params.id)).orderBy(desc(featureIntelligenceOpportunities.updatedAt));
  return NextResponse.json({ opportunities });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  await requireWorkspaceActor(params.id, 'editor');
  const body = await request.json().catch(() => ({}));
  const workspace = await db.query.workspaces.findFirst({ where: (table, { eq }) => eq(table.id, params.id) });
  const competitors = await db.query.workspaceCompetitorProfiles.findMany({ where: (table, { eq }) => eq(table.workspaceId, params.id), limit: 8 });
  const query = body.query || `common problems and missing features in ${workspace?.name || 'this product'}`;
  const results = await keywordResearchSearch(query);
  const analyzed = await analyzeResearchEvidence(workspace?.contextPrompt || workspace?.name || 'Unknown product', results.slice(0, 8));
  const rows = analyzed.map((item) => ({ workspaceId: params.id, name: item.query, problem: item.explanation, audience: item.audience || workspace?.businessGoal || null, evidence: item.sourceUrls.map((url) => { const source = results.find((result) => result.url === url); return { type: 'source_based_information', url, title: source?.title || url, excerpt: source?.snippet || '', provider: source?.source }; }), impact: 'unknown', effort: 'unknown', score: null, status: 'new' }));
  if (rows.length) await db.insert(featureIntelligenceOpportunities).values(rows);
  return NextResponse.json({ created: rows.length });
}
