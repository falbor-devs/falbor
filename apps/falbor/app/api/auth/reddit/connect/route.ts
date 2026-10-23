import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buildRedditAuthorizeUrl, getRedditRedirectUri, isRedditConfigured } from '~/lib/automation/reddit';
import { getCurrentUserId } from '~/lib/services/metaAuth';
import { getAccessibleWorkspace } from '~/lib/workspace-build/access';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'reddit_oauth_state';

function normalizedOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost?.split(',')[0]?.trim() || requestUrl.host;
  const protocol = forwardedProto?.split(',')[0]?.trim() || requestUrl.protocol.replace(':', '');
  return `${protocol}://${host.replace(/\/+$/, '')}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') || '';
  const redirectPath = `/workspace/${workspaceId}/automation`;

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL(`${redirectPath}?error=forbidden`, request.url));
  }

  const workspace = workspaceId ? await getAccessibleWorkspace(workspaceId, userId) : null;
  if (!workspace) {
    return NextResponse.redirect(new URL(`${redirectPath}?error=forbidden`, request.url));
  }

  if (!isRedditConfigured()) {
    return NextResponse.redirect(new URL(`${redirectPath}?error=reddit_not_configured`, request.url));
  }

  const nonce = randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ workspaceId, nonce })).toString('base64url');
  const redirectUri = getRedditRedirectUri(normalizedOrigin(request));
  const authorizeUrl = buildRedditAuthorizeUrl({ state, redirectUri });

  if (!authorizeUrl) {
    return NextResponse.redirect(new URL(`${redirectPath}?error=reddit_not_configured`, request.url));
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
