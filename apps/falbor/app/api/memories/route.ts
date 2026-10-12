import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { memories } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userMemories = await db.select().from(memories).where(eq(memories.userId, userId)).orderBy(memories.createdAt);

    return NextResponse.json({ memories: userMemories });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
