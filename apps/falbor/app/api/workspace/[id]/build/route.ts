import { NextResponse, type NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';
import { retryFailedBuild } from '~/lib/workspace-build/orchestrator';
import { ensureBuild, getBuildState } from '~/lib/workspace-build/state';

export const dynamic = 'force-dynamic';

async function authorise(req: NextRequest, workspaceId: string) {
  const userId = await getUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspace = await getAccessibleWorkspace(workspaceId, userId);

  return workspace ? null : NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await authorise(req, params.id);

  if (denied) {
    return denied;
  }

  await ensureBuild(params.id);

  return NextResponse.json({ build: await getBuildState(params.id) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await authorise(req, params.id);

  if (denied) {
    return denied;
  }

  const body = await req.json().catch(() => ({}));

  if (body?.action === 'retry') {
    await retryFailedBuild(params.id);
  } else {
    const workspace = await getAccessibleWorkspace(params.id, (await getUserId(req)) as string);

    if (!workspace?.onboardingCompleted) {
      return NextResponse.json({ error: 'Onboarding is not complete' }, { status: 409 });
    }

    await ensureBuild(params.id);
  }

  return NextResponse.json({ build: await getBuildState(params.id) });
}
