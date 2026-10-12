import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  const marketId = searchParams.get('marketId');

  if (!workspaceId || !marketId) {
    return new Response('Workspace ID and Market ID are required', { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId) {
    return new Response('GOOGLE_CLIENT_ID not configured', { status: 500 });
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  
  // Package both IDs safely into the state string
  const stateString = Buffer.from(JSON.stringify({ workspaceId, marketId })).toString('base64');
  authUrl.searchParams.set('state', stateString);

  return redirect(authUrl.toString());
}
