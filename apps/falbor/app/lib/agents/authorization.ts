import 'server-only';
import { db } from '~/lib/db';
import { agents, users, workspaceMembers, workspaces } from '~/lib/db/schema';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

export type WorkspaceActor = {
  user: typeof users.$inferSelect;
  workspace: typeof workspaces.$inferSelect;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
};

const roleRank: Record<WorkspaceActor['role'], number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export async function getWorkspaceActor(workspaceId: string): Promise<WorkspaceActor | null> {
  const authUser = await getAuthUserDetails();
  if (!authUser?.email) return null;
  const user = await db.query.users.findFirst({ where: (table, helpers) => helpers.eq(table.email, authUser.email) });
  if (!user) return null;
  const workspace = await db.query.workspaces.findFirst({ where: (table, helpers) => helpers.eq(table.id, workspaceId) });
  if (!workspace) return null;
  if (workspace.userId === user.id) return { user, workspace, role: 'owner' };
  const membership = await db.query.workspaceMembers.findFirst({
    where: (table, helpers) => helpers.and(helpers.eq(table.workspaceId, workspaceId), helpers.eq(table.userId, user.id)),
  });
  if (!membership) return null;
  const role = (membership.role as WorkspaceActor['role']) || 'viewer';
  return { user, workspace, role: role in roleRank ? role : 'viewer' };
}

export async function requireWorkspaceActor(workspaceId: string, minimumRole: WorkspaceActor['role'] = 'viewer'): Promise<WorkspaceActor> {
  const actor = await getWorkspaceActor(workspaceId);
  if (!actor || roleRank[actor.role] < roleRank[minimumRole]) throw new Error('Workspace access denied');
  return actor;
}

export async function getAuthorizedAgent(workspaceId: string, agentId: string) {
  const actor = await requireWorkspaceActor(workspaceId);
  const agent = await db.query.agents.findFirst({ where: (table, helpers) => helpers.and(helpers.eq(table.id, agentId), helpers.eq(table.workspaceId, workspaceId)) });
  if (!agent) throw new Error('Agent not found');
  return { actor, agent };
}

export function canAgentUsePermission(agent: typeof agents.$inferSelect, permission: string): boolean {
  if (!Array.isArray(agent.permissions)) return false;
  return agent.permissions.some((value) => typeof value === 'string' && (value === permission || value.toLowerCase() === permission.toLowerCase()));
}

export function assertWorkspaceId(workspaceId: string) {
  if (!workspaceId || workspaceId.length > 255) throw new Error('Invalid workspace');
}
