import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { AutomationAuthError, authenticateExtensionRequest } from '~/lib/automation/auth';
import { claimNextTask } from '~/lib/automation/tasks';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

export async function GET(request: Request) {
  try {
    const { installation, workspaceId } = await authenticateExtensionRequest(request);
    const task = await claimNextTask({
      installationId: installation.installationId,
      workspaceId,
    });

    if (!task) return extensionJson({ task: null });

    if (task.type === 'publish_comment') {
      return extensionJson({
        task: {
          id: task.id,
          type: task.type,
          payload: task.payload,
          leaseExpiresAt: task.leaseExpiresAt,
        },
      });
    }

    return extensionJson({
      task: { id: task.id, type: task.type, payload: task.payload },
    });
  } catch (error) {
    if (error instanceof AutomationAuthError) {
      return extensionJson({ error: error.message }, error.status);
    }
    console.error('Extension task claim failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
