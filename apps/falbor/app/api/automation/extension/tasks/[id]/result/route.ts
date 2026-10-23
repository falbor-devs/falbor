import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { automationTasks } from '~/lib/db/schema';
import { AutomationAuthError, authenticateExtensionRequest } from '~/lib/automation/auth';
import { completeTaskFromExtension } from '~/lib/automation/tasks';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

const resultSchema = z.object({
  status: z.enum(['submitted_observed', 'failed', 'outcome_unknown', 'cancelled_by_user']),
  observedText: z.string().max(8000).optional(),
  url: z.string().max(2000).optional(),
  externalId: z.string().max(64).optional(),
  error: z.string().max(1000).optional(),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { installation, workspaceId } = await authenticateExtensionRequest(request);

    if (!UUID_PATTERN.test(params.id)) {
      return extensionJson({ error: 'Task not found.' }, 404);
    }

    const parsed = resultSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return extensionJson({ error: 'Invalid task result.' }, 400);
    }

    const task = await db.query.automationTasks.findFirst({
      where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.id, params.id)),
    });
    if (!task) {
      return extensionJson({ error: 'Task not found.' }, 404);
    }
    if (task.installationId !== installation.installationId) {
      return extensionJson({ error: 'This task belongs to another extension installation.' }, 403);
    }

    const outcome = await completeTaskFromExtension({
      task,
      installation: { installationId: installation.installationId, workspaceId },
      result: parsed.data,
    });

    return extensionJson({ ok: true, ...outcome });
  } catch (error) {
    if (error instanceof AutomationAuthError) {
      return extensionJson({ error: error.message }, error.status);
    }
    console.error('Extension task result failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
