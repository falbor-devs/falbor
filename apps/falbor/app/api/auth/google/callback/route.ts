import { redirect } from 'next/navigation';
import { db } from '~/lib/db';
import { googleAdsConnections } from '~/lib/db/schema';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  let workspaceId = '';
  let marketId = '';
  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf8'));
      workspaceId = decoded.workspaceId;
      marketId = decoded.marketId;
    }
  } catch (e) {
    console.error('Failed to parse state param');
  }

  const redirectPath = marketId ? `/workspace/${workspaceId}/budget/market/${marketId}` : `/workspace/${workspaceId}/budget`;

  if (error) {
    return redirect(`${redirectPath}?error=${error}`);
  }

  if (!code || !workspaceId) {
    return new Response('Missing code or workspaceId', { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return new Response('Google OAuth credentials not configured', { status: 500 });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Google OAuth Error:', tokens);
      return redirect(`${redirectPath}?error=oauth_failed`);
    }

    if (tokens.refresh_token || tokens.access_token) {
      try {
        await db.insert(googleAdsConnections).values({
          workspaceId,
          refreshToken: tokens.refresh_token || tokens.access_token || 'connected',
        }).onConflictDoNothing();
      } catch (dbErr) {
        console.error('Database save error for Google Ads connection:', dbErr);
      }
    }

    // Redirect back to the workspace budget market page with success flag
    return redirect(`${redirectPath}?success=google_ads_connected`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return redirect(`${redirectPath}?success=google_ads_connected`);
  }
}
