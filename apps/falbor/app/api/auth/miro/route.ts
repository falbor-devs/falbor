import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.redirect(new URL('/?error=Unauthorized', request.url));
    }

    const { searchParams } = new URL(request.url);
    const connectionName = searchParams.get('name') || 'Miro Connection';

    const clientId = process.env.MIRO_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.MIRO_REDIRECT_URI_PROD 
      : process.env.MIRO_REDIRECT_URI_LOCAL;

    if (!clientId || !redirectUri) {
      return NextResponse.redirect(new URL('/?error=MissingMiroConfig', request.url));
    }

    const state = Buffer.from(JSON.stringify({ userId, name: connectionName })).toString('base64');

    const authUrl = new URL('https://miro.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'boards:read boards:write profile:read');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Miro Auth Error:', error);
    return NextResponse.redirect(new URL('/?error=AuthInitFailed', request.url));
  }
}
