'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import classNames from 'classnames';
import {
  getConnectedSocialAccounts,
  updateSocialAccountSettings,
  disconnectSocialAccount,
  type SocialAccountItem,
} from '~/lib/actions/social';

const PLATFORMS = [
  { id: 'Twitter', name: 'Twitter / X', handle: '@FalborGrowth', icon: 'i-ph:twitter-logo text-sky-400' },
  { id: 'Reddit', name: 'Reddit', handle: 'u/FalborFounder', icon: 'i-ph:reddit-logo text-orange-500' },
  { id: 'LinkedIn', name: 'LinkedIn', handle: 'Falbor Growth Hub', icon: 'i-ph:linkedin-logo text-blue-500' },
];

export default function SocialConnectionTab() {
  const [dbAccounts, setDbAccounts] = useState<SocialAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await getConnectedSocialAccounts();
      setDbAccounts(data);
    } catch (err) {
      console.error('Failed to load social accounts from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleConnectRedirect = (platform: string) => {
    setConnectingPlatform(platform);
    // Real external OAuth redirect logic
    window.location.href = `/api/auth/social/connect?platform=${platform}`;
  };

  const handleDisconnect = async (accountId: string, platformName: string) => {
    try {
      await disconnectSocialAccount(accountId);
      toast.success(`${platformName} disconnected`);
      loadAccounts();
    } catch (err) {
      toast.error(`Failed to disconnect ${platformName}`);
    }
  };

  const handleUpdateSettings = async (accountId: string, key: string, value: any) => {
    // 1. Optimistic UI update immediately to prevent UI lag or state reset
    setDbAccounts(prev => prev.map(a => a.id === accountId ? { ...a, [key]: value } : a));

    try {
      // 2. Persist to server database asynchronously
      await updateSocialAccountSettings(accountId, { [key]: value });
      toast.success('Settings updated');
    } catch (err) {
      console.error('Failed to persist setting update to DB:', err);
      toast.error('Failed to update setting');
      // Revert state on failure
      loadAccounts();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-falbor-elements-textPrimary">Social Media Connection & Automation</h2>
          <span className="px-2 py-0.5 text-xs font-bold bg-accent-500/10 text-accent-500 rounded-md">New</span>
        </div>
        <p className="text-sm text-falbor-elements-textSecondary mt-1">
          Connect your social accounts to automate AI-driven acquisition posting, schedule content intervals, and drive real user growth.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-falbor-elements-background-depth-2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {PLATFORMS.map((plat) => {
            const connectedAcc = dbAccounts.find(a => a.platform === plat.id);
            const isConnected = Boolean(connectedAcc);
            const isConnecting = connectingPlatform === plat.id;

            return (
              <div
                key={plat.id}
                className="p-5 rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 flex flex-col gap-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-falbor-elements-background-depth-3 flex items-center justify-center border border-falbor-elements-borderColor">
                      <i className={classNames(plat.icon, "text-xl")} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-falbor-elements-textPrimary flex items-center gap-2">
                        {plat.name}
                        {isConnected && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <i className="i-ph:check-circle" /> Connected
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-falbor-elements-textSecondary">
                        {isConnected
                          ? `${connectedAcc?.platformUsername || ''}${connectedAcc?.platformEmail ? ` (${connectedAcc.platformEmail})` : ''}`
                          : plat.handle}
                      </p>
                    </div>
                  </div>

                  {isConnected && connectedAcc ? (
                    <button
                      onClick={() => handleDisconnect(connectedAcc.id, plat.name)}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all"
                    >
                      Disconnect
                    </button>
                  ) : plat.id === 'LinkedIn' ? (
                    <button
                      onClick={() => handleConnectRedirect(plat.id)}
                      disabled={isConnecting}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium bg-accent-500 text-white hover:bg-accent-600 transition-all shadow-sm flex items-center gap-2"
                    >
                      {isConnecting && <i className="i-ph:arrows-clockwise animate-spin" />}
                      Connect LinkedIn
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-1.5 rounded-lg text-xs font-medium bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary opacity-50 cursor-not-allowed flex items-center gap-1.5 border border-falbor-elements-borderColor"
                    >
                      <span>Coming Soon</span>
                    </button>
                  )}
                </div>

                {isConnected && connectedAcc && (
                  <div className="pt-4 border-t border-falbor-elements-borderColor/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">
                        Auto-Publishing
                      </label>
                      <select
                        value={connectedAcc.autoPublish ? 'enabled' : 'disabled'}
                        onChange={(e) => handleUpdateSettings(connectedAcc.id, 'autoPublish', e.target.value === 'enabled')}
                        className="w-full bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor text-falbor-elements-textPrimary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value="enabled">Enabled (AI Server Runs)</option>
                        <option value="disabled">Disabled (Draft Only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">
                        Max Posts / Day
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={connectedAcc.postsPerDay || 3}
                        onChange={(e) => handleUpdateSettings(connectedAcc.id, 'postsPerDay', Number(e.target.value))}
                        className="w-full bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor text-falbor-elements-textPrimary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">
                        Frequency (Interval)
                      </label>
                      <select
                        value={connectedAcc.intervalMinutes || 180}
                        onChange={(e) => handleUpdateSettings(connectedAcc.id, 'intervalMinutes', Number(e.target.value))}
                        className="w-full bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor text-falbor-elements-textPrimary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value={15}>Every 15 minutes</option>
                        <option value={60}>Every hour</option>
                        <option value={180}>Every 3 hours</option>
                        <option value={360}>Every 6 hours</option>
                        <option value={720}>Every 12 hours</option>
                        <option value={1440}>Once per day</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
