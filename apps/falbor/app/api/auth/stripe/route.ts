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

    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? process.env.STRIPE_REDIRECT_URI_PROD 
      : process.env.STRIPE_REDIRECT_URI_LOCAL;

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: 'Stripe OAuth not configured' }, { status: 500 });
    }

    // Use state to pass the connection name securely.
    const state = Buffer.from(JSON.stringify({ name: connectionName, userId, connectionId })).toString('base64');

    const stripeAuthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    stripeAuthUrl.searchParams.set('response_type', 'code');
    stripeAuthUrl.searchParams.set('client_id', clientId);
    stripeAuthUrl.searchParams.set('scope', 'read_write');
    stripeAuthUrl.searchParams.set('redirect_uri', redirectUri);
    stripeAuthUrl.searchParams.set('state', state);

    return NextResponse.redirect(stripeAuthUrl.toString());
  } catch (error) {
    console.error('Stripe Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
