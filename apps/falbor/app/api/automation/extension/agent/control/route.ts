import { extensionJson, extensionPreflight } from '~/lib/automation/http';
import { AutomationAuthError, authenticateExtensionRequest } from '~/lib/automation/auth';
import {
  AgentConflictError,
  controlAgentSession,
  controlPayloadSchema,
} from '~/lib/automation/agent';
import { AUTONOMOUS_SUBMISSION_AUTHORIZED } from '~/lib/automation/agentCore';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return extensionPreflight();
}

export async function POST(request: Request) {
  try {
    const { installation, workspaceId, userId } = await authenticateExtensionRequest(request);
    const body = await request.json().catch(() => null);
    const parsed = controlPayloadSchema.safeParse(body);
    if (!parsed.success) return extensionJson({ error: 'Invalid control payload.' }, 400);

    const session = await controlAgentSession({
      workspaceId,
      userId,
      installationId: installation.installationId,
      payload: parsed.data,
    });
    return extensionJson({
      session,
      policy: { autonomousSubmissionAuthorized: AUTONOMOUS_SUBMISSION_AUTHORIZED },
    });
  } catch (error) {
    if (error instanceof AgentConflictError) {
      return extensionJson({ error: error.message, stale: true, session: error.session }, error.status);
    }
    if (error instanceof AutomationAuthError) {
      return extensionJson({ error: error.message }, error.status);
    }
    console.error('Extension agent control failed:', error);
    return extensionJson({ error: 'Internal error' }, 500);
  }
}
