'use server';

import { assertWorkspaceAccess } from '~/lib/automation/auth';
import {
  controlAgentSession,
  type AgentSessionView,
} from '~/lib/automation/agent';
import type { AgentConfig } from '~/lib/automation/agentCore';

export async function startAgent(workspaceId: string, config?: AgentConfig): Promise<AgentSessionView> {
  const userId = await assertWorkspaceAccess(workspaceId);
  return controlAgentSession({
    workspaceId,
    userId,
    installationId: null,
    payload: { action: 'start', config },
  });
}

export async function pauseAgent(workspaceId: string): Promise<AgentSessionView> {
  const userId = await assertWorkspaceAccess(workspaceId);
  return controlAgentSession({
    workspaceId,
    userId,
    installationId: null,
    payload: { action: 'pause' },
  });
}

export async function resumeAgent(workspaceId: string): Promise<AgentSessionView> {
  const userId = await assertWorkspaceAccess(workspaceId);
  return controlAgentSession({
    workspaceId,
    userId,
    installationId: null,
    payload: { action: 'resume' },
  });
}

export async function stopAgent(workspaceId: string): Promise<AgentSessionView> {
  const userId = await assertWorkspaceAccess(workspaceId);
  return controlAgentSession({
    workspaceId,
    userId,
    installationId: null,
    payload: { action: 'stop' },
  });
}
