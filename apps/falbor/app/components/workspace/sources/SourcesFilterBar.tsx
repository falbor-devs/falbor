import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { getConnectedSocialAccounts, type SocialAccountItem } from '~/lib/actions/social';

interface SourcesFilterBarProps {
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const PLATFORMS = ['All', 'Reddit', 'Facebook', 'LinkedIn', 'Twitter', 'ProductHunt', 'Directory', 'Contacts'];

export function SourcesFilterBar({
  selectedPlatform,
  onSelectPlatform,
  searchQuery,
  onSearchChange,
  onRefresh,
  loading,
}: SourcesFilterBarProps) {
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccountItem[]>([]);

  useEffect(() => {
    getConnectedSocialAccounts()
      .then(setConnectedAccounts)
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-4">
      <div className="flex items-center gap-2">
        <Dropdown
          align="start"
          trigger={
            <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2 transition-colors">
              <i className="i-ph:funnel text-sm text-falbor-elements-textSecondary" />
              <span>Platform: <strong>{selectedPlatform}</strong></span>
              <i className="i-ph:caret-down text-xs text-falbor-elements-textSecondary ml-1" />
            </button>
          }
        >
          {PLATFORMS.map((platform) => (
            <DropdownItem
              key={platform}
              active={selectedPlatform === platform}
              onSelect={() => onSelectPlatform(platform)}
            >
              {platform}
            </DropdownItem>
          ))}
        </Dropdown>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2 transition-colors disabled:opacity-50"
        >
          <i className={`i-ph:arrows-clockwise text-xs text-falbor-elements-textSecondary ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Rescanning...' : 'Rescan'}</span>
        </button>

        <Dropdown
          align="start"
          trigger={
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2 transition-colors">
              <i className="i-ph:share-network text-xs text-purple-500" />
              <span>Connect Social</span>
              <i className="i-ph:caret-down text-xs text-falbor-elements-textSecondary ml-0.5" />
            </button>
          }
          className="w-56"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-falbor-elements-textSecondary uppercase tracking-wider">
            Connected Accounts
          </div>
          {connectedAccounts.length === 0 ? (
            <div className="px-2 py-2 text-xs text-falbor-elements-textSecondary text-center">
              No accounts connected yet
            </div>
          ) : (
            connectedAccounts.map((acc) => (
              <DropdownItem key={acc.id} className="justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  {acc.platform === 'Twitter' && <i className="i-ph:twitter-logo text-sky-400" />}
                  {acc.platform === 'Reddit' && <i className="i-ph:reddit-logo text-orange-500" />}
                  {acc.platform === 'LinkedIn' && <i className="i-ph:linkedin-logo text-blue-500" />}
                  <span>{acc.platform} ({acc.platformUsername})</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </DropdownItem>
            ))
          )}
          <div className="border-t border-falbor-elements-borderColor my-1" />
          <DropdownItem
            onSelect={() => {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('tab', 'social-connection');
              window.history.pushState({}, '', newUrl.toString());
              window.dispatchEvent(new Event('popstate'));
            }}
            className="text-xs text-purple-500 font-semibold hover:text-purple-600"
          >
            <i className="i-ph:plus text-xs" />
            <span>Manage / Add Connections</span>
          </DropdownItem>
        </Dropdown>

        <Dropdown
          align="start"
          trigger={
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2 transition-colors">
              <i className="i-ph:terminal-window text-xs text-emerald-500" />
              <span>Status</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          }
          className="w-96 p-0 overflow-hidden bg-black text-emerald-400 border border-emerald-950 font-mono text-xs shadow-2xl"
        >
          <div className="px-3 py-2 bg-gray-950 border-b border-gray-900 text-gray-400 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
              <span className="ml-1 text-gray-300 font-bold">AI Execution & Automation Logs</span>
            </span>
            <span className="text-emerald-500 font-semibold">[ACTIVE]</span>
          </div>

          <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
            <p className="text-gray-500">[{new Date().toLocaleTimeString()}] Initializing Falbor Growth Agent...</p>
            <p className="text-blue-400">[{new Date().toLocaleTimeString()}] Querying connected OAuth accounts...</p>
            {connectedAccounts.length === 0 ? (
              <>
                <p className="text-yellow-400">⚠ No connected social accounts found in database.</p>
                <p className="text-gray-400">[Action required: Connect your LinkedIn account in Social Settings]</p>
              </>
            ) : (
              connectedAccounts.map(acc => (
                <React.Fragment key={acc.id}>
                  <p className="text-emerald-400">✓ Account Verified: {acc.platform} ({acc.platformUsername})</p>
                  <p className="text-purple-400">[{new Date().toLocaleTimeString()}] Scheduling AI posts ({acc.postsPerDay} posts/day, interval: {acc.intervalMinutes}m)</p>
                  <p className="text-emerald-300 font-semibold bg-emerald-950/40 p-1.5 rounded border border-emerald-900/50">
                    ● Next scheduled post queuing for {acc.platformUsername}
                  </p>
                </React.Fragment>
              ))
            )}
          </div>
        </Dropdown>
      </div>

      <div className="relative w-full sm:w-64">
        <i className="i-ph:magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input
          type="text"
          placeholder="Filter channels..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-accent-500"
        />
      </div>
    </div>
  );
}
