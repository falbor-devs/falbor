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
    const error_description = searchParams.get('error_description');

    if (error) {
      console.error('Stripe Auth Error:', error, error_description);
      return NextResponse.redirect(new URL('/?error=StripeAuthFailed', request.url));
    }

    if (!code || !stateStr) {
      return NextResponse.redirect(new URL('/?error=MissingParams', request.url));
    }

    const state = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
    if (state.userId !== userId) {
      return NextResponse.redirect(new URL('/?error=InvalidState', request.url));
    }

    const clientId = process.env.STRIPE_CLIENT_ID;
    const clientSecret = process.env.STRIPE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/?error=MissingStripeConfig', request.url));
    }

    // Exchange the code for a token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Stripe Token Error:', tokenData);
      return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', request.url));
    }

    // Attempt to fetch account info from Stripe to get email/name
    if (tokenData.stripe_user_id && tokenData.access_token) {
      try {
        const accountRes = await fetch(`https://api.stripe.com/v1/accounts/${tokenData.stripe_user_id}`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (accountRes.ok) {
          const accountInfo = await accountRes.json();
          // Embed in authed_user to match extraction logic
          tokenData.authed_user = {
            id: accountInfo.id,
            email: accountInfo.email,
            name: accountInfo.settings?.dashboard?.display_name || accountInfo.business_profile?.name || '',
            avatar: accountInfo.settings?.branding?.icon || '',
          };
        }
      } catch (err) {
        console.error('Failed to fetch Stripe account info:', err);
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
        connectorId: 'stripe',
        name: state.name || 'Stripe Connection',
        config: tokenData, // Includes access_token, stripe_user_id, etc.
        status: 'active',
      });
    }

    // We can redirect back to the MCP Settings tab
    return NextResponse.redirect(new URL('/?tab=mcp', request.url));
  } catch (error) {
    console.error('Stripe Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=InternalServerError', request.url));
  }
}
