import { db } from '~/lib/db';
import { metaAdAccounts } from '~/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { decrypt } from '~/lib/crypto';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

export type MetaContext = {
  userId: string;
  workspaceId: string;
  adAccountId: string;
  metaAccountId: string;
  accountName: string | null;
  accessToken: string;
};

export async function getCurrentUserId(): Promise<string | null> {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user?.id || null;
}

/** Decrypt a stored Meta access token. Tolerates legacy plaintext values. */
export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decrypt(stored);
  } catch {
    // Legacy rows may hold plaintext tokens.
    return stored;
  }
}

export async function listWorkspaceMetaAccounts(workspaceId: string) {
  return db.query.metaAdAccounts.findMany({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(metaAdAccounts.updatedAt)],
  });
}

/**
 * Resolve the active Meta ad account for a workspace after verifying the caller
 * has access. Prefers the account flagged as enabled, otherwise the most recent.
 * Throws on missing auth/connection so callers can surface a clean message.
 */
export async function requireMetaContext(workspaceId: string, adAccountId?: string): Promise<MetaContext> {
  if (!workspaceId) throw new Error('workspaceId is required');

  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await getAccessibleWorkspace(workspaceId, userId);
  if (!workspace) throw new Error('Forbidden');

  let account;
  if (adAccountId) {
    account = await db.query.metaAdAccounts.findFirst({
      where: and(eq(metaAdAccounts.workspaceId, workspaceId), eq(metaAdAccounts.adAccountId, adAccountId)),
    });
  } else {
    account = await db.query.metaAdAccounts.findFirst({
      where: and(eq(metaAdAccounts.workspaceId, workspaceId), eq(metaAdAccounts.isEnabled, true)),
    });
    if (!account) {
      account = await db.query.metaAdAccounts.findFirst({
        where: eq(metaAdAccounts.workspaceId, workspaceId),
        orderBy: [desc(metaAdAccounts.updatedAt)],
      });
    }
  }

  if (!account) throw new Error('Meta account not connected. Please connect your Meta account first.');

  const accessToken = decryptToken(account.accessTokenEncrypted);
  if (!accessToken) throw new Error('Meta access token missing. Please reconnect your Meta account.');

  return {
    userId,
    workspaceId,
    adAccountId: account.adAccountId,
    metaAccountId: account.id,
    accountName: account.name,
    accessToken,
  };
}
