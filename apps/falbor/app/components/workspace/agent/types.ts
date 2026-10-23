export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  status: 'queued' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  requestor: string;
  createdAt: string;
  resultTitle?: string;
  resultContent?: string;
}

export const AGENT_ICONS = [
  '/icons/agents-icons/Agent-one.svg',
  '/icons/agents-icons/Agent-two.svg',
  '/icons/agents-icons/Agent-three.svg',
  '/icons/agents-icons/Agent-four.svg',
];

export function getAgentIcon(agent: any, index: number = 0): string {
  if (agent?.avatarUrl && agent.avatarUrl.startsWith('/icons/')) {
    return agent.avatarUrl;
  }
  return AGENT_ICONS[index % AGENT_ICONS.length];
}
