import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { analyzedFeedbacks, analyzedReports } from "~/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, wouldUse, feedbackText } = body;

    if (!reportId || typeof wouldUse !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Verify report exists
    const records = await db.select().from(analyzedReports).where(eq(analyzedReports.id, reportId));
    if (records.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.insert(analyzedFeedbacks).values({
      reportId,
      wouldUse,
      feedbackText: feedbackText || "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to submit analyzed feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
