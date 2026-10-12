import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "~/lib/auth";
import { db } from "~/lib/db";
import { feedbacks } from "~/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ hasSubmitted: false }, { status: 401 });
    }

    const records = await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.userId, userId));

    const hasSubmitted = records.length > 0;

    return NextResponse.json({ hasSubmitted });
  } catch (error) {
    console.error("Failed to check feedback status:", error);
    return NextResponse.json({ hasSubmitted: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { answers, rating } = body;

    if (!answers || !rating || typeof rating.value !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Check if already submitted
    const records = await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.userId, userId));

    if (records.length > 0) {
      return NextResponse.json({ error: "Feedback already submitted" }, { status: 400 });
    }

    // Save the feedback data
    await db.insert(feedbacks).values({
      userId,
      content: answers,
      rating: rating.value,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
