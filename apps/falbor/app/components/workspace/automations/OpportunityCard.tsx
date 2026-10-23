'use client';

import React from 'react';
import { classNames } from '~/utils/classNames';
import type { OpportunityListItem } from '~/lib/actions/automation/opportunities';
import { StatusPill, type StatusTone } from './StatusPill';
import { formatRelativeTime } from './format';

interface OpportunityCardProps {
  item: OpportunityListItem;
  busy: boolean;
  onOpen: () => void;
  onAnalyze: () => void;
  onGenerateDraft: () => void;
  onSetStatus: (status: 'saved' | 'dismissed' | 'new') => void;
}

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed';

function statusMeta(status: OpportunityListItem['status']): { label: string; tone: StatusTone } {
  switch (status) {
    case 'new':
      return { label: 'New', tone: 'neutral' };
    case 'analyzed':
      return { label: 'Analyzed', tone: 'info' };
    case 'drafted':
      return { label: 'Drafted', tone: 'info' };
    case 'saved':
      return { label: 'Saved', tone: 'good' };
    case 'dismissed':
      return { label: 'Dismissed', tone: 'neutral' };
    case 'uncertain':
      return { label: 'Uncertain', tone: 'warn' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

function promotionMeta(confidence: OpportunityListItem['promotionConfidence']): { label: string; tone: StatusTone } | null {
  switch (confidence) {
    case 'verified_allowed':
      return { label: 'Promotion allowed (rules checked)', tone: 'good' };
    case 'verified_restricted':
      return { label: 'Promotion restricted', tone: 'warn' };
    case 'uncertain':
      return { label: 'Promotion unclear', tone: 'warn' };
    case 'unavailable':
      return { label: 'Rules not verified', tone: 'neutral' };
    case 'verified_prohibited':
      return { label: 'Promotion not allowed', tone: 'bad' };
    default:
      return null;
  }
}

function relevanceClass(score: number): string {
  if (score >= 70) return 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400';
  if (score >= 40) return 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
}

export function OpportunityCard({ item, busy, onOpen, onAnalyze, onGenerateDraft, onSetStatus }: OpportunityCardProps) {
  const analyzed = item.analysis != null;
  const promotion = promotionMeta(item.promotionConfidence);
  const workflow = statusMeta(item.status);
  const source = item.analysis?.summary || item.body || '';
  const excerpt = source.length > 220 ? `${source.slice(0, 220).trimEnd()}…` : source;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="text-sm font-semibold text-gray-900 dark:text-white text-left hover:underline line-clamp-2"
            >
              {item.title}
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              title="Open the discussion on Reddit"
              aria-label="Open the discussion on Reddit"
              className="shrink-0 mt-0.5 text-gray-400 hover:text-[#0099FF] transition-colors"
            >
              <i className="i-ph:arrow-square-out" />
            </a>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 font-medium">
              r/{item.subreddit}
            </span>
            <span title={item.postedAt ?? 'Post date unavailable'}>{formatRelativeTime(item.postedAt)}</span>
            <span
              className="flex items-center gap-1"
              title={item.score == null ? 'Upvote count unavailable' : `${item.score} upvotes`}
            >
              <i className="i-ph:arrow-fat-up" /> {item.score ?? '—'} upvotes
            </span>
            <span
              className="flex items-center gap-1"
              title={item.numComments == null ? 'Comment count unavailable' : `${item.numComments} comments`}
            >
              <i className="i-ph:chat-circle" /> {item.numComments ?? '—'} comments
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill label={workflow.label} tone={workflow.tone} />
          {item.relevanceScore != null ? (
            <span
              className={classNames(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                relevanceClass(item.relevanceScore),
              )}
              title={`Relevance score ${Math.round(item.relevanceScore)} / 100`}
            >
              {Math.round(item.relevanceScore)} relevance
            </span>
          ) : (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              title="This discussion has not been analyzed yet"
            >
              Not analyzed
            </span>
          )}
          {promotion && <StatusPill label={promotion.label} tone={promotion.tone} />}
        </div>
      </div>

      {excerpt && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{excerpt}</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={onAnalyze} disabled={busy} className={SECONDARY_BUTTON}>
          {busy ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:sparkle" />}
          {analyzed ? 'Re-analyze' : 'Analyze'}
        </button>
        <button
          type="button"
          onClick={onGenerateDraft}
          disabled={!analyzed || busy}
          title={!analyzed ? 'Analyze first' : undefined}
          className={PRIMARY_BUTTON}
        >
          <i className="i-ph:magic-wand" />
          Generate draft
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetStatus(item.status === 'saved' ? 'new' : 'saved')}
            className={SECONDARY_BUTTON}
          >
            <i className={item.status === 'saved' ? 'i-ph:bookmark-simple-fill' : 'i-ph:bookmark-simple'} />
            {item.status === 'saved' ? 'Unsave' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onSetStatus(item.status === 'dismissed' ? 'new' : 'dismissed')}
            className={classNames(SECONDARY_BUTTON, 'hover:text-red-500 dark:hover:text-red-400')}
          >
            <i className={item.status === 'dismissed' ? 'i-ph:arrow-counter-clockwise' : 'i-ph:x-circle'} />
            {item.status === 'dismissed' ? 'Restore' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}
