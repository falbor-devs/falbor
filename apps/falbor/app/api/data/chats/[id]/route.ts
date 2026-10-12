import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { chats, messages } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [chat] = await db.select().from(chats).where(eq(chats.id, params.id)).limit(1);
    if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const msgs = await db.select().from(messages).where(eq(messages.chatId, params.id)).orderBy(messages.createdAt);
    const result = {
      id: chat.id,
      userId: chat.userId,
      workspaceId: chat.workspaceId,
      isPublic: chat.isPublic,
      urlId: chat.id,
      title: chat.title,
      description: chat.description,
      timestamp: chat.createdAt?.toISOString(),
      metadata: {},
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: m.parts ? (typeof m.parts === "string" ? JSON.parse(m.parts) : m.parts) : undefined,
      })),
    };
    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/data/chats/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await db.delete(messages).where(eq(messages.chatId, params.id));
    await db.delete(chats).where(eq(chats.id, params.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/data/chats/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
