import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { mcpConnections } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq, and } from 'drizzle-orm';

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
      console.error('Slack Auth Error:', error);
      return NextResponse.redirect(new URL('/?error=SlackAuthFailed', request.url));
    }

    if (!code || !stateStr) {
      return NextResponse.redirect(new URL('/?error=MissingParams', request.url));
    }

    const state = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
    if (state.userId !== userId) {
      return NextResponse.redirect(new URL('/?error=InvalidState', request.url));
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.SLACK_REDIRECT_URI_PROD 
      : process.env.SLACK_REDIRECT_URI_LOCAL;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(new URL('/?error=MissingSlackConfig', request.url));
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.ok) {
      console.error('Slack Token Error:', tokenData);
      return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', request.url));
    }

    // Attempt to fetch user info to get email and avatar
    if (tokenData.authed_user?.access_token && tokenData.authed_user?.id) {
      try {
        const userInfoRes = await fetch(`https://slack.com/api/users.info?user=${tokenData.authed_user.id}`, {
          headers: { Authorization: `Bearer ${tokenData.authed_user.access_token}` }
        });
        const userInfo = await userInfoRes.json();
        if (userInfo.ok && userInfo.user) {
          tokenData.authed_user.email = userInfo.user.profile?.email || '';
          tokenData.authed_user.name = userInfo.user.profile?.real_name || userInfo.user.name || '';
          tokenData.authed_user.avatar = userInfo.user.profile?.image_192 || userInfo.user.profile?.image_72 || '';
        }
      } catch (err) {
        console.error('Failed to fetch Slack user info:', err);
      }
    }

    // Save connection to database
    if (state.connectionId) {
      await db.update(mcpConnections)
        .set({ config: tokenData, updatedAt: new Date() })
        .where(and(eq(mcpConnections.id, state.connectionId), eq(mcpConnections.userId, userId)));
    } else {
      await db.insert(mcpConnections).values({
        userId,
        connectorId: 'slack',
        name: state.name || 'Slack Connection',
        config: tokenData,
        status: 'active',
      });
    }

    return NextResponse.redirect(new URL('/?tab=mcp', request.url));
  } catch (error) {
    console.error('Slack Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=InternalServerError', request.url));
  }
}
