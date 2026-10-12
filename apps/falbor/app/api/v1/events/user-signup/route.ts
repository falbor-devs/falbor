import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workspaceSignups, workspaces } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const workspaceId = req.headers.get('X-Workspace-ID') || req.headers.get('x-workspace-id');
    const body = await req.json().catch(() => ({}));

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing X-Workspace-ID header.' }, { status: 400 });
    }

    const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
    if (ws.length === 0) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    await db.insert(workspaceSignups).values({
      workspaceId,
      userEmail: body?.email || body?.userEmail || null,
      metadata: body || {},
    });

    return NextResponse.json({ success: true, message: 'User signup recorded successfully.' });
  } catch (err: any) {
    console.error('Error handling user signup webhook:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
