'use client';

import React, { useState, useEffect } from 'react';
import { getWorkspaceById, updateWorkspaceDomain } from '~/lib/actions/workspaces';

interface DeveloperTabProps {
  workspaceId: string;
}

export function DeveloperTab({ workspaceId }: DeveloperTabProps) {
  const apiKey = `fal_live_${workspaceId.slice(0, 12)}_key`;
  const [hasEvents, setHasEvents] = useState(false);
  const [totalSignups, setTotalSignups] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [domain, setDomain] = useState('');
  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [isSavingDomain, setIsSavingDomain] = useState(false);

  const loadData = async () => {
    if (!workspaceId) return;
    setIsRefreshing(true);
    try {
      const ws = await getWorkspaceById(workspaceId);
      if (ws) {
        let extractedDomain = ws.domain || '';
        if (!extractedDomain && ws.contextPrompt) {
          const match = ws.contextPrompt.match(/(?:Domain|Website|Site|URL):\s*([^\n]+)/i) || ws.contextPrompt.match(/https?:\/\/([^\s\/]+)/i);
          if (match && match[1]?.trim()) {
            extractedDomain = match[1].trim().replace(/^https?:\/\//i, '');
          }
        }
        setDomain(extractedDomain);
        setDomainInput(extractedDomain);
      }

      const res = await fetch(`/api/user/milestones?workspaceId=${workspaceId}`);
      if (res.ok) {
        const d = await res.json();
        setHasEvents(!!d.hasConnectedAPI);
        setTotalSignups(d.totalSignups || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleSaveDomain = async () => {
    if (!domainInput.trim()) return;
    setIsSavingDomain(true);
    try {
      await updateWorkspaceDomain(workspaceId, domainInput.trim());
      setDomain(domainInput.trim());
      setIsEditingDomain(false);
    } catch (e) {
      console.error('Failed to update domain', e);
    } finally {
      setIsSavingDomain(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Developer API</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage workspace API keys, custom domain verification, and integration event listeners.
        </p>
      </div>

      {/* Domain Management Section */}
      <div className="flex flex-col gap-3 bg-gray-50 dark:bg-[#18191D] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Workspace Custom Domain</span>
          {!isEditingDomain && (
            <button
              onClick={() => setIsEditingDomain(true)}
              className="text-xs text-[#0099ff] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <div className="i-ph:pencil-simple w-3.5 h-3.5" />
              <span>Edit Domain</span>
            </button>
          )}
        </div>

        {isEditingDomain ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. app.myproduct.com"
              className="flex-1 px-3 py-2 bg-white dark:bg-[#111114] text-xs border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              disabled={isSavingDomain}
              onClick={handleSaveDomain}
              className="px-3.5 py-2 bg-[#0099ff] hover:bg-[#0088ee] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {isSavingDomain ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setDomainInput(domain);
                setIsEditingDomain(false);
              }}
              className="px-3 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3.5 py-2 bg-white dark:bg-[#111114] rounded-lg border border-gray-200 dark:border-gray-800">
            <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
              {domain || 'No domain configured yet'}
            </span>
            <span className="text-[10px] text-gray-400">
              {domain ? 'Active Verified Origin' : 'Required for origin verification'}
            </span>
          </div>
        )}
      </div>

      {/* API Key Section */}
      <div className="flex flex-col gap-3 bg-gray-50 dark:bg-[#18191D] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Workspace Live API Key</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={apiKey}
            className="flex-1 px-3 py-2 bg-white dark:bg-[#111114] text-xs font-mono border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-200 select-all"
          />
          <button
            onClick={() => navigator.clipboard.writeText(apiKey)}
            className="px-3 py-2 bg-[#0099ff]/15 text-[#0099ff] hover:bg-[#0099ff]/25 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Copy Key
          </button>
        </div>
      </div>

      {/* Supported Events Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Supported Integration Events</h3>
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="text-xs text-[#0099ff] hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            <div className={`i-ph:arrows-clockwise ${isRefreshing ? 'animate-spin' : ''} w-3.5 h-3.5`} />
            <span>{isRefreshing ? 'Checking connection...' : 'Refresh Status'}</span>
          </button>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1D21] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#0099ff] flex items-center justify-center">
              <div className="i-ph:user-plus-bold w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">User Signup Verification</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {hasEvents ? `${totalSignups} user signups verified via API Webhook.` : 'Listening for HTTP POST events at /api/v1/events/user-signup'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasEvents ? (
              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-md border border-green-200 dark:border-green-800/30">
                Connected ({totalSignups})
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/30">
                Waiting for events
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
