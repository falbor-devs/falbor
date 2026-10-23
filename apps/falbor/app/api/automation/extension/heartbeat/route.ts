import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { AutomationAuthError, authenticateExtensionRequest } from '~/lib/automation/auth';
import { getAutomationStatus } from '~/lib/automation/status';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

export async function POST(request: Request) {
  try {
    const { workspaceId } = await authenticateExtensionRequest(request);
    const status = await getAutomationStatus(workspaceId);

    return extensionJson({
      ok: true,
      workspaceId,
      reddit: { status: status.reddit.status, username: status.reddit.username },
      tasks: { queued: status.tasks.queued, running: status.tasks.running },
      settings: { enabled: status.settings.enabled, autoDiscovery: status.settings.autoDiscovery },
      counts: {
        awaitingReview: status.counts.awaitingReview,
        draftsAwaitingApproval: status.counts.draftsAwaitingApproval,
      },
    });
  } catch (error) {
    if (error instanceof AutomationAuthError) {
      return extensionJson({ error: error.message }, error.status);
    }
    console.error('Extension heartbeat failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
