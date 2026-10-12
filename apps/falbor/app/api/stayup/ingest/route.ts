import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { stayupProjects, stayupIssues, stayupEvents, stayupNotificationRules, stayupNotifications } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { StayUpPayload } from "falbor-stayup-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401, headers: corsHeaders });
    }

    const apiKey = authHeader.split(" ")[1];
    const payload: StayUpPayload = await req.json();

    if (!payload.projectId || !payload.events || !Array.isArray(payload.events)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400, headers: corsHeaders });
    }

    // Authenticate Project
    const project = await db.query.stayupProjects.findFirst({
      where: eq(stayupProjects.apiKey, apiKey)
    });

    if (!project || project.id !== payload.projectId || !project.isActive) {
      return NextResponse.json({ error: "Unauthorized or inactive project" }, { status: 401, headers: corsHeaders });
    }

    // Process events
    for (const event of payload.events) {
      const fingerprint = event.fingerprint || "unknown-fingerprint";

      // Check if issue exists
      let issue = await db.query.stayupIssues.findFirst({
        where: eq(stayupIssues.fingerprint, fingerprint)
      });

      if (issue) {
        // Update existing issue
        const isRegression = issue.status === 'resolved';
        await db.update(stayupIssues)
          .set({
            eventCount: issue.eventCount + 1,
            lastSeen: new Date(),
            ...(isRegression ? { status: 'unresolved', aiAnalysis: null } : {})
          })
          .where(eq(stayupIssues.id, issue.id));
      } else {
        // Create new issue
        const newIssues = await db.insert(stayupIssues).values({
          projectId: project.id,
          fingerprint,
          severity: event.severity || "error",
          title: event.message?.substring(0, 255) || "Unknown Error",
          message: event.message,
          environment: payload.environment || "production",
          eventCount: 1,
          firstSeen: new Date(),
          lastSeen: new Date()
        }).returning();
        issue = newIssues[0];
      }

      // Insert the actual event occurrence
      await db.insert(stayupEvents).values({
        issueId: issue.id,
        projectId: project.id,
        stacktrace: event.stacktrace,
        browserInfo: event.browserInfo,
        url: event.url,
        method: event.method,
        metadata: event.metadata,
        timestamp: new Date(event.timestamp || Date.now())
      });
      // Notification Rules Evaluation
      // If it's a new issue OR a regression, check rules
      const isNew = !issue.id || issue.eventCount === 1;
      const isRegression = issue.status === 'resolved';
      
      if (isNew || isRegression) {
        const activeRules = await db.query.stayupNotificationRules.findMany({
          where: eq(stayupNotificationRules.projectId, project.id)
        });
        
        for (const rule of activeRules) {
          const severities: string[] = rule.severityFilters as string[] || [];
          const environments: string[] = rule.environmentFilters as string[] || [];
          
          const matchesSeverity = severities.length === 0 || severities.includes(event.severity || "error");
          const matchesEnvironment = environments.length === 0 || environments.includes(payload.environment || "production");
          
          if (rule.isActive && matchesSeverity && matchesEnvironment) {
            await db.insert(stayupNotifications).values({
              projectId: project.id,
              issueId: issue.id,
              severity: event.severity || "error",
              title: isRegression ? `Regression: ${issue.title}` : `New Issue: ${issue.title}`,
              message: `Triggered by rule: ${rule.name}`,
            });
            // We only need one notification per issue occurrence
            break;
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: payload.events.length }, { headers: corsHeaders });
  } catch (error) {
    console.error("[StayUp Ingest Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
