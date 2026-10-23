'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '~/components/ui/EmptyState';
import { classNames } from '~/utils/classNames';
import { listDrafts, type DraftListItem } from '~/lib/actions/automation/drafts';
import type { AutomationStatusSummary } from '~/lib/automation/types';
import { StatusPill, type StatusTone } from './StatusPill';
import { formatRelativeTime } from './format';
import { DraftEditorDialog } from './DraftEditorDialog';

type DraftFilter = 'all' | 'awaiting' | 'approved' | 'queued' | 'published' | 'attention';

const FILTERS: Array<{ value: DraftFilter; label: string; statuses: string[] | null; empty: string }> = [
  { value: 'all', label: 'All', statuses: null, empty: 'No drafts yet. Generate a draft from an analyzed opportunity to get started.' },
  {
    value: 'awaiting',
    label: 'Awaiting approval',
    statuses: ['awaiting_approval'],
    empty: 'No drafts waiting for approval.',
  },
  {
    value: 'approved',
    label: 'Approved',
    statuses: ['approved'],
    empty: 'No approved drafts. Approve a draft to queue it for publication.',
  },
  {
    value: 'queued',
    label: 'Queued & publishing',
    statuses: ['queued', 'submitting', 'submitted'],
    empty: 'Nothing queued or publishing right now.',
  },
  {
    value: 'published',
    label: 'Published',
    statuses: ['verified'],
    empty: 'No published drafts yet. Verified publications will appear here.',
  },
  {
    value: 'attention',
    label: 'Needs attention',
    statuses: ['failed', 'outcome_unknown', 'removed_or_unavailable'],
    empty: 'Nothing needs attention. Failed or unverified publications will appear here.',
  },
];

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'good' },
  queued: { label: 'Queued for extension', tone: 'info' },
  submitting: { label: 'Submitting', tone: 'info' },
  submitted: { label: 'Submitted (unverified)', tone: 'info' },
  verified: { label: 'Verified', tone: 'good' },
  failed: { label: 'Failed', tone: 'bad' },
  outcome_unknown: { label: 'Outcome unknown', tone: 'warn' },
  removed_or_unavailable: { label: 'Removed/unavailable', tone: 'bad' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong.';
}

interface DraftsPanelProps {
  workspaceId: string;
  status: AutomationStatusSummary | null;
  refreshStatus: () => void;
}

export function DraftsPanel({ workspaceId, status, refreshStatus }: DraftsPanelProps) {
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [filter, setFilter] = useState<DraftFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<DraftListItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const activeFilter = useMemo(() => FILTERS.find((item) => item.value === filter) ?? FILTERS[0], [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statuses = activeFilter.statuses;
      if (!statuses) {
        setDrafts(await listDrafts(workspaceId, { limit: 100 }));
      } else if (statuses.length === 1) {
        setDrafts(await listDrafts(workspaceId, { status: statuses[0], limit: 100 }));
      } else {
        const results = await Promise.all(
          statuses.map((draftStatus) => listDrafts(workspaceId, { status: draftStatus, limit: 100 })),
        );
        const merged = new Map<string, DraftListItem>();
        results.forEach((list) => list.forEach((draft) => merged.set(draft.id, draft)));
        setDrafts(
          Array.from(merged.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
        );
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, activeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const extensionDisconnected = status !== null && status.extension.state !== 'connected';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Drafts</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Analyze → Generate draft → Review → Approve → Extension publishes with your click → Verification.
        </p>
      </div>

      {extensionDisconnected && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
          <span>Your browser extension is not connected — approved posts cannot be delivered until it is.</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button type="button" className="text-xs font-semibold hover:underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[#18181b] overflow-x-auto">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={classNames(
              'px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              filter === option.value
                ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-12 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState icon="i-ph:notebook" title="No drafts here" description={activeFilter.empty} />
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => {
            const statusMeta = STATUS_META[draft.status] ?? { label: draft.status, tone: 'neutral' as StatusTone };
            return (
              <div
                key={draft.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setEditorDraft(draft);
                  setEditorOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setEditorDraft(draft);
                    setEditorOpen(true);
                  }
                }}
                className="w-full text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 cursor-pointer hover:border-[#0099FF]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap flex-1">
                    {draft.body}
                  </p>
                  <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {draft.opportunity && (
                    <>
                      <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1 max-w-[420px]">
                        {draft.opportunity.title}
                      </span>
                      <a
                        href={draft.opportunity.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 hover:text-[#0099FF] transition-colors"
                      >
                        r/{draft.opportunity.subreddit} <i className="i-ph:arrow-square-out" />
                      </a>
                    </>
                  )}
                  <span title={draft.updatedAt}>{formatRelativeTime(draft.updatedAt)}</span>
                  {draft.productMentioned && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 text-[11px] font-medium">
                      Mentions product
                    </span>
                  )}
                  {draft.generation > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-medium">
                      rev {draft.generation}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DraftEditorDialog
        workspaceId={workspaceId}
        draft={editorDraft}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditorDraft(null);
        }}
        extensionConnected={status?.extension.state === 'connected'}
        onChanged={() => {
          void load();
          refreshStatus();
        }}
      />
    </div>
  );
}
