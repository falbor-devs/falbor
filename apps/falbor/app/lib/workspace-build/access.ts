import { db } from '~/lib/db';

export async function getAccessibleWorkspace(workspaceId: string, userId: string) {
  if (!workspaceId || !userId) return null;

  try {
    const workspace = await db.query.workspaces.findFirst({
      where: (w, { eq }) => eq(w.id, workspaceId),
    });

    if (!workspace) {
      return null;
    }

    if (workspace.userId === userId) {
      return workspace;
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId)),
    });

    return membership ? workspace : null;
  } catch (error) {
    console.error("Error checking workspace access:", error);
    return null;
  }
}
