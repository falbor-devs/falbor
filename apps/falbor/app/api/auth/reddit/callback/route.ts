import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '~/lib/db';
import { redditConnections } from '~/lib/db/schema';
import { encrypt } from '~/lib/crypto';
import { recordAutomationEvent } from '~/lib/automation/events';
import { exchangeRedditCode, getRedditIdentity, getRedditRedirectUri } from '~/lib/automation/reddit';
import { getCurrentUserId } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'reddit_oauth_state';

interface RedditOAuthState {
  workspaceId: string;
  nonce: string;
}

function normalizedOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost?.split(',')[0]?.trim() || requestUrl.host;
  const protocol = forwardedProto?.split(',')[0]?.trim() || requestUrl.protocol.replace(':', '');
  return `${protocol}://${host.replace(/\/+$/, '')}`;
}

function decodeState(value: string | null): RedditOAuthState | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded !== 'object') return null;
    const workspaceId = typeof decoded.workspaceId === 'string' ? decoded.workspaceId : '';
    const nonce = typeof decoded.nonce === 'string' ? decoded.nonce : '';
    if (!workspaceId || !nonce) return null;
    return { workspaceId, nonce };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = decodeState(searchParams.get('state'));
  const errorParam = searchParams.get('error');
  const workspaceId = state?.workspaceId || '';
  const redirectPath = `/workspace/${workspaceId}/automation`;

  const cookiesStore = cookies();
  const storedNonce = cookiesStore.get(STATE_COOKIE)?.value || null;
  cookiesStore.delete(STATE_COOKIE);

  if (!state || !storedNonce || state.nonce !== storedNonce) {
    redirect(`${redirectPath}?error=reddit_state_mismatch`);
  }

  if (errorParam) {
    redirect(`${redirectPath}?error=reddit_denied`);
  }

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const workspace = await getAccessibleWorkspace(workspaceId, userId);
  if (!workspace) {
    return new Response('Forbidden: no access to the target workspace', { status: 403 });
  }

  try {
    const redirectUri = getRedditRedirectUri(normalizedOrigin(request));

    const tokens = await exchangeRedditCode(code, redirectUri);
    if (!tokens.ok) {
      redirect(`${redirectPath}?error=reddit_token_exchange_failed&message=${encodeURIComponent(tokens.error)}`);
    }

    const identity = await getRedditIdentity(tokens.data.access_token);
    if (!identity.ok) {
      redirect(`${redirectPath}?error=reddit_identity_failed&message=${encodeURIComponent(identity.error)}`);
    }

    const now = new Date();
    const connectionValues = {
      connectedByUserId: userId,
      redditUserId: identity.data.id || null,
      username: identity.data.name,
      scope: tokens.data.scope || '',
      accessTokenEncrypted: encrypt(tokens.data.access_token),
      refreshTokenEncrypted: tokens.data.refresh_token ? encrypt(tokens.data.refresh_token) : null,
      tokenExpiresAt: tokens.data.expires_in ? new Date(now.getTime() + tokens.data.expires_in * 1000) : null,
      status: 'connected',
      lastError: null,
      lastCheckedAt: now,
      updatedAt: now,
    };

    await db
      .insert(redditConnections)
      .values({ workspaceId, ...connectionValues })
      .onConflictDoUpdate({
        target: redditConnections.workspaceId,
        set: connectionValues,
      });

    await recordAutomationEvent({
      workspaceId,
      userId,
      type: 'reddit_connected',
      message: `Connected Reddit account u/${identity.data.name}.`,
    });

    redirect(`${redirectPath}?success=reddit_connected`);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Reddit OAuth callback error:', err);
    redirect(`${redirectPath}?error=${encodeURIComponent(err?.message || 'server_error')}`);
  }
}
