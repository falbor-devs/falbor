import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { googleAdsConnections } from '~/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const adAccountId = process.env.META_AD_ACCOUNT_ID;
    if (!adAccountId) {
      return NextResponse.json({ error: 'META_AD_ACCOUNT_ID not configured' }, { status: 500 });
    }

    const connection = await db.query.googleAdsConnections.findFirst({
      where: and(
        eq(googleAdsConnections.workspaceId, workspaceId),
        eq(googleAdsConnections.customerId, 'meta')
      ),
    });

    if (!connection?.refreshToken) {
      return NextResponse.json({ campaigns: [] });
    }

    const accessToken = connection.refreshToken;
    const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    const fields = 'id,name,status,effective_status,objective,created_time,daily_budget';
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${normalizedId}/campaigns?fields=${fields}&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('Meta campaigns query error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const campaigns = (data.data || []).map((c: any) => ({
      ...c,
      status: c.status || c.effective_status || 'PAUSED',
    }));

    const withInsights = await Promise.all(
      campaigns.slice(0, 20).map(async (c: any) => {
        try {
          const insightsRes = await fetch(
            `https://graph.facebook.com/v19.0/${c.id}/insights?fields=impressions,clicks,spend,ctr,reach&date_preset=lifetime&access_token=${accessToken}`
          );
          const insightsData = await insightsRes.json();
          const insights = insightsData.data?.[0] || {};
          return { ...c, impressions: insights.impressions || '0', clicks: insights.clicks || '0', spend: insights.spend || '0.00', ctr: insights.ctr || '0', reach: insights.reach || '0' };
        } catch {
          return { ...c, impressions: '0', clicks: '0', spend: '0.00', ctr: '0', reach: '0' };
        }
      })
    );

    return NextResponse.json({ campaigns: withInsights });
  } catch (err: any) {
    console.error('Meta fetch campaigns error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
