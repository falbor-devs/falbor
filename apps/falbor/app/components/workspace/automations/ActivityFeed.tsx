'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from '~/components/ui/EmptyState';
import { classNames } from '~/utils/classNames';
import { formatRelativeTime } from './format';
import { listAutomationActivity } from '~/lib/actions/automation/activity';
import type { AutomationActivityItem } from '~/lib/actions/automation/activity';
import { LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE, withTimeout } from './withTimeout';

const ACTIVITY_POLL_INTERVAL_MS = 15_000;

function activityIcon(type: string): string {
  if (type.startsWith('agent_')) return 'i-ph:robot';
  if (type.startsWith('reddit_')) return 'i-ph:reddit-logo';
  if (type.startsWith('extension_')) return 'i-ph:puzzle-piece';
  if (type.startsWith('discovery_')) return 'i-ph:magnifying-glass';
  if (type.startsWith('opportunity_') || type.startsWith('analysis_')) return 'i-ph:crosshair';
  if (type.startsWith('draft_')) return 'i-ph:note-pencil';
  if (type.startsWith('metrics_')) return 'i-ph:chart-line-up';
  if (type.startsWith('publication_') || type.startsWith('execution_') || type.startsWith('task_')) {
    return 'i-ph:paper-plane-tilt';
  }
  return 'i-ph:clock';
}

export function ActivityFeed({ workspaceId, refreshKey }: { workspaceId: string; refreshKey: number }) {
  const [items, setItems] = useState<AutomationActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const result = await withTimeout(listAutomationActivity(workspaceId, 50), LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE);
        if (mountedRef.current) {
          setItems(result);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current && !silent) {
          setError(err instanceof Error ? err.message : 'Failed to load activity.');
        }
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
      }
    },
    [workspaceId, refreshKey],
  );

  useEffect(() => {
    mountedRef.current = true;
    void load();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void load({ silent: true });
    }, ACTIVITY_POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Activity</h3>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs transition-colors disabled:opacity-50"
        >
          <i className={loading ? 'i-ph:spinner-gap animate-spin' : 'i-ph:arrow-clockwise'} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
          <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="space-y-2">
          <div className="h-12 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          <div className="h-12 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          <div className="h-12 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <EmptyState
          variant="compact"
          icon="i-ph:clock-counter-clockwise"
          title="No activity yet"
          description="Events appear here as soon as a discovery run, draft, publication, or connection change happens."
        />
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3">
              <span className="w-7 h-7 shrink-0 rounded-full bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                <i className={classNames(activityIcon(item.type), 'text-xs text-gray-500 dark:text-gray-400')} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-700 dark:text-gray-300 break-words">{item.message}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open on Reddit"
                  className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <i className="i-ph:arrow-square-out" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
