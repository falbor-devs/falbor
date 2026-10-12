import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { chats } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { isPublic } = await request.json();
    
    // Ensure the chat belongs to the user
    const [chat] = await db.select().from(chats).where(and(eq(chats.id, params.id), eq(chats.userId, userId))).limit(1);
    
    if (!chat) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    await db.update(chats)
      .set({ isPublic })
      .where(eq(chats.id, params.id));

    return NextResponse.json({ success: true, isPublic });
  } catch (error) {
    console.error('Error updating chat visibility:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
