import { redirect } from 'next/navigation';
import { db } from '~/lib/db';
import { googleAdsConnections } from '~/lib/db/schema';
import { and, eq } from 'drizzle-orm';

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
    return redirect(`${redirectPath}?error=${error}`);
  }

  if (!code || !workspaceId) {
    return new Response('Missing code or workspaceId', { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  // Standardize redirect URI to match exact origin without extra query parameters or hash fragments
  const envRedirect = process.env.META_REDIRECT_URI;
  const requestUrl = new URL(request.url);
  const redirectUri = envRedirect || `${requestUrl.protocol}//${requestUrl.host}/api/auth/meta/callback`;

  if (!appId || !appSecret) {
    return new Response('Meta App credentials not configured', { status: 500 });
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('Meta OAuth error:', JSON.stringify(tokens.error, null, 2));
      const errorMsg = encodeURIComponent(tokens.error.message || tokens.error.type || 'oauth_failed');
      return redirect(`${redirectPath}?error=${errorMsg}`);
    }

    const accessToken = tokens.access_token;
    if (!accessToken) {
      return redirect(`${redirectPath}?error=no_token`);
    }

    // Upsert: delete existing meta connection for this workspace, then insert fresh
    await db.delete(googleAdsConnections).where(
      and(
        eq(googleAdsConnections.workspaceId, workspaceId),
        eq(googleAdsConnections.customerId, 'meta')
      )
    );

    await db.insert(googleAdsConnections).values({
      workspaceId,
      refreshToken: accessToken,
      customerId: 'meta',
    });

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
