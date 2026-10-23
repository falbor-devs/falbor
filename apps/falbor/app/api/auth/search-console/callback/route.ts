import { redirect } from 'next/navigation';
import { db } from '~/lib/db';
import { googleOAuthTokens, users } from '~/lib/db/schema';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { requireWorkspaceActor } from '~/lib/agents/authorization';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  let workspaceId = '';
  try {
    workspaceId = JSON.parse(Buffer.from(state || '', 'base64url').toString('utf8')).workspaceId || '';
  } catch {
    return new Response('Invalid OAuth state', { status: 400 });
  }
  const target = `/workspace/${workspaceId}/demand-capture`;
  if (!code || !workspaceId) return redirect(`${target}?error=oauth_failed`);
  try {
    await requireWorkspaceActor(workspaceId, 'editor');
  } catch {
    return redirect(`${target}?error=unauthorized`);
  }
  const authUser = await getAuthUserDetails();
  if (!authUser?.email) return redirect(`${target}?error=unauthorized`);
  const user = await db.query.users.findFirst({ where: (table, { eq }) => eq(table.email, authUser.email) });
  if (!user) return redirect(`${target}?error=unauthorized`);
  const redirectUri = process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/search-console/callback`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) return redirect(`${target}?error=oauth_failed`);
  await db.insert(googleOAuthTokens).values({ userId: user.id, accessToken: tokens.access_token, refreshToken: tokens.refresh_token || null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, scope: tokens.scope || 'https://www.googleapis.com/auth/webmasters.readonly' }).onConflictDoUpdate({ target: googleOAuthTokens.userId, set: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token || undefined, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined, scope: tokens.scope || 'https://www.googleapis.com/auth/webmasters.readonly', updatedAt: new Date() } });
  return redirect(`${target}?connected=1`);
}
