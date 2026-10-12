import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('--- Gmail OAuth Callback Initiated ---');
  console.log('URL:', request.url);
  
  try {
    let userId = await getUserId(request);
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateStr = searchParams.get('state');
    const error = searchParams.get('error');

    let state: any = null;
    if (stateStr) {
      try {
        state = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
      } catch (e) {
        console.error('Failed to parse OAuth state:', e);
      }
    }

    if (!userId && state?.userId) {
      userId = state.userId;
    }

    console.log('Resolved userId:', userId);

    if (!userId) {
      console.error('Gmail OAuth: Unauthorized (no userId)');
      return NextResponse.redirect(new URL('/?error=Unauthorized', request.url));
    }

    if (error) {
      console.error('Gmail Auth Error from Google:', error);
      return NextResponse.redirect(new URL('/?error=GmailAuthFailed', request.url));
    }

    if (!code || !stateStr) {
      console.error('Gmail OAuth: Missing code or state');
      return NextResponse.redirect(new URL('/?error=MissingParams', request.url));
    }

    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.GMAIL_REDIRECT_URI_PROD 
      : process.env.GMAIL_REDIRECT_URI_LOCAL;

    console.log('Client ID present:', !!clientId);
    console.log('Redirect URI:', redirectUri);

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Gmail OAuth: Missing environment configuration');
      return NextResponse.redirect(new URL('/?error=MissingGmailConfig', request.url));
    }

    // Exchange the code for an access/refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Gmail Token Error:', tokenData);
      return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', request.url));
    }

    // Attempt to fetch user info from Google
    if (tokenData.access_token) {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          tokenData.authed_user = {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture,
          };
        }
      } catch (err) {
        console.error('Failed to fetch Gmail user info:', err);
      }
    }

    // Save connection to database
    try {
      if (state?.connectionId) {
        await db.update(mcpConnections)
          .set({ config: tokenData, updatedAt: new Date() })
          .where(and(eq(mcpConnections.id, state.connectionId), eq(mcpConnections.userId, userId)));
      } else {
        await db.insert(mcpConnections).values({
          userId,
          connectorId: 'gmail',
          name: state?.name || 'Gmail Connection',
          config: tokenData,
          status: 'active',
        });
      }
      console.log('Saved Gmail connection into DB');
    } catch (dbErr) {
      console.error('Failed to save Gmail connection to DB:', dbErr);
    }

    const redirectUrl = state?.returnPath || '/?tab=mcp';
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    if (!request.cookies.get('session') && userId) {
      const { createToken } = await import('~/lib/auth');
      const token = await createToken(userId);
      response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Gmail Callback Unhandled Exception:', error);
    return NextResponse.redirect(new URL('/?error=InternalServerError', request.url));
  }
}
