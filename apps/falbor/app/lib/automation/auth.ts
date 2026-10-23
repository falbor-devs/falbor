import { and, desc, eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationExtensionInstallations, redditConnections } from '~/lib/db/schema';
import { decrypt, encrypt } from '~/lib/crypto';
import { getCurrentUserId } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';
import { EXTENSION_STALE_MS } from './constants';
import { refreshRedditToken } from './reddit';
import { hashToken } from './tokens';
import type { ExtensionConnectionState, RedditConnectionStatus } from './types';

export class AutomationAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function assertWorkspaceAccess(workspaceId: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new AutomationAuthError(401, 'Unauthorized');
  const workspace = await getAccessibleWorkspace(workspaceId, userId);
  if (!workspace) throw new AutomationAuthError(403, 'Forbidden');
  return userId;
}

export type RedditConnectionRow = typeof redditConnections.$inferSelect;
export type ExtensionInstallationRow = typeof automationExtensionInstallations.$inferSelect;

export async function getRedditConnection(workspaceId: string): Promise<RedditConnectionRow | null> {
  const row = await db.query.redditConnections.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  });
  return row ?? null;
}

export interface RedditContext {
  connection: RedditConnectionRow;
  accessToken: string;
  username: string | null;
  scopes: string[];
}

function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

export async function requireRedditContext(workspaceId: string): Promise<RedditContext> {
  const connection = await getRedditConnection(workspaceId);
  if (!connection || connection.status === 'revoked') {
    throw new Error('Reddit is not connected for this workspace. Connect a Reddit account first.');
  }

  const accessToken = safeDecrypt(connection.accessTokenEncrypted);
  const refreshToken = safeDecrypt(connection.refreshTokenEncrypted);
  const expiresSoon = connection.tokenExpiresAt ? connection.tokenExpiresAt.getTime() - Date.now() < 60_000 : false;

  if (accessToken && !expiresSoon) {
    return {
      connection,
      accessToken,
      username: connection.username,
      scopes: connection.scope ? connection.scope.split(' ').filter(Boolean) : [],
    };
  }

  if (!refreshToken) {
    await db
      .update(redditConnections)
      .set({ status: 'expired', lastError: 'Reddit authorization expired. Reconnect required.', updatedAt: new Date() })
      .where(eq(redditConnections.id, connection.id));
    throw new Error('Reddit authorization expired. Reconnect your Reddit account.');
  }

  const refreshed = await refreshRedditToken(refreshToken);
  if (!refreshed.ok) {
    await db
      .update(redditConnections)
      .set({
        status: refreshed.status === 401 || refreshed.status === 403 ? 'expired' : 'error',
        lastError: refreshed.error,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(redditConnections.id, connection.id));
    throw new Error(
      refreshed.status === 401 || refreshed.status === 403
        ? 'Reddit authorization expired. Reconnect your Reddit account.'
        : `Could not refresh Reddit access: ${refreshed.error}`,
    );
  }

  const nextRefreshToken = refreshed.data.refresh_token || refreshToken;
  const nextExpiresAt = new Date(Date.now() + Math.max(60, refreshed.data.expires_in || 3600) * 1000);
  await db
    .update(redditConnections)
    .set({
      accessTokenEncrypted: encrypt(refreshed.data.access_token),
      refreshTokenEncrypted: encrypt(nextRefreshToken),
      tokenExpiresAt: nextExpiresAt,
      scope: refreshed.data.scope || connection.scope,
      status: 'connected',
      lastError: null,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(redditConnections.id, connection.id));

  return {
    connection: { ...connection, status: 'connected', scope: refreshed.data.scope || connection.scope },
    accessToken: refreshed.data.access_token,
    username: connection.username,
    scopes: (refreshed.data.scope || connection.scope).split(' ').filter(Boolean),
  };
}

export function redditConnectionStatus(connection: RedditConnectionRow | null): RedditConnectionStatus {
  if (!connection) return 'not_connected';
  if (connection.status === 'connected' || connection.status === 'expired' || connection.status === 'revoked' || connection.status === 'error') {
    return connection.status;
  }
  return 'error';
}

export function extensionConnectionState(installation: ExtensionInstallationRow | null): ExtensionConnectionState {
  if (!installation) return 'not_connected';
  if (installation.status === 'revoked') return 'revoked';
  if (!installation.lastSeenAt) return 'stale';
  return Date.now() - installation.lastSeenAt.getTime() <= EXTENSION_STALE_MS ? 'connected' : 'stale';
}

export async function getLatestExtensionInstallation(workspaceId: string): Promise<ExtensionInstallationRow | null> {
  const row = await db.query.automationExtensionInstallations.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
    orderBy: [desc(automationExtensionInstallations.lastSeenAt), desc(automationExtensionInstallations.createdAt)],
  });
  return row ?? null;
}

export interface ExtensionAuthContext {
  installation: ExtensionInstallationRow;
  workspaceId: string;
  userId: string;
}

export async function authenticateExtensionRequest(request: Request): Promise<ExtensionAuthContext> {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) throw new AutomationAuthError(401, 'Missing extension token');
  const tokenHash = hashToken(match[1]);
  const installation = await db.query.automationExtensionInstallations.findFirst({
    where: (t, { eq }) => eq(t.tokenHash, tokenHash),
  });
  if (!installation || installation.status !== 'connected') {
    throw new AutomationAuthError(401, 'Extension token is invalid or revoked');
  }
  await db
    .update(automationExtensionInstallations)
    .set({ lastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(automationExtensionInstallations.id, installation.id));
  return { installation, workspaceId: installation.workspaceId, userId: installation.userId };
}

export async function findActivePairing(codeHash: string) {
  const now = new Date();
  const pairing = await db.query.automationExtensionPairings.findFirst({
    where: (t, { eq, and, gt }) => and(eq(t.codeHash, codeHash), eq(t.status, 'pending'), gt(t.expiresAt, now)),
  });
  return pairing ?? null;
}

export async function revokeExtensionForWorkspace(workspaceId: string, installationId: string, userId: string) {
  const installation = await db.query.automationExtensionInstallations.findFirst({
    where: (t, { eq, and }) => and(eq(t.workspaceId, workspaceId), eq(t.installationId, installationId)),
  });
  if (!installation) throw new Error('Extension connection not found.');
  if (installation.userId !== userId) throw new AutomationAuthError(403, 'Forbidden');
  await db
    .update(automationExtensionInstallations)
    .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(automationExtensionInstallations.id, installation.id));
  return installation;
}

export async function findInstallationByToken(token: string) {
  const tokenHash = hashToken(token);
  return db.query.automationExtensionInstallations.findFirst({
    where: (t, { eq }) => eq(t.tokenHash, tokenHash),
  });
}

export async function revokeAllForUser(userId: string) {
  await db
    .update(automationExtensionInstallations)
    .set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(automationExtensionInstallations.userId, userId), eq(automationExtensionInstallations.status, 'connected')));
}
