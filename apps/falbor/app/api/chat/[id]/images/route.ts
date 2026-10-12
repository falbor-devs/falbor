import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { chatImages, chats } from "~/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "~/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    if (!chatId) {
      return NextResponse.json({ error: "Missing chat ID" }, { status: 400 });
    }

    const images = await db.select().from(chatImages).where(eq(chatImages.chatId, chatId));
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    if (!chatId) {
      return NextResponse.json({ error: "Missing chat ID" }, { status: 400 });
    }

    const { filePath, base64Data } = await req.json();

    if (!filePath || !base64Data) {
      return NextResponse.json({ error: "Missing filePath or base64Data" }, { status: 400 });
    }

    // Ensure the chat exists to satisfy the foreign key constraint
    const existingChat = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    if (existingChat.length === 0) {
       const userId = await getUserId(req);
       if (!userId) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
       }
       // Insert a placeholder chat row so we can safely insert the image
       await db.insert(chats).values({
         id: chatId,
         userId,
         title: "New Chat",
       });
    }

    // Upsert logic - check if image exists
    const existing = await db
      .select()
      .from(chatImages)
      .where(and(eq(chatImages.chatId, chatId), eq(chatImages.filePath, filePath)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(chatImages)
        .set({ base64Data })
        .where(eq(chatImages.id, existing[0].id));
    } else {
      await db.insert(chatImages).values({
        chatId,
        filePath,
        base64Data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving image:", error);
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
  }
}
