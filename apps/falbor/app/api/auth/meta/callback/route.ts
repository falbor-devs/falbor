import { redirect } from 'next/navigation';
import { db } from '~/lib/db';
import { metaAdAccounts } from '~/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { encrypt } from '~/lib/crypto';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getAdAccounts,
  normalizeAdAccountId,
} from '~/lib/services/metaAds';
import { getCurrentUserId } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  let workspaceId = '';
  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf8'));
      workspaceId = decoded.workspaceId;
    }
  } catch {
    console.error('Failed to parse Meta OAuth state param');
  }

  const redirectPath = `/workspace/${workspaceId}/meta-ads`;

  if (error) {
    return redirect(`${redirectPath}?error=${encodeURIComponent(error)}`);
  }

  if (!code || !workspaceId) {
    return new Response('Missing code or workspaceId', { status: 400 });
  }

  // Verify the caller actually owns (has access to) the workspace encoded in the
  // OAuth state before we attach Meta credentials to it. Prevents account-linking
  // IDOR where a crafted state targets someone else's workspace.
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const workspace = await getAccessibleWorkspace(workspaceId, userId);
  if (!workspace) {
    return new Response('Forbidden: no access to the target workspace', { status: 403 });
  }

  if (!process.env.NEXT_PUBLIC_META_APP_ID || !process.env.META_APP_SECRET) {
    return new Response('Meta App credentials not configured', { status: 500 });
  }

  // Standardize redirect URI to match the exact origin used to start the flow.
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost?.split(',')[0]?.trim() || requestUrl.host;
  const protocol = forwardedProto?.split(',')[0]?.trim() || requestUrl.protocol.replace(':', '');
  const baseRedirectUri = `${protocol}://${host.replace(/\/$/, '')}/api/auth/meta/callback`;
  const redirectUri = (process.env.META_REDIRECT_URI || baseRedirectUri).replace(/\/$/, '');

  try {
    // 1. Code → short-lived user token.
    const shortTokenRes = await exchangeCodeForToken(code, redirectUri);
    if (!shortTokenRes.ok) {
      const msg = encodeURIComponent(shortTokenRes.error.message || 'oauth_failed');
      return redirect(`${redirectPath}?error=${msg}`);
    }

    // 2. Short-lived → long-lived (~60 day) token.
    const longTokenRes = await exchangeForLongLivedToken(shortTokenRes.data.access_token);
    if (!longTokenRes.ok) {
      const msg = encodeURIComponent(longTokenRes.error.message || 'token_exchange_failed');
      return redirect(`${redirectPath}?error=${msg}`);
    }

    const accessToken = longTokenRes.data.access_token;
    const expiresIn = longTokenRes.data.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // 3. Discover the ad accounts this token can access.
    const accountsRes = await getAdAccounts(accessToken);
    if (!accountsRes.ok) {
      const msg = encodeURIComponent(accountsRes.error.message || 'adaccounts_failed');
      return redirect(`${redirectPath}?error=${msg}`);
    }

    const accounts = accountsRes.data || [];
    if (accounts.length === 0) {
      return redirect(`${redirectPath}?error=no_ad_accounts`);
    }

    // Default the enabled account to the configured one if present, else the first.
    const envAccount = process.env.META_AD_ACCOUNT_ID ? normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID) : '';
    let defaultAssigned = false;
    const encryptedToken = encrypt(accessToken);

    // Replace any existing connections for this workspace with the fresh set.
    await db.delete(metaAdAccounts).where(eq(metaAdAccounts.workspaceId, workspaceId));

    for (const account of accounts) {
      const adAccountId = normalizeAdAccountId(account.id || account.account_id || '');
      if (!adAccountId) continue;
      const isEnabled = !defaultAssigned && (envAccount ? adAccountId === envAccount : true);
      if (isEnabled) defaultAssigned = true;

      await db.insert(metaAdAccounts).values({
        workspaceId,
        adAccountId,
        name: account.name || null,
        currency: account.currency || null,
        timezoneName: account.timezone_name || null,
        accountStatus: typeof account.account_status === 'number' ? account.account_status : null,
        isEnabled,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt,
      });
    }

    return redirect(`${redirectPath}?success=meta_ads_connected`);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('Meta OAuth callback error:', err);
    const msg = encodeURIComponent(err?.message || 'server_error');
    return redirect(`${redirectPath}?error=${msg}`);
  }
}
