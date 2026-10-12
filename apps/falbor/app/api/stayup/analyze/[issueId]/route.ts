import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { stayupIssues, stayupEvents } from "~/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { issueId: string } }) {
  try {
    const issueId = params.issueId;

    // Fetch the issue and its latest events
    const issue = await db.query.stayupIssues.findFirst({
      where: eq(stayupIssues.id, issueId)
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const events = await db.query.stayupEvents.findMany({
      where: eq(stayupEvents.issueId, issueId),
      orderBy: [desc(stayupEvents.timestamp)],
      limit: 5 // Provide the last 5 events for context
    });

    // Error Correlation: Fetch other recent events in the project from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtherEvents = await db.query.stayupEvents.findMany({
      where: and(
        eq(stayupEvents.projectId, issue.projectId),
        gte(stayupEvents.timestamp, oneHourAgo)
      ),
      orderBy: [desc(stayupEvents.timestamp)],
      limit: 15
    });

    // Filter out the events from the current issue to only pass "related" events
    const correlatedEvents = recentOtherEvents.filter(e => e.issueId !== issueId);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API Key is missing" }, { status: 500 });
    }

    const systemPrompt = `You are the StayUp AI Debugging Engine, an expert senior developer debugging application errors.
Your primary responsibility is analysis, explanation, and generation of safe actionable instructions. 
You must never claim that a fix is guaranteed. Clearly distinguish observed facts from assumptions.
You should attempt to identify if the current issue is caused by upstream failures by looking at "Correlated Recent Events".

Analyze the error and return your response in strict JSON format with exactly these keys:
{
  "title": "A concise issue title",
  "severity": "debug, info, warning, error, or critical",
  "explanation": "Explanation of what happened",
  "rootCause": "The probable root cause (distinguish facts from assumptions)",
  "affectedComponent": "The affected component or file (if it can be determined)",
  "evidence": "Evidence supporting the diagnosis",
  "recommendedFix": "High level recommended fix",
  "stepByStepInstructions": ["Step 1", "Step 2", "Step 3"],
  "confidenceLevel": "High, Medium, or Low",
  "aiPrompt": "A ready-to-use prompt containing technical context specifically written for the customer's AI coding agent to implement the fix."
}`;

    const userPrompt = `Target Issue Title: ${issue.title}
Message: ${issue.message}
Target Issue Events: ${JSON.stringify(events.map(e => ({ stacktrace: e.stacktrace, url: e.url, browser: e.browserInfo })), null, 2)}
Correlated Recent Events (from other issues in same project): ${JSON.stringify(correlatedEvents.map(e => ({ url: e.url, timestamp: e.timestamp })), null, 2)}`;

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
      const err = await response.json();
      console.error("[StayUp AI Error]", err);
      return NextResponse.json({ error: "Failed to analyze issue via AI" }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Save back to DB
    await db.update(stayupIssues)
      .set({
        aiAnalysis: result,
        aiAnalyzedAt: new Date()
      })
      .where(eq(stayupIssues.id, issueId));

    return NextResponse.json({ success: true, analysis: result });
  } catch (error) {
    console.error("[StayUp Analyze Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
