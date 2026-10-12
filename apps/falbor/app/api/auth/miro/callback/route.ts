import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.redirect(new URL('/?error=Unauthorized', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateStr = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Miro Auth Error:', error);
      return NextResponse.redirect(new URL('/?error=MiroAuthFailed', request.url));
    }

    if (!code || !stateStr) {
      return NextResponse.redirect(new URL('/?error=MissingParams', request.url));
    }

    let state;
    try {
      state = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
    } catch (err) {
      return NextResponse.redirect(new URL('/?error=InvalidState', request.url));
    }

    if (state.userId !== userId) {
      return NextResponse.redirect(new URL('/?error=InvalidState', request.url));
    }

    const clientId = process.env.MIRO_CLIENT_ID;
    const clientSecret = process.env.MIRO_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.MIRO_REDIRECT_URI_PROD 
      : process.env.MIRO_REDIRECT_URI_LOCAL;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(new URL('/?error=MissingMiroConfig', request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.miro.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Miro Token Error:', tokenData);
      return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', request.url));
    }

    // Attempt to fetch user profile info
    if (tokenData.access_token) {
      try {
        const userInfoRes = await fetch('https://api.miro.com/v1/users/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userInfo = await userInfoRes.json();
        if (userInfoRes.ok) {
          tokenData.authed_user = {
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email
          };
        }
      } catch (err) {
        console.error('Failed to fetch Miro user info:', err);
      }
    }

    // Insert new connection
    await db.insert(mcpConnections).values({
      userId,
      connectorId: 'miro',
      name: state.name || 'Miro Connection',
      config: tokenData,
      status: 'active',
    });

    return NextResponse.redirect(new URL('/?tab=mcp', request.url));
  } catch (error) {
    console.error('Miro Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=CallbackFailed', request.url));
  }
}
