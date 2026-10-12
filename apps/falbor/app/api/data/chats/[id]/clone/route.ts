import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { chats, messages, chatSnapshots } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq, and } from 'drizzle-orm';
import { generateId } from 'ai';
import { getSnapshot, setSnapshot } from '~/lib/api/data/chat';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const originalChatId = params.id;
    
    // Ensure the chat belongs to the user or is public
    const [originalChat] = await db.select().from(chats).where(eq(chats.id, originalChatId)).limit(1);
    
    if (!originalChat) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (originalChat.userId !== userId && !originalChat.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Create a new chat ID
    const newChatId = generateId();
    const newUrlId = newChatId; // Simplification

    // 2. Add to database
    await db.insert(chats).values({
      id: newChatId,
      userId,
      title: `${originalChat.title || 'App'} (copy)`,
      description: originalChat.description,
      isPublic: false,
    });

    // 3. Add exactly two messages
    const msg1Id = generateId();
    await db.insert(messages).values({
      id: msg1Id,
      chatId: newChatId,
      role: 'user',
      content: 'Please copy this app for me.',
      createdAt: new Date(),
    });

    const msg2Id = generateId();
    await db.insert(messages).values({
      id: msg2Id,
      chatId: newChatId,
      role: 'assistant',
      content: 'I copied it for you. You can now continue editing it!',
      createdAt: new Date(Date.now() + 1000), // 1 second later
    });

    // 4. Duplicate snapshot
    const [originalSnapshot] = await db.select().from(chatSnapshots).where(eq(chatSnapshots.chatId, originalChatId)).limit(1);
    if (originalSnapshot) {
      await db.insert(chatSnapshots).values({
        chatId: newChatId,
        userId,
        files: originalSnapshot.files,
        summary: originalSnapshot.summary,
      });
    }

    return NextResponse.json({ success: true, newId: newChatId });
  } catch (error) {
    console.error('Error cloning chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
