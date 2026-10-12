import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = params.id;
    console.log(`Attempting to delete connection ${connectionId} for user ${userId}`);

    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connection ID' }, { status: 400 });
    }

    const result = await db
      .delete(mcpConnections)
      .where(
        and(
          eq(mcpConnections.id, connectionId),
          eq(mcpConnections.userId, userId)
        )
      )
      .returning();

    console.log('Delete result:', result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete connection error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = params.id;
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connection ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    await db
      .update(mcpConnections)
      .set({ name, updatedAt: new Date() })
      .where(
        and(
          eq(mcpConnections.id, connectionId),
          eq(mcpConnections.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update connection error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

