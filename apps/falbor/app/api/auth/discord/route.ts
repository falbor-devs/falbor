import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionName = searchParams.get('name');
    const connectionId = searchParams.get('id'); // Support reconnecting

    if (!connectionName) {
      return NextResponse.json({ error: 'Missing connection name' }, { status: 400 });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.DISCORD_REDIRECT_URI_PROD 
      : process.env.DISCORD_REDIRECT_URI_LOCAL;

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: 'Discord OAuth not configured' }, { status: 500 });
    }

    const state = Buffer.from(JSON.stringify({ name: connectionName, userId, connectionId })).toString('base64');

    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    // Basic scopes for a user
    authUrl.searchParams.set('scope', 'identify email guilds');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Discord Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
