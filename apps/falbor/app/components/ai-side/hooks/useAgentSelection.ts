import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';

export function useAgentSelection(
  workspaceId: string | null,
  onSessionSelect: (sessionId: string, sessionTitle: string) => void,
  onSessionsUpdate: (sessions: Array<{ id: string; title: string; createdAt: Date }>) => void,
) {
  const currentAgent = useStore(aiSidebarStore.currentAgent);
  const [agents, setAgents] = useState<Array<any>>([]);

  useEffect(() => {
    if (workspaceId) {
      import('~/lib/actions/agent').then(({ getAgentsList }) => {
        getAgentsList(workspaceId).then(setAgents);
      });
    }
  }, [workspaceId]);

  const handleSelectAgent = async (agent: any) => {
    if (!workspaceId) return;
    aiSidebarStore.setAgent(agent);
    try {
      const { getOrCreateAgentSessionForAgent, getAgentSessionsList } = await import('~/lib/actions/agentSession');
      const session = await getOrCreateAgentSessionForAgent(workspaceId, agent?.id || null);
      if (session) {
        onSessionSelect(session.id, session.title);
        const remaining = await getAgentSessionsList(workspaceId);
        onSessionsUpdate(remaining);
      }
    } catch (err) {
      console.error('Failed to get or create agent session:', err);
    }
  };

  return {
    agents,
    currentAgent,
    handleSelectAgent,
  };
}
