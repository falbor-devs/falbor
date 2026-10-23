import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { AutomationAuthError, authenticateExtensionRequest } from '~/lib/automation/auth';
import { AgentConflictError, observeFromExtension, observePayloadSchema } from '~/lib/automation/agent';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

export async function POST(request: Request) {
  try {
    const { installation, workspaceId, userId } = await authenticateExtensionRequest(request);
    const body = await request.json().catch(() => null);
    const parsed = observePayloadSchema.safeParse(body);
    if (!parsed.success) return extensionJson({ error: 'Invalid observation payload.' }, 400);

    const result = await observeFromExtension({
      workspaceId,
      installationId: installation.installationId,
      userId,
      payload: parsed.data,
    });
    return extensionJson(result);
  } catch (error) {
    if (error instanceof AgentConflictError) {
      return extensionJson({ error: error.message, stale: true, session: error.session }, error.status);
    }
    if (error instanceof AutomationAuthError) {
      return extensionJson({ error: error.message }, error.status);
    }
    console.error('Extension agent observation failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
