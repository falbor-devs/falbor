'use server';

import { assertWorkspaceAccess } from '~/lib/automation/auth';
import { saveAgentConfig } from '~/lib/automation/agentSettings';
import type { AgentConfig } from '~/lib/automation/agentCore';

export async function updateAgentConfig(workspaceId: string, config: AgentConfig): Promise<AgentConfig> {
  await assertWorkspaceAccess(workspaceId);
  return saveAgentConfig(workspaceId, config);
}
