import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { chats, messages } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const list = await db.select().from(chats).where(eq(chats.userId, userId)).orderBy(desc(chats.updatedAt));
    return NextResponse.json(list.map(c => ({...c, description: c.title || c.description})));
  } catch (e) {
    console.error("GET /api/data/chats error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  // if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mockUserId = userId || 'test-user';
  try {
    const body = (await request.json()) as {
      id: string; messages: any[]; urlId?: string; description?: string; timestamp?: string; metadata?: any; workspaceId?: string;
    };
    const { id, messages: msgs, urlId, description: desc_text, timestamp, metadata, workspaceId: bodyWorkspaceId } = body;
    const wsId = bodyWorkspaceId || metadata?.workspaceId;
    const [chat] = await db
      .insert(chats)
      .values({
        id,
        userId: mockUserId,
        workspaceId: wsId,
        title: desc_text || "New Chat",
        model: metadata?.model,
        provider: metadata?.provider,
        ...(timestamp ? { createdAt: new Date(timestamp), updatedAt: new Date() } : {}),
      })
      .onConflictDoUpdate({ target: chats.id, set: { title: desc_text || "New Chat", ...(wsId ? { workspaceId: wsId } : {}), updatedAt: new Date() } })
      .returning();
    if (msgs?.length) {
      const now = Date.now();
      const msgRows = msgs.map((m: any, index: number) => ({
        id: m.id,
        chatId: id,
        role: m.role,
        content: m.content || null,
        parts: m.parts ? JSON.stringify(m.parts) : null,
        createdAt: new Date(now + index),
      }));
      await db.delete(messages).where(eq(messages.chatId, id));
      if (msgRows.length) await db.insert(messages).values(msgRows).onConflictDoNothing();
    }
    return NextResponse.json(chat);
  } catch (e) {
    console.error("POST /api/data/chats error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
