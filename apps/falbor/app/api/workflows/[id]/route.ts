import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workflows, workflowVersions } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  headers();
  try {
    const { id } = params;

    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const [latestVersion] = await db.select()
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, id))
      .orderBy(desc(workflowVersions.version))
      .limit(1);

    return NextResponse.json({ 
      success: true, 
      workflow, 
      version: latestVersion || { nodes: [], edges: [] } 
    });
  } catch (error: any) {
    console.error('Get workflow error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
