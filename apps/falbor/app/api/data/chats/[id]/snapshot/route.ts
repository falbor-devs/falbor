import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { chatSnapshots } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [snap] = await db
      .select()
      .from(chatSnapshots)
      .where(and(eq(chatSnapshots.chatId, params.id), eq(chatSnapshots.userId, userId)))
      .limit(1);
    return NextResponse.json(snap?.files ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (params.id === 'default') {
    return NextResponse.json({ success: true });
  }

  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as any;
    const { snapshot, rewindId } = body;
    
    const [existing] = await db
      .select()
      .from(chatSnapshots)
      .where(and(eq(chatSnapshots.chatId, params.id), eq(chatSnapshots.userId, userId)))
      .limit(1);

    if (rewindId !== undefined) {
      if (existing && existing.files) {
        const existingFiles = existing.files as any;
        const newFilesData = existingFiles.type === 'multi' ? { ...existingFiles } : { type: 'multi', snapshots: { [existingFiles.chatIndex]: existingFiles } };
        newFilesData.rewindId = rewindId;
        await db
          .update(chatSnapshots)
          .set({ files: newFilesData })
          .where(eq(chatSnapshots.id, existing.id));
      }
      return NextResponse.json({ success: true });
    }

    let newFilesData: any;

    if (existing && existing.files) {
      const existingFiles = existing.files as any;
      if (existingFiles.type === 'multi') {
        newFilesData = {
          ...existingFiles,
          snapshots: {
            ...existingFiles.snapshots,
            [snapshot.chatIndex]: snapshot
          }
        };
      } else if (existingFiles.chatIndex) {
        newFilesData = {
          type: 'multi',
          snapshots: {
            [existingFiles.chatIndex]: existingFiles,
            [snapshot.chatIndex]: snapshot
          }
        };
      } else {
        newFilesData = {
          type: 'multi',
          snapshots: {
            [snapshot.chatIndex]: snapshot
          }
        };
      }

      await db
        .update(chatSnapshots)
        .set({ files: newFilesData, summary: snapshot?.summary, createdAt: new Date() })
        .where(eq(chatSnapshots.id, existing.id));
    } else {
      newFilesData = {
        type: 'multi',
        snapshots: {
          [snapshot.chatIndex]: snapshot
        }
      };
      await db.insert(chatSnapshots).values({
        chatId: params.id,
        userId,
        files: newFilesData,
        summary: snapshot?.summary,
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/data/chats/[id]/snapshot error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await db
      .delete(chatSnapshots)
      .where(and(eq(chatSnapshots.chatId, params.id), eq(chatSnapshots.userId, userId)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
