import { NextResponse } from 'next/server';
import { requireMetaContext } from '~/lib/services/metaAuth';
import { getCampaigns, getInsights } from '~/lib/services/metaAds';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const adAccountId = searchParams.get('adAccountId') || undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const context = await requireMetaContext(workspaceId, adAccountId);
    const campaignsRes = await getCampaigns(context.accessToken, context.adAccountId);
    if (!campaignsRes.ok) {
      return NextResponse.json({ error: campaignsRes.error.message }, { status: 400 });
    }

    const campaigns = campaignsRes.data;

    const withInsights = await Promise.all(
      campaigns.slice(0, 50).map(async (c) => {
        const insightsRes = await getInsights(context.accessToken, c.id, 'lifetime');
        const insights = insightsRes.ok ? insightsRes.data : {};

        // Budget normally lives on the ad set, not the campaign. Fall back to the
        // campaign-level budget if the campaign is the budget owner.
        const adSet = c.adsets?.data?.[0];
        const daily = c.daily_budget || adSet?.daily_budget;
        const lifetime = c.lifetime_budget || adSet?.lifetime_budget;
        const budgetMinor = daily || lifetime;
        const budgetType = daily ? 'daily' : lifetime ? 'lifetime' : undefined;

        return {
          ...c,
          status: c.status || c.effective_status || 'PAUSED',
          budgetType,
          budgetAmount: budgetMinor ? (parseInt(budgetMinor, 10) / 100).toString() : undefined,
          impressions: insights.impressions || '0',
          clicks: insights.clicks || '0',
          spend: insights.spend || '0',
          ctr: insights.ctr || '0',
          reach: insights.reach || '0',
        };
      }),
    );

    return NextResponse.json({ campaigns: withInsights, adAccountId: context.adAccountId });
  } catch (err: any) {
    const message = err?.message || 'Internal error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
