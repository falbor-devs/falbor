import { NextResponse, type NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';
import { runWorkspaceBuild } from '~/lib/workspace-build/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspace = await getAccessibleWorkspace(params.id, userId);

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  if (!workspace.onboardingCompleted) {
    return NextResponse.json({ error: 'Onboarding is not complete' }, { status: 409 });
  }

  return NextResponse.json(await runWorkspaceBuild(params.id));
}
