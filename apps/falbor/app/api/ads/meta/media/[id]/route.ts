import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workspaceMedia } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const media = await db.query.workspaceMedia.findFirst({
    where: eq(workspaceMedia.id, params.id),
  });
  if (!media) return new Response('Not found', { status: 404 });

  const userId = await getCurrentUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const workspace = await getAccessibleWorkspace(media.workspaceId, userId);
  if (!workspace) return new Response('Forbidden', { status: 403 });

  if (media.url && !media.data) {
    return NextResponse.redirect(media.url);
  }
  if (!media.data) return new Response('No content', { status: 404 });

  const bytes = Buffer.from(media.data, 'base64');
  return new Response(bytes, {
    headers: {
      'Content-Type': media.mimeType || 'application/octet-stream',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const media = await db.query.workspaceMedia.findFirst({
    where: eq(workspaceMedia.id, params.id),
  });
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const workspace = await getAccessibleWorkspace(media.workspaceId, userId);
  if (!workspace) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await db.delete(workspaceMedia).where(eq(workspaceMedia.id, params.id));
  return NextResponse.json({ success: true });
}
