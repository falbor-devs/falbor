'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { EmptyState } from '~/components/ui/EmptyState';
import { classNames } from '~/utils/classNames';
import {
  analyzeOpportunity,
  listOpportunities,
  setOpportunityStatus,
  startDiscovery,
  type OpportunityListItem,
} from '~/lib/actions/automation/opportunities';
import { generateDraft, type DraftListItem } from '~/lib/actions/automation/drafts';
import type { AutomationStatusSummary } from '~/lib/automation/types';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityDetailDialog } from './OpportunityDetailDialog';
import { DraftEditorDialog } from './DraftEditorDialog';
import { LOAD_TIMEOUT_MS, TIMEOUT_MESSAGE, withTimeout } from './withTimeout';

const PAGE_SIZE = 20;

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed';

type OpportunityFilter = 'all' | 'new' | 'analyzed' | 'saved' | 'dismissed';

const FILTERS: Array<{ value: OpportunityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'saved', label: 'Saved' },
  { value: 'dismissed', label: 'Dismissed' },
];

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong.';
}

interface OpportunityListProps {
  workspaceId: string;
  status: AutomationStatusSummary | null;
  refreshStatus: () => void;
}

export function OpportunityList({ workspaceId, status, refreshStatus }: OpportunityListProps) {
  const [items, setItems] = useState<OpportunityListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<OpportunityFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<OpportunityListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<DraftListItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const requestIdRef = useRef(0);

  const connected = status?.reddit.status === 'connected';
  const discoveryRunning = running || status?.lastDiscovery?.status === 'running';

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLoadingMore(false);
      }
      setError(null);
      try {
        const result = await withTimeout(
          listOpportunities(workspaceId, {
            status: filter === 'all' ? undefined : filter,
            limit: PAGE_SIZE,
            offset,
          }),
          LOAD_TIMEOUT_MS,
          TIMEOUT_MESSAGE,
        );
        if (requestId !== requestIdRef.current) return;
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(messageOf(err));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [workspaceId, filter],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  const handleRunDiscovery = useCallback(async () => {
    if (!connected || discoveryRunning) return;
    setRunning(true);
    setError(null);
    setWarning(null);
    try {
      const result = await startDiscovery(workspaceId);
      toast.success(
        `Discovery finished — ${result.found} discussions found, ${result.upserted} added or updated.`,
      );
      if (result.error) setWarning(result.error);
      await loadPage(0, false);
      refreshStatus();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setRunning(false);
    }
  }, [connected, discoveryRunning, workspaceId, loadPage, refreshStatus]);

  const handleAnalyze = useCallback(
    async (item: OpportunityListItem) => {
      if (busyId) return;
      setBusyId(item.id);
      try {
        const updated = await analyzeOpportunity(workspaceId, item.id);
        setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        setDetailItem((prev) => (prev && prev.id === updated.id ? updated : prev));
        toast.success('Analysis complete.');
        refreshStatus();
      } catch (err) {
        toast.error(messageOf(err));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, workspaceId, refreshStatus],
  );

  const handleGenerateDraft = useCallback(
    async (item: OpportunityListItem) => {
      if (busyId) return;
      setBusyId(item.id);
      try {
        const draft = await generateDraft(workspaceId, item.id);
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id && row.status !== 'saved' && row.status !== 'dismissed'
              ? { ...row, status: 'drafted' as const }
              : row,
          ),
        );
        setDetailOpen(false);
        setDetailItem(null);
        setEditorDraft(draft);
        setEditorOpen(true);
        toast.success('Draft created.');
        refreshStatus();
      } catch (err) {
        toast.error(messageOf(err));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, workspaceId, refreshStatus],
  );

  const handleSetStatus = useCallback(
    async (item: OpportunityListItem, next: 'saved' | 'dismissed' | 'new') => {
      if (actionLoadingId) return;
      setActionLoadingId(item.id);
      try {
        await setOpportunityStatus(workspaceId, item.id, next);
        setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, status: next } : row)));
        setDetailItem((prev) => (prev && prev.id === item.id ? { ...prev, status: next } : prev));
        toast.success(next === 'saved' ? 'Discussion saved.' : next === 'dismissed' ? 'Discussion dismissed.' : 'Status reset.');
        refreshStatus();
      } catch (err) {
        toast.error(messageOf(err));
      } finally {
        setActionLoadingId(null);
      }
    },
    [actionLoadingId, workspaceId, refreshStatus],
  );

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) => item.title.toLowerCase().includes(query) || item.subreddit.toLowerCase().includes(query),
    );
  }, [items, search]);

  const connectGuidance = error !== null && /not connected|REDDIT_CLIENT_ID/i.test(error);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Opportunities</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Reddit discussions that may be worth a helpful reply.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!connected && status !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Connect Reddit first to run discovery</span>
          )}
          <button
            type="button"
            onClick={() => void handleRunDiscovery()}
            disabled={!connected || discoveryRunning}
            title={!connected ? 'Connect Reddit first to run discovery' : undefined}
            className={PRIMARY_BUTTON}
          >
            {discoveryRunning ? (
              <i className="i-ph:spinner-gap animate-spin" />
            ) : (
              <i className="i-ph:magnifying-glass" />
            )}
            Run discovery
          </button>
        </div>
      </div>

      {discoveryRunning && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs flex items-center gap-2">
          <i className="i-ph:spinner-gap animate-spin shrink-0" />
          Searching Reddit — this can take up to a minute.
        </div>
      )}

      {warning && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
          <span className="flex-1">{warning}</span>
          <button type="button" className="text-xs font-semibold hover:underline" onClick={() => setWarning(null)}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
          <span className="flex-1">
            {error}
            {connectGuidance && (
              <span className="block mt-1 text-red-600 dark:text-red-300">
                Your Reddit account is not connected. Open the Overview tab to connect Reddit, then try again.
              </span>
            )}
          </span>
          <button
            type="button"
            className="text-xs font-semibold hover:underline shrink-0"
            onClick={() => void loadPage(0, false)}
          >
            Retry
          </button>
          <button type="button" className="text-xs font-semibold hover:underline shrink-0" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[#18181b]">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={classNames(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                filter === option.value
                  ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or subreddit…"
          className="w-56 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111114] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0099FF]/40"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-12 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        !connected && status !== null ? (
          <EmptyState
            icon="i-ph:reddit-logo"
            title="Connect Reddit to discover opportunities"
            description="Open the Overview tab to connect your Reddit account, then run discovery here."
          />
        ) : search.trim() !== '' || filter !== 'all' ? (
          <EmptyState
            icon="i-ph:magnifying-glass"
            title="No discussions match"
            description="Try a different search term or switch the status filter."
          />
        ) : (
          <EmptyState
            icon="i-ph:compass"
            title="No opportunities discovered yet"
            description={
              discoveryRunning
                ? 'Discovery is running…'
                : 'Run discovery to scan Reddit for discussions your product can help with.'
            }
            actionLabel={discoveryRunning ? undefined : 'Run discovery'}
            onAction={discoveryRunning ? undefined : () => void handleRunDiscovery()}
          />
        )
      ) : (
        <>
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onOpen={() => {
                  setDetailItem(item);
                  setDetailOpen(true);
                }}
                onAnalyze={() => void handleAnalyze(item)}
                onGenerateDraft={() => void handleGenerateDraft(item)}
                onSetStatus={(next) => void handleSetStatus(item, next)}
              />
            ))}
          </div>
          {items.length < total && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => void loadPage(items.length, true)}
                disabled={loadingMore}
                className={SECONDARY_BUTTON}
              >
                {loadingMore ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:caret-down" />}
                Load more
              </button>
            </div>
          )}
          <p className="text-center text-[11px] text-gray-400">
            Showing {visibleItems.length} of {total} discussions
          </p>
        </>
      )}

      <OpportunityDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailItem(null);
        }}
        busy={detailItem !== null && busyId === detailItem.id}
        onAnalyze={() => {
          if (detailItem) void handleAnalyze(detailItem);
        }}
        onGenerateDraft={() => {
          if (detailItem) void handleGenerateDraft(detailItem);
        }}
        onSetStatus={(next) => {
          if (detailItem) void handleSetStatus(detailItem, next);
        }}
      />

      <DraftEditorDialog
        workspaceId={workspaceId}
        draft={editorDraft}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditorDraft(null);
        }}
        extensionConnected={status?.extension.state === 'connected'}
        onChanged={refreshStatus}
      />
    </div>
  );
}
