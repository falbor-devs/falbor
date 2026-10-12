import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await db
      .select()
      .from(mcpConnections)
      .where(eq(mcpConnections.userId, userId));

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Fetch connections error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectorId, name, config } = await request.json();
    if (!connectorId || !name || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if a connection with same connectorId already exists for this user
    const [existing] = await db
      .select()
      .from(mcpConnections)
      .where(and(eq(mcpConnections.userId, userId), eq(mcpConnections.connectorId, connectorId)))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(mcpConnections)
        .set({ config, name, status: 'active', updatedAt: new Date() })
        .where(and(eq(mcpConnections.userId, userId), eq(mcpConnections.connectorId, connectorId)));
    } else {
      // Insert new
      await db.insert(mcpConnections).values({
        userId,
        connectorId,
        name,
        config,
        status: 'active',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create connection error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

