import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { hackingScreenshots } from '~/lib/db/schema';

/**
 * POST /api/bridge-screenshot
 * Called by the Python bridge to upload a screenshot to Neon.
 *
 * Body (JSON):
 *   { imageBase64: string, sourceUrl?: string }
 *
 * Returns:
 *   { id: string }  — UUID of the saved row (used to build the serving URL)
 */
export async function POST(request: NextRequest) {
  // Allow the local Python bridge to call this endpoint
  const origin = request.headers.get('origin') || '';
  const isLocal = origin.includes('localhost') || origin === '';

  if (!isLocal) {
    // In production, the bridge must run on the same host.
    // Add an auth token check here if you want extra security:
    const token = request.headers.get('x-bridge-token');
    const expected = process.env.BRIDGE_SECRET;
    if (expected && token !== expected) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  try {
    const body = (await request.json()) as { imageBase64?: string; sourceUrl?: string };

    if (!body.imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    const [row] = await db
      .insert(hackingScreenshots)
      .values({
        imageData: body.imageBase64,
        sourceUrl: body.sourceUrl ?? null,
        mimeType: 'image/png',
      })
      .returning({ id: hackingScreenshots.id });

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (err: any) {
    console.error('[bridge-screenshot POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
