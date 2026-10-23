import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { AutomationAuthError, authenticateExtensionRequest } from '~/lib/automation/auth';
import { getExtensionAgentState } from '~/lib/automation/agent';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

export async function GET(request: Request) {
  try {
    const { installation, workspaceId } = await authenticateExtensionRequest(request);
    const state = await getExtensionAgentState(workspaceId, installation.installationId);
    return extensionJson(state);
  } catch (error) {
    if (error instanceof AutomationAuthError) {
      return extensionJson({ error: error.message }, error.status);
    }
    console.error('Extension agent session lookup failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
