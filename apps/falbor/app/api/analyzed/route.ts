import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "~/lib/auth";
import { db } from "~/lib/db";
import { analyzedReports } from "~/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, problem, targetAudience, rawAnalysis, isPublic, chatId } = body;

    // Generate a random 6-character alphanumeric ID
    const id = Math.random().toString(36).substring(2, 8);

    await db.insert(analyzedReports).values({
      id,
      userId,
      chatId,
      title: title || "New Idea",
      problem: problem || "",
      targetAudience: targetAudience || "",
      rawAnalysis: rawAnalysis || "",
      isPublic: !!isPublic,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to create analyzed report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isPublic } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // Check ownership
    const records = await db.select().from(analyzedReports).where(eq(analyzedReports.id, id));
    if (records.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (records[0].userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.update(analyzedReports).set({ isPublic }).where(eq(analyzedReports.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update analyzed report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
