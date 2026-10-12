import { NextResponse, type NextRequest } from 'next/server';
import { resumeStaleBuilds } from '~/lib/workspace-build/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ resumed: await resumeStaleBuilds() });
}
