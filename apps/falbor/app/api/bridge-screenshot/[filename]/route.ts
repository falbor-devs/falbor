import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { hackingScreenshots } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/bridge-screenshot/[id]
 * Serve a screenshot from Neon by its UUID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const id = params.filename;

  if (!id) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(hackingScreenshots)
      .where(eq(hackingScreenshots.id, id))
      .limit(1);

    if (rows.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const row = rows[0];
    // Decode base64 back to binary
    const buffer = Buffer.from(row.imageData, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': row.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[bridge-screenshot GET]', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
