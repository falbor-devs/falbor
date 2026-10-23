'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { EmptyState } from '~/components/ui/EmptyState';
import { StatusPill, type StatusTone } from './StatusPill';
import { classNames } from '~/utils/classNames';
import { formatRelativeTime } from './format';
import {
  getPerformanceSummary,
  listPublications,
  reconcilePublication,
  refreshPublicationMetrics,
} from '~/lib/actions/automation/activity';
import type { PerformanceSummary, PublicationItem } from '~/lib/actions/automation/activity';

const SECONDARY_BUTTON =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const RANGE_OPTIONS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

function publicationTone(status: string): StatusTone {
  switch (status) {
    case 'verified':
      return 'good';
    case 'submitted':
      return 'info';
    case 'pending':
      return 'neutral';
    case 'failed':
    case 'removed_or_unavailable':
      return 'bad';
    case 'outcome_unknown':
      return 'warn';
    default:
      return 'neutral';
  }
}

function publicationLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

function MetricTile({
  label,
  value,
  unavailable,
  subtitle,
}: {
  label: string;
  value: number | null;
  unavailable?: boolean;
  subtitle?: string;
}) {
  const showUnavailable = unavailable || value === null;

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114]">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div
        className={classNames(
          'text-lg font-semibold',
          showUnavailable ? 'text-gray-400 dark:text-gray-500' : 'font-mono text-gray-900 dark:text-white',
        )}
      >
        {showUnavailable ? 'Unavailable' : value}
      </div>
      {showUnavailable && subtitle && <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export function PerformancePanel({ workspaceId }: { workspaceId: string }) {
  const [days, setDays] = useState<RangeDays>(30);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPublications, setLoadingPublications] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<{ id: string; action: 'refresh' | 'reconcile' } | null>(null);

  const loadSummary = useCallback(
    async (range: RangeDays) => {
      setLoadingSummary(true);
      try {
        const result = await getPerformanceSummary(workspaceId, range);
        setSummary(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the performance summary.');
      } finally {
        setLoadingSummary(false);
      }
    },
    [workspaceId],
  );

  const loadPublications = useCallback(async () => {
    setLoadingPublications(true);
    try {
      const result = await listPublications(workspaceId, 50);
      setPublications(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load publications.');
    } finally {
      setLoadingPublications(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadSummary(days);
  }, [days, loadSummary]);

  useEffect(() => {
    void loadPublications();
  }, [loadPublications]);

  const runPublicationAction = async (publication: PublicationItem, action: 'refresh' | 'reconcile') => {
    setRowBusy({ id: publication.id, action });
    setRowError((prev) => {
      const next = { ...prev };
      delete next[publication.id];
      return next;
    });
    try {
      const updated =
        action === 'refresh'
          ? await refreshPublicationMetrics(workspaceId, publication.id)
          : await reconcilePublication(workspaceId, publication.id);
      setPublications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(action === 'refresh' ? 'Metrics refreshed.' : 'Publication reconciled.');
      await loadSummary(days);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : action === 'refresh'
            ? 'Failed to refresh metrics.'
            : 'Failed to reconcile the publication.';
      setRowError((prev) => ({ ...prev, [publication.id]: message }));
    } finally {
      setRowBusy(null);
    }
  };

  const maxSnapshotCount = summary ? Math.max(...summary.snapshots.map((point) => point.count), 0) : 0;
  const firstSnapshotDate = summary?.snapshots[0]?.date ?? null;
  const lastSnapshotDate = summary?.snapshots[summary.snapshots.length - 1]?.date ?? null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Performance</h3>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[#18181b]">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={classNames(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                days === option
                  ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500',
              )}
            >
              {option} days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
          <button
            className="ml-auto text-xs font-semibold hover:underline shrink-0"
            onClick={() => {
              void loadSummary(days);
              void loadPublications();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loadingSummary && !summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-20 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        summary && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricTile label="Publications" value={summary.counts.published} />
              <MetricTile label="Verified" value={summary.counts.verified} />
              <MetricTile label="Failed" value={summary.counts.failed} />
              <MetricTile label="Outcome unknown" value={summary.counts.outcomeUnknown} />
              <MetricTile
                label="Score total"
                value={summary.totalScore}
                unavailable={summary.totalScore === null}
                subtitle="No engagement snapshots yet"
              />
              <MetricTile
                label="Comments total"
                value={summary.totalComments}
                unavailable={summary.totalComments === null}
                subtitle="No engagement snapshots yet"
              />
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114]">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Submissions per day</h4>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {firstSnapshotDate && lastSnapshotDate ? `${firstSnapshotDate} → ${lastSnapshotDate}` : 'No data'}
                </span>
              </div>
              {summary.snapshots.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No submissions in this range.</p>
              ) : (
                <div className="flex items-end gap-0.5 h-24">
                  {summary.snapshots.map((point) => (
                    <div
                      key={point.date}
                      title={`${point.date}: ${point.count}`}
                      className="flex-1 flex flex-col justify-end h-full min-w-[3px]"
                    >
                      <div
                        className="w-full rounded-sm bg-[#0099FF]/70 dark:bg-[#0099FF]/60"
                        style={{
                          height:
                            point.count === 0 || maxSnapshotCount === 0
                              ? '2px'
                              : `${Math.max((point.count / maxSnapshotCount) * 100, 4)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                Newest engagement snapshot:{' '}
                {summary.newestSnapshotAt ? formatRelativeTime(summary.newestSnapshotAt) : 'Unavailable — no snapshots yet'}
              </p>
            </div>
          </>
        )
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Publications</h4>

        {loadingPublications && publications.length === 0 && (
          <div className="space-y-2">
            <div className="h-20 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
            <div className="h-20 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          </div>
        )}

        {!loadingPublications && publications.length === 0 && (
          <EmptyState
            variant="compact"
            icon="i-ph:paper-plane-tilt"
            title="No publications yet"
            description="Publications appear once an approved draft is submitted through the browser extension."
          />
        )}

        {publications.map((publication) => {
          const isBusy = rowBusy?.id === publication.id;
          const metrics = publication.latestMetrics;

          return (
            <article
              key={publication.id}
              className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] space-y-2"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusPill label={publicationLabel(publication.status)} tone={publicationTone(publication.status)} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">r/{publication.subreddit}</span>
                    {publication.url && (
                      <a
                        href={publication.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open on Reddit"
                        className="text-gray-400 hover:text-[#0099FF] transition-colors"
                      >
                        <i className="i-ph:arrow-square-out" />
                      </a>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    Submitted {publication.submittedAt ? formatRelativeTime(publication.submittedAt) : '—'}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    {metrics ? (
                      <>
                        Score {metrics.score ?? '—'} · Comments {metrics.commentCount ?? '—'} · Last retrieved{' '}
                        {formatRelativeTime(metrics.retrievedAt)}
                      </>
                    ) : (
                      <>Latest metrics: Unavailable (no snapshot)</>
                    )}
                  </div>
                  {publication.lastError && (
                    <p className="text-[11px] text-red-500 mt-1 break-words">{publication.lastError}</p>
                  )}
                  {rowError[publication.id] && (
                    <p className="text-[11px] text-red-500 mt-1 break-words">{rowError[publication.id]}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => void runPublicationAction(publication, 'refresh')}
                    disabled={!publication.externalId || isBusy}
                    title={!publication.externalId ? 'Refresh unavailable: no Reddit id is stored for this publication.' : undefined}
                    className={SECONDARY_BUTTON}
                  >
                    {isBusy && rowBusy?.action === 'refresh' ? (
                      <i className="i-ph:spinner-gap animate-spin" />
                    ) : (
                      <i className="i-ph:arrow-clockwise" />
                    )}
                    Refresh metrics
                  </button>
                  <button
                    onClick={() => void runPublicationAction(publication, 'reconcile')}
                    disabled={isBusy}
                    className={SECONDARY_BUTTON}
                  >
                    {isBusy && rowBusy?.action === 'reconcile' ? (
                      <i className="i-ph:spinner-gap animate-spin" />
                    ) : (
                      <i className="i-ph:crosshair" />
                    )}
                    Reconcile
                  </button>
                </div>
              </div>

              {!publication.externalId && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Refresh unavailable: Falbor has no Reddit id for this publication, so metrics cannot be retrieved.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
