import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workspaceMedia } from '~/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getCurrentUserId } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 64 * 1024 * 1024; // 64 MB

async function assertAccess(workspaceId: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const workspace = await getAccessibleWorkspace(workspaceId, userId);
  if (!workspace) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return userId;
}

function jsonError(err: any) {
  const status = err?.status || 500;
  return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    await assertAccess(workspaceId);

    const items = await db.query.workspaceMedia.findMany({
      where: (t, { eq }) => eq(t.workspaceId, workspaceId),
      orderBy: [desc(workspaceMedia.createdAt)],
      columns: {
        id: true,
        kind: true,
        mimeType: true,
        source: true,
        url: true,
        byteSize: true,
        width: true,
        height: true,
        prompt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      media: items.map((m) => ({
        ...m,
        previewUrl: m.url || `/api/ads/meta/media/${m.id}`,
      })),
    });
  } catch (err: any) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let workspaceId = '';
    let kind = 'image';
    let mimeType = 'image/jpeg';
    let base64 = '';
    let source: 'upload' | 'ai' | 'url' = 'upload';
    let url: string | null = null;
    let prompt: string | null = null;
    let filename = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      workspaceId = String(form.get('workspaceId') || '');
      filename = String(form.get('filename') || '');
      const file = form.get('file');
      const urlField = form.get('url');
      if (urlField) {
        source = 'url';
        url = String(urlField);
      } else if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        const f = file as File;
        mimeType = f.type || mimeType;
        const bytes = Buffer.from(await f.arrayBuffer());
        const isVideo = mimeType.startsWith('video');
        const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (bytes.byteLength > limit) {
          return NextResponse.json(
            { error: `File too large. Max ${Math.round(limit / (1024 * 1024))}MB for ${isVideo ? 'video' : 'image'}.` },
            { status: 413 },
          );
        }
        kind = isVideo ? 'video' : 'image';
        base64 = bytes.toString('base64');
      }
    } else {
      const body = await request.json();
      workspaceId = body.workspaceId;
      kind = body.kind || 'image';
      mimeType = body.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
      base64 = body.data || '';
      url = body.url || null;
      source = body.source || (url ? 'ai' : 'upload');
      prompt = body.prompt || null;
      filename = body.filename || '';
    }

    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    if (!base64 && !url) return NextResponse.json({ error: 'A file or url is required' }, { status: 400 });

    const userId = await assertAccess(workspaceId);

    const byteSize = base64 ? Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64').byteLength : null;

    const [record] = await db
      .insert(workspaceMedia)
      .values({
        workspaceId,
        uploadedByUserId: userId,
        kind: kind === 'video' ? 'video' : 'image',
        mimeType,
        source,
        url,
        data: base64 ? base64.replace(/^data:[^;]+;base64,/, '') : null,
        byteSize: byteSize ?? undefined,
        prompt,
        metaHashes: {},
      })
      .returning({ id: workspaceMedia.id });

    return NextResponse.json({
      media: {
        id: record.id,
        kind: kind === 'video' ? 'video' : 'image',
        mimeType,
        source,
        url,
        byteSize,
        previewUrl: url || `/api/ads/meta/media/${record.id}`,
      },
    });
  } catch (err: any) {
    return jsonError(err);
  }
}
