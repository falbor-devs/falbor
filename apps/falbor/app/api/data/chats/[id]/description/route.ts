import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { chats, messages } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq, and } from 'drizzle-orm';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [chat] = await db.select().from(chats).where(and(eq(chats.id, params.id), eq(chats.userId, userId))).limit(1);
    
    if (!chat) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // Only generate if we don't have a description or if it's identical to the title
    if (chat.description && chat.description !== chat.title && chat.description.trim().length > 0) {
      return NextResponse.json({ success: true, description: chat.description });
    }

    const msgs = await db.select().from(messages).where(eq(messages.chatId, params.id)).orderBy(messages.createdAt).limit(2);
    
    if (msgs.length < 1) {
      return NextResponse.json({ description: '' });
    }

    const contentToSummarize = msgs.map(m => `${m.role}: ${m.content}`).join('\n');

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      system: 'You are an AI that writes a short 2-3 word name and a 1-line description of an app idea based on the first couple of messages. Output JSON only.',
      prompt: contentToSummarize,
      schema: z.object({
        title: z.string().describe('A 2-3 word name for the app'),
        description: z.string().describe('A 1-line description of the app idea'),
      })
    });

    const description = object.description.trim();
    const generatedTitle = object.title.trim();

    // Only overwrite the title if it's currently generic
    const isGenericTitle = !chat.title || chat.title === 'New Chat' || chat.title === chat.description;

    const updates: any = { description };
    if (isGenericTitle && generatedTitle) {
      updates.title = generatedTitle;
    }

    await db.update(chats).set(updates).where(eq(chats.id, params.id));

    return NextResponse.json({ success: true, description, title: updates.title || chat.title });
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
