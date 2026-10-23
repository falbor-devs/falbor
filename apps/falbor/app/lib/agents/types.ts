export const AGENT_TOOL_KEYS = [
  'workspace.read',
  'web.search',
  'web.verify',
  'browser.use',
  'mcp.use',
] as const;

export const AGENT_PERMISSION_KEYS = [
  'tasks.execute',
  'tasks.delegate',
  'tasks.replan',
  'external.read',
  'external.write',
  'external.send',
  'external.publish',
  'spend.money',
] as const;

export type AgentToolKey = (typeof AGENT_TOOL_KEYS)[number];
export type AgentPermissionKey = (typeof AGENT_PERMISSION_KEYS)[number];

export type AgentConfig = {
  id: string;
  workspaceId: string;
  name: string;
  role: string | null;
  goal: string | null;
  instructions: string | null;
  memory: string | null;
  tools: unknown;
  knowledge: unknown;
  permissions: unknown;
  model: string | null;
};

export type AgentTaskInput = {
  message: string;
  selectedMCPs?: string[];
  browserSessionId?: string;
  browserActiveTabId?: number;
  context?: Record<string, unknown>;
};

export function normalizeKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
}

export function hasKey(value: unknown, key: string): boolean {
  const keys = normalizeKeys(value);
  return keys.includes(key) || keys.some((entry) => entry.toLowerCase() === key.toLowerCase());
}

export function hasAnyKey(value: unknown, keys: string[]): boolean {
  return keys.some((key) => hasKey(value, key));
}
