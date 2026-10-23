import { db } from '~/lib/db';
import { automationSettings } from '~/lib/db/schema';
import { normalizeAgentConfig, type AgentConfig } from './agentCore';

export async function getStoredAgentConfig(workspaceId: string): Promise<AgentConfig> {
  const row = await db.query.automationSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  });
  return normalizeAgentConfig(row?.agentConfig);
}

export async function saveAgentConfig(workspaceId: string, config: unknown): Promise<AgentConfig> {
  const normalized = normalizeAgentConfig(config);
  await db
    .insert(automationSettings)
    .values({ workspaceId, agentConfig: normalized })
    .onConflictDoUpdate({
      target: automationSettings.workspaceId,
      set: { agentConfig: normalized, updatedAt: new Date() },
    });
  return normalized;
}
