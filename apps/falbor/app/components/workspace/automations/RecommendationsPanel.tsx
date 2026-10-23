'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '~/components/ui/EmptyState';
import { StatusPill } from './StatusPill';
import { getRecommendations } from '~/lib/actions/automation/activity';
import type { Recommendation } from '~/lib/actions/automation/activity';
import { LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE, withTimeout } from './withTimeout';

export function RecommendationsPanel({ workspaceId, refreshKey }: { workspaceId: string; refreshKey: number }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await withTimeout(getRecommendations(workspaceId), LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE);
      setRecommendations(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recommendations</h3>
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

      {loading && recommendations.length === 0 && (
        <div className="space-y-2">
          <div className="h-24 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          <div className="h-24 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        </div>
      )}

      {!loading && recommendations.length === 0 && !error && (
        <EmptyState
          variant="compact"
          icon="i-ph:lightbulb"
          title="No recommendations yet"
          description="Recommendations appear once there is real activity."
        />
      )}

      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((recommendation) => (
            <article
              key={recommendation.id}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{recommendation.title}</h4>
                {recommendation.requiresApproval && <StatusPill label="Requires approval" tone="warn" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{recommendation.observation}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Why it matters: </span>
                {recommendation.whyItMatters}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Suggested action: </span>
                {recommendation.suggestedAction}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Based on {recommendation.evidenceIds.length} record
                {recommendation.evidenceIds.length === 1 ? '' : 's'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
