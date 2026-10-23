'use client';

import { useCallback, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { useAutomationStatus } from './hooks/useAutomationStatus';
import { AutomationOverview, type AutomationTabTarget } from './AutomationOverview';
import { ActivityFeed } from './ActivityFeed';
import { PerformancePanel } from './PerformancePanel';
import { AutomationSettingsPanel } from './AutomationSettingsPanel';
import { TaskQueueStatus } from './TaskQueueStatus';
import { StatusPill, type StatusTone } from './StatusPill';
import { OpportunityList } from './OpportunityList';
import { DraftsPanel } from './DraftsPanel';
import type { AutomationStatusSummary } from '~/lib/automation/types';

type AutomationTab = 'overview' | AutomationTabTarget;

const TABS: Array<{ id: AutomationTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'activity', label: 'Activity' },
  { id: 'performance', label: 'Performance' },
  { id: 'settings', label: 'Settings' },
];

function extensionStatusLabel(state: AutomationStatusSummary['extension']['state']): string {
  switch (state) {
    case 'connected':
      return 'Extension connected';
    case 'stale':
      return 'Extension stale';
    case 'revoked':
      return 'Extension revoked';
    default:
      return 'Extension not connected';
  }
}

function extensionStatusTone(state: AutomationStatusSummary['extension']['state']): StatusTone {
  switch (state) {
    case 'connected':
      return 'good';
    case 'stale':
      return 'warn';
    case 'revoked':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function WorkspaceAutomationView({ workspaceId }: { workspaceId: string }) {
  const { status, loading, error, refresh } = useAutomationStatus(workspaceId);
  const [activeTab, setActiveTab] = useState<AutomationTab>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleChanged = useCallback(() => {
    setRefreshKey((key) => key + 1);
    void refresh();
  }, [refresh]);

  if (loading && !status) {
    return (
      <div className="w-full h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-100 dark:bg-[#111114] rounded animate-pulse" />
              <div className="h-3 w-64 bg-gray-100 dark:bg-[#111114] rounded animate-pulse" />
            </div>
            <div className="h-7 w-48 bg-gray-100 dark:bg-[#111114] rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <div key={tab.id} className="h-8 w-24 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {TABS.map((tab) => (
              <div key={tab.id} className="h-20 bg-gray-100 dark:bg-[#111114] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="w-full h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
            <p className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <i className="i-ph:warning-circle shrink-0 mt-0.5" />
              <span className="break-words">{error || 'Failed to load automation status.'}</span>
            </p>
            <button
              onClick={() => void refresh()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 text-sm transition-colors"
            >
              <i className="i-ph:arrow-clockwise" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Automation</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Reddit growth workspace for this product</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill
              label={extensionStatusLabel(status.extension.state)}
              tone={extensionStatusTone(status.extension.state)}
            />
            <button
              onClick={() => void refresh()}
              disabled={loading}
              title="Refresh status"
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              <i className={classNames('i-ph:arrow-clockwise', loading && 'animate-spin')} />
            </button>
          </div>
        </header>

        <nav className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={classNames(
                'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <i className="i-ph:warning-circle shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
            <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <AutomationOverview
            workspaceId={workspaceId}
            status={status}
            refreshStatus={handleChanged}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'opportunities' && (
          <OpportunityList workspaceId={workspaceId} status={status} refreshStatus={handleChanged} />
        )}

        {activeTab === 'drafts' && (
          <DraftsPanel workspaceId={workspaceId} status={status} refreshStatus={handleChanged} />
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <ActivityFeed workspaceId={workspaceId} refreshKey={refreshKey} />
            <TaskQueueStatus status={status} />
          </div>
        )}

        {activeTab === 'performance' && <PerformancePanel workspaceId={workspaceId} />}

        {activeTab === 'settings' && (
          <AutomationSettingsPanel workspaceId={workspaceId} status={status} onChanged={handleChanged} />
        )}
      </div>
    </div>
  );
}
