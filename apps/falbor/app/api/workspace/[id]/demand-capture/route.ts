import { NextResponse, type NextRequest } from 'next/server';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '~/lib/db';
import { demandCaptureOpportunities, searchConsoleConnections, workspaceCompetitorProfiles, workspaceProductProfiles } from '~/lib/db/schema';
import { getRefreshedAccessToken } from '~/lib/actions/googleOAuth';
import { requireWorkspaceActor } from '~/lib/agents/authorization';
import { keywordResearchSearch } from '~/lib/services/searchTools';
import { classifySearchIntent, normalizeSearchQuery, productRelevance, scoreExternalOpportunity, scoreSearchConsoleOpportunity } from '~/lib/intelligence/demandCapture';
import { discoverGrowthOpportunities, generateOpportunityExecution, type GrowthCategory } from '~/lib/intelligence/growthOpportunities';

export const dynamic = 'force-dynamic';

const statuses = ['discovered', 'planned', 'in_progress', 'implemented', 'measuring', 'completed', 'dismissed'] as const;

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function getProductContext(workspaceId: string) {
  const [workspace, product, competitors] = await Promise.all([
    db.query.workspaces.findFirst({ where: (table, { eq }) => eq(table.id, workspaceId) }),
    db.query.workspaceProductProfiles.findFirst({ where: (table, { eq }) => eq(table.workspaceId, workspaceId) }),
    db.query.workspaceCompetitorProfiles.findMany({ where: (table, { eq }) => eq(table.workspaceId, workspaceId), limit: 12 }),
  ]);
  return {
    text: [product?.productName, product?.category, product?.summary, product?.problem, product?.icp, product?.pricing, product?.positioning, product?.features, product?.knownCompetitors, competitors.map((item) => item.brandName), workspace?.contextPrompt].flat().filter(Boolean).join(' | '),
    workspace,
    product,
    competitors,
  };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id);
  const [stored, connection] = await Promise.all([
    db.select().from(demandCaptureOpportunities).where(and(eq(demandCaptureOpportunities.workspaceId, params.id), isNull(demandCaptureOpportunities.archivedAt))).orderBy(desc(demandCaptureOpportunities.lastUpdatedAt)),
    db.query.searchConsoleConnections.findFirst({ where: (table, { eq }) => eq(table.workspaceId, params.id), orderBy: (table, { desc }) => [desc(table.updatedAt)] }),
  ]);
  const opportunities = stored.filter((item) => item.source === 'search_console' ? normalizeSearchQuery(item.query) !== null : Boolean(item.title && item.description && normalizeSearchQuery(item.query)));
  const token = await getRefreshedAccessToken(actor.user.id);
  let properties: Array<{ siteUrl: string; permissionLevel?: string }> = [];
  if (token) {
    const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) properties = ((await response.json()).siteEntry || []).map((item: any) => ({ siteUrl: item.siteUrl, permissionLevel: item.permissionLevel }));
  }
  return NextResponse.json({ opportunities, connection: connection ? { siteUrl: connection.siteUrl, status: connection.status, lastSyncedAt: connection.lastSyncedAt } : null, properties });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id, 'editor');
  const body = await request.json().catch(() => ({}));
  const context = await getProductContext(params.id);

  if (body.action === 'status') {
    const status = typeof body.status === 'string' && statuses.includes(body.status as (typeof statuses)[number]) ? body.status : null;
    if (!status || typeof body.opportunityId !== 'string') return NextResponse.json({ error: 'Invalid opportunity status' }, { status: 400 });
    const result = await db.update(demandCaptureOpportunities).set({ status, lastUpdatedAt: new Date() }).where(and(eq(demandCaptureOpportunities.id, body.opportunityId), eq(demandCaptureOpportunities.workspaceId, params.id))).returning({ id: demandCaptureOpportunities.id });
    if (!result.length) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    return NextResponse.json({ status });
  }

  if (body.action === 'generate') {
    if (typeof body.opportunityId !== 'string') return NextResponse.json({ error: 'Opportunity is required' }, { status: 400 });
    const opportunity = await db.query.demandCaptureOpportunities.findFirst({ where: (table, { and, eq, isNull }) => and(eq(table.id, body.opportunityId), eq(table.workspaceId, params.id), isNull(table.archivedAt)) });
    if (!opportunity || !opportunity.title) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    const generated = await generateOpportunityExecution({ title: opportunity.title, category: opportunity.category, description: opportunity.description, targetAudience: opportunity.targetAudience, acquisitionMechanism: opportunity.acquisitionMechanism, recommendedAction: opportunity.recommendedAction, query: opportunity.query }, context.text);
    await db.update(demandCaptureOpportunities).set({ executionPlan: { stage: 'prepare', actionType: generated.type, preparedAt: new Date().toISOString() }, generatedOutput: generated.text, generatedOutputType: generated.type, status: 'planned', lastUpdatedAt: new Date() }).where(and(eq(demandCaptureOpportunities.id, opportunity.id), eq(demandCaptureOpportunities.workspaceId, params.id)));
    return NextResponse.json(generated);
  }

  if (body.action === 'research') {
    const queryBase = body.query || `${context.product?.productName || context.workspace?.name || 'SaaS'} ${context.product?.category || ''} ${context.product?.problem || ''}`.trim();
    const researchQueries: Array<{ category: GrowthCategory; query: string }> = [
      { category: 'search', query: `${queryBase} search demand alternatives best problems` },
      { category: 'free_tool', query: `${queryBase} free tool calculator audit generator users` },
      { category: 'competitor_gap', query: `${queryBase} competitor reviews complaints alternatives missing features` },
    ];
    const batches = await Promise.all(researchQueries.map(async (item) => (await keywordResearchSearch(item.query)).slice(0, 6).map((result) => ({ ...result, category: item.category }))));
    const evidence = batches.flat();
    const discovered = await discoverGrowthOpportunities(context.text || 'Unknown product', evidence);
    const existing = await db.select({ query: demandCaptureOpportunities.query, source: demandCaptureOpportunities.source }).from(demandCaptureOpportunities).where(eq(demandCaptureOpportunities.workspaceId, params.id));
    const existingKeys = new Set(existing.map((item) => `${item.source}:${item.query.toLowerCase()}`));
    const rows = discovered.flatMap((item) => {
      const query = normalizeSearchQuery(item.query);
      const sourceEvidence = item.sourceUrls.map((url) => { const match = evidence.find((entry) => entry.url === url); return match ? { type: 'source_based_information', url, title: match.title, excerpt: match.snippet, provider: match.source, researchCategory: match.category } : null; }).filter(Boolean);
      const relevance = Math.max(item.productRelevance, productRelevance(query || '', context.text));
      const intent = item.intent === 'unknown' ? classifySearchIntent(query || '') : item.intent;
      if (!query || !sourceEvidence.length || item.confidence < 40 || relevance < 40 || existingKeys.has(`external:${query.toLowerCase()}`)) return [];
      return [{ workspaceId: params.id, query, title: item.title, description: item.description, targetAudience: item.targetAudience, acquisitionMechanism: item.acquisitionMechanism, recommendedAction: item.recommendedAction, difficulty: item.difficulty, intent, category: item.category, source: evidence.some((entry) => entry.source === 'tavily') ? 'tavily' : 'web_research', evidence: sourceEvidence, productRelevance: relevance, confidence: item.confidence, scoringMethod: 'growth_opportunity_evidence_v1', opportunityScore: scoreExternalOpportunity(relevance, item.confidence, intent, sourceEvidence.length), status: 'discovered', lastUpdatedAt: new Date() }];
    });
    if (rows.length) await db.insert(demandCaptureOpportunities).values(rows);
    await db.update(demandCaptureOpportunities).set({ archivedAt: new Date() }).where(and(eq(demandCaptureOpportunities.workspaceId, params.id), isNull(demandCaptureOpportunities.title), inArray(demandCaptureOpportunities.source, ['web_research', 'tavily'])));
    return NextResponse.json({ created: rows.length, rejected: discovered.length - rows.length });
  }

  const siteUrl = typeof body.siteUrl === 'string' ? body.siteUrl : '';
  if (!siteUrl) return NextResponse.json({ error: 'Select a Search Console property first' }, { status: 400 });
  const token = await getRefreshedAccessToken(actor.user.id);
  if (!token) return NextResponse.json({ error: 'Connect Google Search Console before syncing' }, { status: 400 });
  const end = new Date();
  const start = new Date(end.getTime() - 28 * 86400000);
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: body.startDate || start.toISOString().slice(0, 10), endDate: body.endDate || end.toISOString().slice(0, 10), dimensions: ['query', 'page'], rowLimit: 25000 }) });
  const payload = await response.json();
  if (!response.ok) return NextResponse.json({ error: payload.error?.message || 'Search Console sync failed' }, { status: response.status });
  const rows = (payload.rows || []).flatMap((row: any) => {
    const query = normalizeSearchQuery(row.keys?.[0]);
    if (!query) return [];
    const impressions = numeric(row.impressions);
    const clicks = numeric(row.clicks);
    const ctr = numeric(row.ctr);
    const averagePosition = numeric(row.position);
    const intent = classifySearchIntent(query);
    const relevance = productRelevance(query, context.text);
    return [{ workspaceId: params.id, query, title: query, description: 'Verified Search Console performance opportunity.', acquisitionMechanism: 'Organic search traffic', recommendedAction: relevance >= 40 && ctr !== null && ctr < 0.03 ? 'Improve the page title and meta description for this query.' : 'Review the ranking page and align its content with the query intent.', difficulty: 'medium', intent, category: relevance >= 40 && averagePosition !== null && averagePosition > 10 ? 'search' : 'search', impressions, clicks, ctr, averagePosition, productRelevance: relevance, confidence: 100, scoringMethod: 'search_console_performance_v1', opportunityScore: scoreSearchConsoleOpportunity(impressions, ctr, averagePosition, relevance, intent), source: 'search_console', evidence: [{ type: 'verified_observation', property: siteUrl, dimensions: ['query', 'page'] }], status: 'discovered', lastUpdatedAt: new Date() }];
  });
  await db.delete(demandCaptureOpportunities).where(and(eq(demandCaptureOpportunities.workspaceId, params.id), eq(demandCaptureOpportunities.source, 'search_console')));
  if (rows.length) await db.insert(demandCaptureOpportunities).values(rows);
  await db.insert(searchConsoleConnections).values({ workspaceId: params.id, userId: actor.user.id, siteUrl, propertyType: siteUrl.startsWith('sc-domain:') ? 'domain' : 'url', status: 'connected', lastSyncedAt: new Date(), updatedAt: new Date() }).onConflictDoUpdate({ target: [searchConsoleConnections.workspaceId, searchConsoleConnections.siteUrl], set: { userId: actor.user.id, status: 'connected', lastSyncedAt: new Date(), lastError: null, updatedAt: new Date() } });
  return NextResponse.json({ synced: rows.length });
}
