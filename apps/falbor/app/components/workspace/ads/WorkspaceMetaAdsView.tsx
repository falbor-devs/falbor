'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Input } from '~/components/ui/Input';
import { classNames } from '~/utils/classNames';

interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | string;
  objective: string;
  daily_budget?: string;
  created_time: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  reach: string;
}

interface WorkspaceMetaAdsViewProps {
  workspaceId: string;
}

export function WorkspaceMetaAdsView({ workspaceId }: WorkspaceMetaAdsViewProps) {
  const storageKey = `meta_ads_connected_${workspaceId}`;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [dailyBudget, setDailyBudget] = useState('50');
  const [objective, setObjective] = useState('OUTCOME_TRAFFIC');
  const [adText, setAdText] = useState('');
  const [headline, setHeadline] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch(`/api/ads/meta/campaigns?workspaceId=${workspaceId}`);
      const json = await res.json();
      if (json.error) {
        console.error('Failed to load campaigns:', json.error);
        setError(`Failed to load campaigns: ${json.error}`);
      } else if (json.campaigns) {
        setCampaigns(json.campaigns);
      }
    } catch (err: any) {
      console.error('Campaign fetch error:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get('error');
    const isSuccess = params.get('success') === 'meta_ads_connected';

    if (errParam) {
      setError(`Authentication failed: ${errParam}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (isSuccess) {
      setSuccess('Meta Ads account connected successfully!');
      localStorage.setItem(storageKey, 'true');
      setIsConnected(true);
      fetchCampaigns();
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Always verify against DB — fallback gracefully
    fetch(`/api/ads/meta/status?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(data => {
        if (data.connected) {
          localStorage.setItem(storageKey, 'true');
          setIsConnected(true);
          fetchCampaigns();
        } else if (isSuccess || localStorage.getItem(storageKey) === 'true') {
          // Keep connected state true if success flag or storage was set
          setIsConnected(true);
          fetchCampaigns();
        } else {
          setIsConnected(false);
        }
      })
      .catch(() => {
        if (isSuccess || localStorage.getItem(storageKey) === 'true') {
          setIsConnected(true);
          fetchCampaigns();
        }
      });
  }, [workspaceId, storageKey, fetchCampaigns]);

  const handleConnect = () => {
    setIsConnecting(true);
    const state = btoa(JSON.stringify({ workspaceId, returnTo: 'meta-ads' }));
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin.replace(/\/$/, '')}/api/auth/meta/callback`);
    const scope = 'ads_management,ads_read,business_management';
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=code`;
    window.location.href = url;
  };

  const handleLaunch = async () => {
    if (!campaignName.trim()) { setError('Campaign name is required.'); return; }
    if (!productUrl.trim()) { setError('Product URL is required.'); return; }
    if (!dailyBudget || parseFloat(dailyBudget) <= 0) { setError('A valid daily budget is required.'); return; }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/ads/meta/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, campaignName, productUrl, dailyBudget: parseFloat(dailyBudget), objective, adText, headline }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to create campaign');

      setSuccess(`Campaign "${campaignName}" created successfully!`);
      setShowForm(false);
      setCampaignName('');
      setProductUrl('');
      setAdText('');
      setHeadline('');
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'ACTIVE') return 'text-green-600 bg-green-100 dark:bg-green-950/40 dark:text-green-400';
    if (status === 'PAUSED') return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-400';
    return 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#09090B]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <img src="/icons/meta.svg" alt="" className='w-8 h-6 mr-2' />
            Meta Ads
          </h1>
          {isConnected && (
            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-full font-medium flex items-center gap-1">
              <i className="i-ph:check-circle-fill" /> Connected
            </span>
          )}
        </div>
        {isConnected && (
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-sm font-medium transition-colors"
          >
            <i className={showForm ? 'i-ph:x-bold' : 'i-ph:plus-bold'} />
            {showForm ? 'Cancel' : 'Create New Campaign'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <i className="i-ph:warning-circle-fill shrink-0" />
          {error}
          <button className="ml-auto text-xs font-semibold hover:underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
          <i className="i-ph:check-circle-fill shrink-0" />
          {success}
          <button className="ml-auto text-xs font-semibold hover:underline" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      <div className="max-w-4xl w-full space-y-6">
        {!isConnected && (
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Meta Ads Account</h2>
                <p className="text-xs text-gray-500 mt-0.5">Connect your Meta Business account to create and manage campaigns.</p>
              </div>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isConnecting ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:facebook-logo-bold" />}
                Connect Meta Ads
              </button>
            </div>
          </div>
        )}

        {isConnected && showForm && (
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <i className="i-ph:plus-circle-bold text-[#0866FF]" />
              New Campaign
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campaign Name</label>
                <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. My Product — Traffic Campaign" className="text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product URL</label>
                <Input value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://yourproduct.com" type="url" className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Daily Budget (USD)</label>
                <Input value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} type="number" min="1" className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Objective</label>
                <select value={objective} onChange={e => setObjective(e.target.value)} className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white">
                  <option value="OUTCOME_TRAFFIC">Traffic</option>
                  <option value="OUTCOME_LEADS">Lead Generation</option>
                  <option value="OUTCOME_SALES">Sales</option>
                  <option value="OUTCOME_AWARENESS">Brand Awareness</option>
                  <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ad Headline</label>
                <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Catch attention in one line" className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ad Body Text</label>
                <Input value={adText} onChange={e => setAdText(e.target.value)} placeholder="Your product value proposition" className="text-sm" />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleLaunch}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:rocket-launch-bold" />}
                {isSaving ? 'Creating...' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        )}

        {isConnected && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Campaigns</h2>
              <button onClick={fetchCampaigns} disabled={loadingCampaigns} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors">
                <i className={classNames('i-ph:arrow-clockwise', loadingCampaigns && 'animate-spin')} />
                Refresh
              </button>
            </div>

            {loadingCampaigns ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <i className="i-ph:spinner-gap animate-spin text-2xl mr-2" /> Loading campaigns...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <i className="i-ph:megaphone text-3xl mb-2 block" />
                <p className="text-sm">No campaigns yet. Create your first campaign above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#111114] border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reach</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Impressions</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clicks</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CTR</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {campaigns.map(c => (
                      <tr key={c.id} className="bg-white dark:bg-[#09090B] hover:bg-gray-50 dark:hover:bg-[#111114] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{c.objective?.replace('OUTCOME_', '')} · {c.daily_budget ? `$${(parseInt(c.daily_budget) / 100).toFixed(2)}/day` : '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={classNames('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(c.status))}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">{parseInt(c.reach || '0').toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">{parseInt(c.impressions || '0').toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">{parseInt(c.clicks || '0').toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">{parseFloat(c.ctr || '0').toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">${parseFloat(c.spend || '0').toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
