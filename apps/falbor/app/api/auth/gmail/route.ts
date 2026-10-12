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

    const clientId = process.env.GMAIL_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.GMAIL_REDIRECT_URI_PROD 
      : process.env.GMAIL_REDIRECT_URI_LOCAL;

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: 'Gmail OAuth not configured' }, { status: 500 });
    }

    const returnPath = searchParams.get('returnPath');
    const state = Buffer.from(JSON.stringify({ name: connectionName, userId, connectionId, returnPath })).toString('base64');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    const scopes = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline'); // necessary for getting a refresh token
    authUrl.searchParams.set('prompt', 'consent'); // force consent screen to always get refresh token
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Gmail Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
