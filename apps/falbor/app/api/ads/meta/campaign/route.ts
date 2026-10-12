import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { googleAdsConnections } from '~/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId, campaignName, productUrl, dailyBudget, objective, adText, headline } = body;

    if (!workspaceId || !campaignName || !productUrl || !dailyBudget) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!appId || !appSecret || !adAccountId) {
      return NextResponse.json(
        { error: 'Meta Ads credentials not configured. Add META_APP_ID, META_APP_SECRET, and META_AD_ACCOUNT_ID to .env.' },
        { status: 500 }
      );
    }

    // Get the stored access token for this workspace
    const connection = await db.query.googleAdsConnections.findFirst({
      where: and(
        eq(googleAdsConnections.workspaceId, workspaceId),
        eq(googleAdsConnections.customerId, 'meta')
      ),
    });

    const accessToken = connection?.refreshToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'Meta account not connected. Please connect your Meta account first.' }, { status: 401 });
    }

    const normalizedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // 1. Create Campaign
    const campaignRes = await fetch(
      `https://graph.facebook.com/v19.0/${normalizedAdAccountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          objective: objective || 'OUTCOME_TRAFFIC',
          status: 'PAUSED',
          special_ad_categories: [],
          is_adset_budget_sharing_enabled: false,
          access_token: accessToken,
        }),
      }
    );

    const campaign = await campaignRes.json();
    if (campaign.error) {
      console.error('Meta API Campaign Error:', campaign.error);
      const detail = campaign.error.error_user_msg || campaign.error.error_user_title || campaign.error.message;
      return NextResponse.json({ error: detail || 'Failed to create campaign.' }, { status: 400 });
    }

    const campaignId = campaign.id;

    // 2. Create Ad Set
    const adSetRes = await fetch(
      `https://graph.facebook.com/v19.0/${normalizedAdAccountId}/adsets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaignName} — Ad Set`,
          campaign_id: campaignId,
          daily_budget: Math.round(dailyBudget * 100),
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          status: 'PAUSED',
          targeting: { geo_locations: { countries: ['US'] } },
          access_token: accessToken,
        }),
      }
    );

    const adSet = await adSetRes.json();
    if (adSet.error) {
      return NextResponse.json({ error: adSet.error.message || 'Failed to create ad set.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, campaignId, adSetId: adSet.id });
  } catch (err: any) {
    console.error('Meta campaign creation error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
