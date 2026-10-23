'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { StatusPill, type StatusTone } from './StatusPill';
import { TaskQueueStatus } from './TaskQueueStatus';
import { RecommendationsPanel } from './RecommendationsPanel';
import { AgentControlCard } from './AgentControlCard';
import { ExtensionSetupCard } from './ExtensionSetupCard';
import { ProductContextCard } from './ProductContextCard';
import { formatRelativeTime } from './format';
import { startDiscovery } from '~/lib/actions/automation/opportunities';
import type { AutomationStatusSummary, DiscoveryRunStatus } from '~/lib/automation/types';

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export type AutomationTabTarget = 'opportunities' | 'drafts' | 'activity' | 'performance' | 'settings';

function discoveryStatusTone(status: DiscoveryRunStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'good';
    case 'partial':
      return 'warn';
    case 'failed':
      return 'bad';
    case 'running':
    case 'queued':
      return 'info';
    default:
      return 'neutral';
  }
}

function MetricTile({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] enabled:hover:bg-gray-100 dark:enabled:hover:bg-[#18181b] transition-colors disabled:cursor-default"
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
        <i className={icon} />
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">{value}</div>
    </button>
  );
}

export function AutomationOverview({
  workspaceId,
  status,
  refreshStatus,
  onNavigateTab,
}: {
  workspaceId: string;
  status: AutomationStatusSummary;
  refreshStatus: () => Promise<void> | void;
  onNavigateTab: (tab: AutomationTabTarget) => void;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendationsKey, setRecommendationsKey] = useState(0);

  const { counts, lastDiscovery } = status;
  const redditConnected = status.reddit.status === 'connected';
  const discoveryRunning = lastDiscovery?.status === 'running';
  const discoveryDisabled = !redditConnected || discoveryRunning || running;

  const handleRunDiscovery = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await startDiscovery(workspaceId);
      if (result.status === 'failed') {
        const message = result.error || 'Discovery failed.';
        setError(message);
        toast.error(message);
      } else if (result.status === 'partial') {
        toast.warn(
          `Discovery finished partially: found ${result.found} posts, persisted ${result.upserted} opportunities.${
            result.error ? ` ${result.error}` : ''
          }`,
        );
      } else {
        toast.success(
          `Discovery completed: found ${result.found} posts, persisted ${result.upserted} opportunities.`,
        );
      }
      setRecommendationsKey((key) => key + 1);
      await refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run discovery.';
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricTile
          label="Opportunities"
          value={counts.opportunities}
          icon="i-ph:magnifying-glass"
          onClick={() => onNavigateTab('opportunities')}
        />
        <MetricTile
          label="Awaiting review"
          value={counts.awaitingReview}
          icon="i-ph:eye"
          onClick={() => onNavigateTab('opportunities')}
        />
        <MetricTile
          label="Drafts awaiting approval"
          value={counts.draftsAwaitingApproval}
          icon="i-ph:note-pencil"
          onClick={() => onNavigateTab('drafts')}
        />
        <MetricTile
          label="Approved / in flight"
          value={counts.approved}
          icon="i-ph:paper-plane-tilt"
          onClick={() => onNavigateTab('drafts')}
        />
        <MetricTile
          label="Published"
          value={counts.published}
          icon="i-ph:check-circle"
          onClick={() => onNavigateTab('performance')}
        />
        <MetricTile
          label="Failed publications"
          value={counts.failedPublications}
          icon="i-ph:warning-circle"
          onClick={() => onNavigateTab('activity')}
        />
      </div>

      <TaskQueueStatus status={status} />

      <section className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Last discovery</h3>
            {lastDiscovery ? (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusPill label={lastDiscovery.status} tone={discoveryStatusTone(lastDiscovery.status)} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {lastDiscovery.completedAt
                    ? `Completed ${formatRelativeTime(lastDiscovery.completedAt)}`
                    : 'Not completed yet'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {lastDiscovery.found} result{lastDiscovery.found === 1 ? '' : 's'} found
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No discovery run yet.</p>
            )}
            {lastDiscovery?.error && <p className="text-xs text-red-500 mt-1 break-words">{lastDiscovery.error}</p>}
          </div>

          <button
            onClick={handleRunDiscovery}
            disabled={discoveryDisabled}
            title={!redditConnected ? 'Connect Reddit before running discovery.' : undefined}
            className={PRIMARY_BUTTON}
          >
            {running || discoveryRunning ? (
              <i className="i-ph:spinner-gap animate-spin" />
            ) : (
              <i className="i-ph:magnifying-glass" />
            )}
            Run discovery
          </button>
        </div>

        {(running || discoveryRunning) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <i className="i-ph:spinner-gap animate-spin" />
            Searching Reddit — this can take up to a minute.
          </p>
        )}

        {!redditConnected && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Discovery is disabled until a Reddit account is connected.
          </p>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <i className="i-ph:warning-circle shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
            <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      <RecommendationsPanel workspaceId={workspaceId} refreshKey={recommendationsKey} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <AgentControlCard workspaceId={workspaceId} status={status} onChanged={refreshStatus} />
        <ExtensionSetupCard workspaceId={workspaceId} status={status} onChanged={refreshStatus} />
      </div>

      <ProductContextCard workspaceId={workspaceId} />
    </div>
  );
}
