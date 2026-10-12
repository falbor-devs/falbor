import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { googleAdsConnections } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, campaignName, productUrl, dailyBudget, targetLocations, headlines, descriptions } = body;

    if (!workspaceId || !campaignName || !productUrl || !dailyBudget) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

    if (!developerToken || !customerId) {
      return NextResponse.json(
        { error: 'Google Ads credentials not configured. Add GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_CUSTOMER_ID to .env.' },
        { status: 500 }
      );
    }

    const connection = await db.query.googleAdsConnections.findFirst({
      where: eq(googleAdsConnections.workspaceId, workspaceId),
    });

    const refreshToken = connection?.refreshToken;
    if (!refreshToken) {
      return NextResponse.json({ error: 'Google Ads account not connected. Please connect first.' }, { status: 401 });
    }

    // Exchange refresh token for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Failed to refresh Google access token.' }, { status: 401 });
    }

    const accessToken = tokenData.access_token;
    const cleanCustomerId = customerId.replace(/-/g, '');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    };

    // 1. Create campaign budget
    const budgetRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/campaignBudgets:mutate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: `${campaignName} Budget`,
              amountMicros: Math.round(dailyBudget * 1_000_000),
              deliveryMethod: 'STANDARD',
            },
          }],
        }),
      }
    );

    const budgetData = await budgetRes.json();
    if (budgetData.error || budgetData.partialFailureError) {
      const msg = budgetData.error?.message || JSON.stringify(budgetData.partialFailureError);
      return NextResponse.json({ error: `Budget creation failed: ${msg}` }, { status: 400 });
    }

    const budgetResourceName = budgetData.results?.[0]?.resourceName;

    // 2. Create campaign
    const campaignRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/campaigns:mutate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: campaignName,
              status: 'PAUSED',
              advertisingChannelType: 'SEARCH',
              campaignBudget: budgetResourceName,
              manualCpc: {},
              networkSettings: {
                targetGoogleSearch: true,
                targetSearchNetwork: true,
              },
            },
          }],
        }),
      }
    );

    const campaignData = await campaignRes.json();
    if (campaignData.error || campaignData.partialFailureError) {
      const msg = campaignData.error?.message || JSON.stringify(campaignData.partialFailureError);
      return NextResponse.json({ error: `Campaign creation failed: ${msg}` }, { status: 400 });
    }

    const campaignResourceName = campaignData.results?.[0]?.resourceName;
    const campaignId = campaignResourceName?.split('~')[1];

    return NextResponse.json({ success: true, campaignId, resourceName: campaignResourceName });
  } catch (err: any) {
    console.error('Google Ads campaign creation error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
