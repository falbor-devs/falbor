import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { stayupIssues, stayupEvents, stayupHealthScans } from "~/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Fetch the last 24 hours of activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentIssues = await db.query.stayupIssues.findMany({
      where: and(
        eq(stayupIssues.projectId, projectId),
        gte(stayupIssues.lastSeen, oneDayAgo)
      ),
      orderBy: [desc(stayupIssues.lastSeen)],
      limit: 20
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API Key is missing" }, { status: 500 });
    }

    const systemPrompt = `You are the StayUp Application Health Scanner. Your job is to analyze recent error patterns, repeated warnings, unresolved issues, and regressions across a project to determine its overall health.
Return your response in strict JSON format with exactly these keys:
{
  "summary": "A high-level summary (e.g., 'Your application is healthy' or '3 issues need attention' or 'A critical regression was detected').",
  "status": "healthy, warning, or critical",
  "details": {
    "trends": "Description of any emerging trends or patterns.",
    "topConcerns": ["Concern 1", "Concern 2"],
    "recommendations": ["Rec 1", "Rec 2"]
  }
}`;

    const userPrompt = `Project Recent Issues (Last 24h):
${JSON.stringify(recentIssues.map(i => ({ 
  title: i.title, 
  severity: i.severity, 
  status: i.status, 
  eventCount: i.eventCount 
})), null, 2)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to generate health scan via AI" }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Save the scan result to the database
    const newScans = await db.insert(stayupHealthScans).values({
      projectId,
      summary: result.summary,
      status: result.status,
      details: result.details
    }).returning();

    return NextResponse.json({ success: true, scan: newScans[0] });
  } catch (error) {
    console.error("[StayUp Health Scan Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
