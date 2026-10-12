import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { googleAdsConnections } from '~/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ connected: false });
  }

  const connection = await db.query.googleAdsConnections.findFirst({
    where: and(
      eq(googleAdsConnections.workspaceId, workspaceId),
      eq(googleAdsConnections.customerId, 'meta')
    ),
  });

  return NextResponse.json({ connected: !!connection?.refreshToken });
}
