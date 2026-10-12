import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { creatorConnectedAccounts } from '~/lib/db/schema';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform') || 'Twitter';
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');

  // If user cancelled OAuth or provider returned error, redirect with error status
  if (oauthError || !code) {
    console.error(`OAuth error for ${platform}:`, oauthError || 'No authorization code returned');
    return NextResponse.redirect(new URL('/?tab=social-connection&oauth_error=' + encodeURIComponent(oauthError || 'missing_code'), req.url));
  }

  try {
    const authUser = await getAuthUserDetails();
    if (!authUser) {
      return NextResponse.redirect(new URL('/?tab=social-connection&oauth_error=unauthorized', req.url));
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, authUser.email),
    });

    if (!user) {
      return NextResponse.redirect(new URL('/?tab=social-connection&oauth_error=user_not_found', req.url));
    }

    let platformUserId = `id_${Date.now()}`;
    let platformUsername = `${platform} User`;
    let platformEmail = authUser.email;

    // Fetch user profile from provider API if environment credentials are provided
    if (platform === 'LinkedIn' && process.env.LINKEDIN_CLIENT_SECRET) {
      try {
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.LINKEDIN_CLIENT_ID || '',
            client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
            redirect_uri: 'https://localhost:3000/api/auth/callback/social?platform=LinkedIn',
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const userData = await userRes.json();
          if (userData.sub) {
            platformUserId = userData.sub;
            platformUsername = userData.name || userData.email || 'LinkedIn Member';
            platformEmail = userData.email || authUser.email;
          }
        }
      } catch (e) {
        console.error('LinkedIn userinfo fetch error:', e);
      }
    }

    await db.insert(creatorConnectedAccounts).values({
      id: uuidv4(),
      userId: user.id,
      platform,
      platformUserId,
      platformUsername,
      platformEmail,
      accessTokenEncrypted: code,
      autoPublish: true,
      postsPerDay: 3,
      intervalMinutes: 180,
    });

    return NextResponse.redirect(new URL('/?tab=social-connection&connected=true', req.url));
  } catch (error) {
    console.error('Failed to handle OAuth callback:', error);
    return NextResponse.redirect(new URL('/?tab=social-connection&oauth_error=server_error', req.url));
  }
}
