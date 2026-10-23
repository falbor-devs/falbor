'use server';

import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { redditConnections } from '~/lib/db/schema';
import { decrypt } from '~/lib/crypto';
import { assertWorkspaceAccess, getRedditConnection, requireRedditContext } from '~/lib/automation/auth';
import { recordAutomationEvent } from '~/lib/automation/events';
import {
  buildRedditAuthorizeUrl,
  getRedditIdentity,
  getRedditRedirectUri,
  isRedditConfigured,
  revokeRedditToken,
} from '~/lib/automation/reddit';
import { getAutomationStatus as getAutomationStatusSummary } from '~/lib/automation/status';
import { loadProductContext } from '~/lib/automation/context';
import type { ProductContext } from '~/lib/automation/types';

const STATE_COOKIE = 'reddit_oauth_state';
const NOT_CONFIGURED_MESSAGE =
  'Reddit integration is not configured on the server. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.';

function originFromHeaders(): string {
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const host = forwardedHost?.split(',')[0]?.trim() || requestHeaders.get('host');
  const protocol = forwardedProto?.split(',')[0]?.trim() || 'http';
  if (!host) return 'http://localhost:3000';
  return `${protocol}://${host.replace(/\/+$/, '')}`;
}

export async function getAutomationStatus(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);
  return getAutomationStatusSummary(workspaceId);
}

export async function getAutomationProductContext(workspaceId: string): Promise<ProductContext> {
  await assertWorkspaceAccess(workspaceId);
  return loadProductContext(workspaceId);
}

export async function startRedditConnect(workspaceId: string): Promise<{ url: string }> {
  await assertWorkspaceAccess(workspaceId);

  if (!isRedditConfigured()) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  const nonce = randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ workspaceId, nonce })).toString('base64url');

  cookies().set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const redirectUri = getRedditRedirectUri(originFromHeaders());
  const url = buildRedditAuthorizeUrl({ state, redirectUri });
  if (!url) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  return { url };
}

export async function disconnectReddit(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);

  const connection = await getRedditConnection(workspaceId);
  if (connection?.accessTokenEncrypted) {
    try {
      await revokeRedditToken(decrypt(connection.accessTokenEncrypted));
    } catch {
      // Best-effort revocation: the local disconnect must still succeed.
    }
  }

  await db.delete(redditConnections).where(eq(redditConnections.workspaceId, workspaceId));

  await recordAutomationEvent({
    workspaceId,
    type: 'reddit_disconnected',
    message: connection?.username
      ? `Disconnected Reddit account u/${connection.username}.`
      : 'Reddit account disconnected.',
  });

  return { success: true };
}

export async function refreshRedditConnection(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);

  const checkedAt = new Date();
  let status: 'connected' | 'expired' | 'error' = 'connected';
  let username: string | null = null;
  let lastError: string | null = null;

  try {
    const reddit = await requireRedditContext(workspaceId);
    username = reddit.username;

    const identity = await getRedditIdentity(reddit.accessToken);
    if (identity.ok) {
      username = identity.data.name;
      await db
        .update(redditConnections)
        .set({ status: 'connected', username, lastError: null, lastCheckedAt: checkedAt, updatedAt: checkedAt })
        .where(eq(redditConnections.workspaceId, workspaceId));
      await recordAutomationEvent({
        workspaceId,
        type: 'reddit_token_refreshed',
        message: `Reddit connection verified for u/${username}.`,
      });
      return { status, username, lastError: null, checkedAt: checkedAt.toISOString() };
    }

    lastError = identity.error;
    status = identity.status === 401 || identity.status === 403 ? 'expired' : 'error';
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Reddit connection check failed.';
    status = /expired|reconnect/i.test(lastError) ? 'expired' : 'error';
  }

  await db
    .update(redditConnections)
    .set({ status, lastError, lastCheckedAt: checkedAt, updatedAt: checkedAt })
    .where(eq(redditConnections.workspaceId, workspaceId));

  await recordAutomationEvent({
    workspaceId,
    type: 'reddit_connection_error',
    message: `Reddit connection check failed: ${lastError}`,
  });

  return { status, username, lastError, checkedAt: checkedAt.toISOString() };
}
