import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { chats, messages, chatSnapshots, userPreferences } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { chats?: any[]; settings?: Record<string, any> };
    const { chats: importedChats, settings } = body;

    const results = { chatsImported: 0, settingsImported: 0, errors: [] as string[] };

    if (Array.isArray(importedChats)) {
      for (const chat of importedChats) {
        try {
          const description = chat.description || chat.title || "Imported Chat";
          await db
            .insert(chats)
            .values({
              id: chat.id,
              userId,
              title: description,
              description,
              createdAt: chat.timestamp ? new Date(chat.timestamp) : new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoNothing();

          if (Array.isArray(chat.messages)) {
            const now = Date.now();
            const msgRows = chat.messages.map((m: any, idx: number) => ({
              id: m.id || `${chat.id}-msg-${idx}`,
              chatId: chat.id,
              role: m.role || "user",
              content: m.content || null,
              parts: m.parts ? JSON.stringify(m.parts) : null,
              createdAt: new Date(now + idx),
            }));
            await db.delete(messages).where(eq(messages.chatId, chat.id));
            if (msgRows.length) await db.insert(messages).values(msgRows);
          }

          if (chat.snapshot) {
            await db
              .insert(chatSnapshots)
              .values({
                chatId: chat.id,
                userId,
                files: chat.snapshot.files || chat.snapshot,
                summary: chat.snapshot.summary,
              })
              .onConflictDoNothing();
          }

          results.chatsImported++;
        } catch (e) {
          results.errors.push(`Chat ${chat.id}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    if (settings && typeof settings === "object") {
      for (const [key, value] of Object.entries(settings)) {
        try {
          if (!key.startsWith("__") && key !== "_meta" && key !== "_raw") {
            const [existing] = await db
              .select()
              .from(userPreferences)
              .where(and(eq(userPreferences.userId, userId), eq(userPreferences.key, key)))
              .limit(1);

            if (existing) {
              await db
                .update(userPreferences)
                .set({ value, updatedAt: new Date() })
                .where(eq(userPreferences.id, existing.id));
            } else {
              await db.insert(userPreferences).values({ userId, key, value });
            }
            results.settingsImported++;
          }
        } catch (e) {
          results.errors.push(`Setting ${key}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    console.error("Migrate error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
