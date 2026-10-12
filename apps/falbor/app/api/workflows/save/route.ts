import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workflows, workflowVersions } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withSecurity } from '~/lib/security';
import { requireUser, requireWorkflowAccess, handleAuthError } from '~/lib/auth/auth-helpers';

const savePost = withSecurity(async ({ request }) => {
  try {
    const { workflowId, name, description, nodes, edges, thumbnailUrl, chatId } = await request.json();

    const userId = await requireUser();
    let currentWorkflowId = workflowId;
    let version = 1;

    if (!currentWorkflowId) {
      // Create new workflow for authenticated user
      const [newWorkflow] = await db.insert(workflows)
        .values({
          name: name || 'Untitled Workflow',
          description: description || '',
          userId: userId,
          chatId: chatId || null,
          status: 'draft',
          thumbnailUrl: thumbnailUrl || null,
        })
        .returning();
      currentWorkflowId = newWorkflow.id;
    } else {
      // Verify workflow access/ownership
      await requireWorkflowAccess(currentWorkflowId);

      // Update the existing workflow
      await db.update(workflows)
        .set({
          name: name || 'Untitled Workflow',
          description: description || '',
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, currentWorkflowId));

      // Get current version to increment
      const versions = await db.select()
        .from(workflowVersions)
        .where(eq(workflowVersions.workflowId, currentWorkflowId))
        .orderBy(workflowVersions.version);
        
      if (versions.length > 0) {
        version = versions[versions.length - 1].version + 1;
      }
    }

    // Insert new version
    const [newVersion] = await db.insert(workflowVersions)
      .values({
        workflowId: currentWorkflowId,
        version,
        nodes,
        edges,
      })
      .returning();

    return NextResponse.json({ success: true, workflowId: currentWorkflowId, versionId: newVersion.id });
  } catch (error: any) {
    if (error.status) return handleAuthError(error);
    console.error('Save workflow error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

export async function POST(request: Request) {
  return savePost({ request, context: { env: process.env as any } });
}

