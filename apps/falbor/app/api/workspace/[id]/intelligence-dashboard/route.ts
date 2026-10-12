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

  const [snapshot, criticality, opportunities] = await Promise.all([
    db.query.workspaceMetricSnapshots.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, params.id),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    }),
    db.query.questionCriticality.findMany({
      where: (c, { eq }) => eq(c.workspaceId, params.id),
      orderBy: (c, { desc }) => [desc(c.score)],
    }),
    db.query.acquisitionOpportunities.findMany({
      where: (o, { eq }) => eq(o.workspaceId, params.id),
      orderBy: (o, { desc }) => [desc(o.priorityScore)],
    }),
  ]);

  return NextResponse.json({
    metrics: snapshot || null,
    criticality: criticality || [],
    opportunities: opportunities || [],
  });
}
