import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { elementComments } from '~/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function ensureCommentsTable() {
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS element_comments (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        element_info JSONB NOT NULL,
        position JSONB NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
  } catch (e) {
    console.error('Error creating element_comments table automatically:', e);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    await ensureCommentsTable();

    const comments = chatId
      ? await db.select().from(elementComments).where(eq(elementComments.chatId, chatId))
      : await db.select().from(elementComments);

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error('Error fetching comments from server:', error);
    return NextResponse.json({ success: true, comments: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, chatId, elementInfo, position, messages } = body;

    if (!id || !elementInfo || !position) {
      return NextResponse.json({ success: false, error: 'Missing required comment parameters' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    await ensureCommentsTable();

    const existing = await db.select().from(elementComments).where(eq(elementComments.id, id)).limit(1);

    if (existing.length > 0) {
      await db
        .update(elementComments)
        .set({
          elementInfo,
          position,
          messages: messages || [],
          updatedAt: new Date(),
        })
        .where(eq(elementComments.id, id));
    } else {
      await db.insert(elementComments).values({
        id,
        chatId: chatId || null,
        elementInfo,
        position,
        messages: messages || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving comment on server:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Comment id parameter required' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    await ensureCommentsTable();

    await db.delete(elementComments).where(eq(elementComments.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment on server:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
