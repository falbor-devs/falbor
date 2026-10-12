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

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.SLACK_REDIRECT_URI_PROD 
      : process.env.SLACK_REDIRECT_URI_LOCAL;

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: 'Slack OAuth not configured' }, { status: 500 });
    }

    const state = Buffer.from(JSON.stringify({ name: connectionName, userId, connectionId })).toString('base64');

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    // User scopes for standard Slack MCP integration
    authUrl.searchParams.set('user_scope', 'channels:read,channels:history,chat:write,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,users:read,users:read.email');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Slack Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
