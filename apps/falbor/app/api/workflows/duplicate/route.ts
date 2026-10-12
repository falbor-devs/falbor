import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workflows, workflowVersions } from '~/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { workflowId, targetChatId } = await req.json();

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    // Get original workflow
    const [original] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
    if (!original) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Get latest version
    const [latestVersion] = await db.select()
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId))
      .orderBy(desc(workflowVersions.version))
      .limit(1);

    const newChatId = targetChatId !== undefined ? targetChatId : original.chatId;

    // Insert duplicated workflow
    const [clonedWorkflow] = await db.insert(workflows)
      .values({
        name: original.name + ' (Copy)',
        description: original.description,
        userId: original.userId,
        chatId: newChatId,
        status: 'draft',
        thumbnailUrl: original.thumbnailUrl,
      })
      .returning();

    // Insert version if it existed
    if (latestVersion) {
      await db.insert(workflowVersions)
        .values({
          workflowId: clonedWorkflow.id,
          version: 1,
          nodes: latestVersion.nodes,
          edges: latestVersion.edges,
        });
    }

    return NextResponse.json({ success: true, workflowId: clonedWorkflow.id });
  } catch (error: any) {
    console.error('Duplicate workflow error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
