'use client';

import React from 'react';
import { Dialog, DialogRoot } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import type { OpportunityListItem } from '~/lib/actions/automation/opportunities';
import { StatusPill, type StatusTone } from './StatusPill';
import { formatRelativeTime } from './format';

interface OpportunityDetailDialogProps {
  item: OpportunityListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onAnalyze: () => void;
  onGenerateDraft: () => void;
  onSetStatus: (status: 'saved' | 'dismissed' | 'new') => void;
}

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed';
const MUTED_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed';

const FACTOR_LABELS: Record<string, string> = {
  problemRelevance: 'Problem relevance',
  audienceRelevance: 'Audience relevance',
  productFit: 'Product fit',
  intentSignal: 'Intent signal',
  recency: 'Recency',
  communityFit: 'Community fit',
  participationValue: 'Participation value',
};

const PROMOTION_ALLOWED_META: Record<string, { label: string; tone: StatusTone }> = {
  yes: { label: 'Promotion allowed', tone: 'good' },
  no: { label: 'Promotion not allowed', tone: 'bad' },
  unclear: { label: 'Promotion unclear', tone: 'warn' },
};

const RECOMMENDED_ACTION_META: Record<string, { label: string; tone: StatusTone }> = {
  comment: { label: 'Recommended: comment', tone: 'info' },
  post: { label: 'Recommended: post', tone: 'info' },
  monitor: { label: 'Recommended: monitor', tone: 'neutral' },
  skip: { label: 'Recommended: skip', tone: 'warn' },
};

const RULES_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  verified: { label: 'Rules verified', tone: 'good' },
  unavailable: { label: 'Rules unavailable', tone: 'neutral' },
  error: { label: 'Rules check failed', tone: 'bad' },
};

const ALLOWS_PROMOTION_META: Record<string, { label: string; tone: StatusTone }> = {
  yes: { label: 'Promotion allowed by rules', tone: 'good' },
  no: { label: 'Promotion prohibited by rules', tone: 'bad' },
  unclear: { label: 'Promotion unclear in rules', tone: 'warn' },
};

const WORKFLOW_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  new: { label: 'New', tone: 'neutral' },
  analyzed: { label: 'Analyzed', tone: 'info' },
  drafted: { label: 'Drafted', tone: 'info' },
  saved: { label: 'Saved', tone: 'good' },
  dismissed: { label: 'Dismissed', tone: 'neutral' },
  uncertain: { label: 'Uncertain', tone: 'warn' },
};

function relevanceClass(score: number): string {
  if (score >= 70) return 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400';
  if (score >= 40) return 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{children}</h3>;
}

function TextRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function OpportunityDetailDialog({
  item,
  open,
  onOpenChange,
  busy,
  onAnalyze,
  onGenerateDraft,
  onSetStatus,
}: OpportunityDetailDialogProps) {
  if (!item) return null;

  const analysis = item.analysis;
  const rules = item.communityRules;
  const workflow = WORKFLOW_STATUS_META[item.status] ?? { label: item.status, tone: 'neutral' as StatusTone };
  const promotion = analysis ? PROMOTION_ALLOWED_META[analysis.promotionAllowed] : null;
  const recommendedAction = analysis ? RECOMMENDED_ACTION_META[analysis.recommendedAction] : null;
  const factors: Array<[string, number]> = item.factors
    ? (Object.entries(item.factors).filter(
        ([, value]) => typeof value === 'number' && Number.isFinite(value),
      ) as Array<[string, number]>)
    : [];

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog
        className="!w-[760px] !max-w-[92vw] !max-h-[85vh] overflow-y-auto p-6 bg-white dark:bg-[#0d0d10]"
        onBackdrop={() => onOpenChange(false)}
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 font-medium">
                  r/{item.subreddit}
                </span>
                {item.author && <span>u/{item.author}</span>}
                <span>{formatRelativeTime(item.postedAt)}</span>
                <span title={item.score == null ? 'Upvote count unavailable' : `${item.score} upvotes`}>
                  {item.score ?? '—'} upvotes
                </span>
                <span title={item.numComments == null ? 'Comment count unavailable' : `${item.numComments} comments`}>
                  {item.numComments ?? '—'} comments
                </span>
                <StatusPill label={workflow.label} tone={workflow.tone} />
              </div>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className={classNames(SECONDARY_BUTTON, 'shrink-0')}
            >
              View on Reddit <i className="i-ph:arrow-square-out" />
            </a>
          </div>

          {item.body && (
            <section>
              <SectionTitle>Discussion body</SectionTitle>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-3 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                {item.body}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI analysis</h3>
              {item.relevanceScore != null && (
                <span
                  className={classNames(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                    relevanceClass(item.relevanceScore),
                  )}
                  title={`Relevance score ${Math.round(item.relevanceScore)} / 100`}
                >
                  {Math.round(item.relevanceScore)} relevance
                </span>
              )}
            </div>

            {analysis ? (
              <div className="space-y-3">
                <TextRow label="Summary" value={analysis.summary} />
                <TextRow label="Why relevant" value={analysis.whyRelevant} />
                <TextRow label="User problem" value={analysis.userProblem} />
                <TextRow label="Contribution angle" value={analysis.contributionAngle} />
                <div className="flex flex-wrap items-center gap-2">
                  {promotion && <StatusPill label={promotion.label} tone={promotion.tone} />}
                  {recommendedAction && (
                    <StatusPill label={recommendedAction.label} tone={recommendedAction.tone} />
                  )}
                  {analysis.uncertainty && <StatusPill label="Analysis is uncertain" tone="warn" />}
                </div>
                <TextRow label="Promotion reason" value={analysis.promotionReason} />
                {factors.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Factor scores</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      {factors.map(([key, value]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                            <span>{FACTOR_LABELS[key] ?? key}</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{Math.round(value)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#0099FF]"
                              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">Warnings</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                      {analysis.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.analyzedAt && (
                  <p className="text-[11px] text-gray-400">Analyzed {formatRelativeTime(item.analyzedAt)}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                  Not analyzed yet. Run the AI analysis to score relevance, check promotion rules and get a recommended
                  action.
                </p>
                <button type="button" onClick={onAnalyze} disabled={busy} className={PRIMARY_BUTTON}>
                  {busy ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:sparkle" />}
                  Analyze
                </button>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Community rules</h3>
              {item.rulesCheckedAt && (
                <span className="text-[11px] text-gray-400">Checked {formatRelativeTime(item.rulesCheckedAt)}</span>
              )}
            </div>
            {rules ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    label={(RULES_STATUS_META[rules.status] ?? { label: rules.status, tone: 'neutral' as StatusTone }).label}
                    tone={(RULES_STATUS_META[rules.status] ?? { label: rules.status, tone: 'neutral' as StatusTone }).tone}
                  />
                  <StatusPill
                    label={
                      (ALLOWS_PROMOTION_META[rules.allowsPromotion] ?? {
                        label: 'Promotion unclear in rules',
                        tone: 'warn' as StatusTone,
                      }).label
                    }
                    tone={
                      (ALLOWS_PROMOTION_META[rules.allowsPromotion] ?? {
                        label: 'Promotion unclear in rules',
                        tone: 'warn' as StatusTone,
                      }).tone
                    }
                  />
                </div>
                {rules.notes && (
                  <blockquote className="border-l-2 border-gray-300 dark:border-gray-700 pl-3 text-xs italic text-gray-500 dark:text-gray-400">
                    {rules.notes}
                  </blockquote>
                )}
                {rules.status === 'error' && rules.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">{rules.error}</p>
                )}
                {Array.isArray(rules.rules) && rules.rules.length > 0 && (
                  <ul className="space-y-1.5">
                    {rules.rules.slice(0, 8).map((rule, index) => (
                      <li key={index} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{rule.shortName}</span>
                        {rule.description ? ` — ${rule.description}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : item.rulesNotes ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{item.rulesNotes}</p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Community rules were not checked for this discussion yet. Analyze the discussion to run the heuristic
                rules check.
              </p>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={onAnalyze} disabled={busy} className={SECONDARY_BUTTON}>
              {busy ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:sparkle" />}
              {analysis ? 'Re-analyze' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={onGenerateDraft}
              disabled={!analysis || busy}
              title={!analysis ? 'Analyze first' : undefined}
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
              <button type="button" onClick={() => onOpenChange(false)} className={MUTED_BUTTON}>
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
