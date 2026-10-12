'use client';

import React, { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { Input } from '~/components/ui/Input';

interface WorkspaceGoogleAdsViewProps {
  workspaceId: string;
}

type Step = 'connect' | 'campaign';

export function WorkspaceGoogleAdsView({ workspaceId }: WorkspaceGoogleAdsViewProps) {
  const storageKey = `google_ads_connected_${workspaceId}`;
  const [step, setStep] = useState<Step>('connect');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [dailyBudget, setDailyBudget] = useState('50');
  const [targetLocations, setTargetLocations] = useState('United States');
  const [headlines, setHeadlines] = useState<string[]>(['', '', '']);
  const [descriptions, setDescriptions] = useState<string[]>(['', '']);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === 'true') {
      setIsConnected(true);
      setStep('campaign');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'google_ads_connected') {
      localStorage.setItem(storageKey, 'true');
      setIsConnected(true);
      setStep('campaign');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    setIsConnecting(true);
    const state = btoa(JSON.stringify({ workspaceId, returnTo: 'google-ads' }));
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/api/auth/google/ads/callback`;
    const scope = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;
    window.location.href = url;
  };

  const handleLaunch = async () => {
    if (!campaignName.trim()) { setError('Campaign name is required.'); return; }
    if (!productUrl.trim()) { setError('Product URL is required.'); return; }
    if (!dailyBudget || parseFloat(dailyBudget) <= 0) { setError('A valid daily budget is required.'); return; }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/ads/google/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          campaignName,
          productUrl,
          dailyBudget: parseFloat(dailyBudget),
          targetLocations,
          headlines: headlines.filter(Boolean),
          descriptions: descriptions.filter(Boolean),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to create campaign');

      setSuccess(`Campaign "${campaignName}" created successfully! Google Campaign ID: ${json.campaignId}`);
      setStep('connect');
      setIsConnected(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#09090B]">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="i-ph:google-logo-bold text-[#4285F4]" />
          Google Ads
        </h1>
        {isConnected && (
          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-full font-medium flex items-center gap-1">
            <i className="i-ph:check-circle-fill" /> Connected
          </span>
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

      <div className="max-w-2xl w-full space-y-6">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Google Ads Account</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Connect your Google Ads account via OAuth to create and manage campaigns.
              </p>
            </div>
            {isConnected ? (
              <span className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-lg font-medium">
                Connected
              </span>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4285F4] hover:bg-[#3367D6] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isConnecting ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:google-logo-bold" />}
                Connect Google Ads
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 border-t border-gray-200 dark:border-gray-800 pt-3">
            <p className="font-medium text-gray-700 dark:text-gray-300">Requirements for live campaign creation:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Google Ads account (MCC or standard)</li>
              <li>Developer token (apply at <span className="text-blue-500">ads.google.com/home/tools/manager-accounts</span>)</li>
              <li>OAuth2 credentials from Google Cloud Console</li>
              <li>Payment method configured in Google Ads</li>
            </ul>
            <p className="mt-2">Required env vars: <code className="text-blue-500">GOOGLE_CLIENT_ID</code>, <code className="text-blue-500">GOOGLE_CLIENT_SECRET</code>, <code className="text-blue-500">GOOGLE_ADS_DEVELOPER_TOKEN</code>, <code className="text-blue-500">GOOGLE_ADS_CUSTOMER_ID</code></p>
          </div>
        </div>

        {isConnected && (
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <i className="i-ph:plus-circle-bold text-[#4285F4]" />
              Create New Campaign
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campaign Name</label>
                <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. My Product — Search Campaign" className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product URL (Landing Page)</label>
                <Input value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://yourproduct.com" type="url" className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Daily Budget (USD)</label>
                <Input value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} type="number" min="1" placeholder="50" className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Target Locations</label>
                <Input value={targetLocations} onChange={e => setTargetLocations(e.target.value)} placeholder="United States, United Kingdom" className="text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Headlines (min 3)</label>
                {headlines.map((h, i) => (
                  <Input key={i} value={h} onChange={e => { const n = [...headlines]; n[i] = e.target.value; setHeadlines(n); }} placeholder={`Headline ${i + 1}`} className="text-sm mb-1.5" />
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descriptions (min 2)</label>
                {descriptions.map((d, i) => (
                  <Input key={i} value={d} onChange={e => { const n = [...descriptions]; n[i] = e.target.value; setDescriptions(n); }} placeholder={`Description ${i + 1}`} className="text-sm mb-1.5" />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleLaunch}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4285F4] hover:bg-[#3367D6] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:rocket-launch-bold" />}
                {isSaving ? 'Launching...' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
