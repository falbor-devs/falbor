import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { agentProspects } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const prospects = await db
      .select()
      .from(agentProspects)
      .where(eq(agentProspects.workspaceId, workspaceId))
      .orderBy(desc(agentProspects.createdAt));

    // Map db schema back to what the UI expects
    const mapped = prospects.map(p => ({
      id: p.id,
      prospect: p.name,
      email: p.email,
      company: p.company,
      matchReason: p.matchReason,
      status: p.status,
      messagePreview: p.messagePreview,
      sentAt: p.sentAt,
      lastActivity: p.lastActivity,
      createdAt: p.createdAt
    }));

    return NextResponse.json({ prospects: mapped });
  } catch (error: any) {
    console.error("Failed to fetch prospects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
