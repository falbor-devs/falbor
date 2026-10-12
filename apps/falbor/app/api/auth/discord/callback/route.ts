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
      console.error('Discord Auth Error:', error);
      return NextResponse.redirect(new URL('/?error=DiscordAuthFailed', request.url));
    }

    if (!code || !stateStr) {
      return NextResponse.redirect(new URL('/?error=MissingParams', request.url));
    }

    const state = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
    if (state.userId !== userId) {
      return NextResponse.redirect(new URL('/?error=InvalidState', request.url));
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.DISCORD_REDIRECT_URI_PROD 
      : process.env.DISCORD_REDIRECT_URI_LOCAL;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(new URL('/?error=MissingDiscordConfig', request.url));
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Discord Token Error:', tokenData);
      return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', request.url));
    }

    // Attempt to fetch user info to get username and avatar
    if (tokenData.access_token) {
      try {
        const userInfoRes = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userInfo = await userInfoRes.json();
        if (userInfoRes.ok) {
          tokenData.authed_user = {
            id: userInfo.id,
            username: userInfo.username,
            avatar: userInfo.avatar ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png` : '',
            email: userInfo.email || ''
          };
        }
      } catch (err) {
        console.error('Failed to fetch Discord user info:', err);
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
        connectorId: 'discord',
        name: state.name || 'Discord Connection',
        config: tokenData,
        status: 'active',
      });
    }

    return NextResponse.redirect(new URL('/?tab=mcp', request.url));
  } catch (error) {
    console.error('Discord Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=InternalServerError', request.url));
  }
}
