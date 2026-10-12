'use client';

import React, { useState } from 'react';
import { Dialog, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import classNames from 'classnames';
import type { Competitor } from './types';

interface CompetitorDetailModalProps {
  competitor: Competitor | null;
  onClose: () => void;
}

type IntelligenceTab =
  | 'overview'
  | 'recommends'
  | 'headToHead'
  | 'sources'
  | 'positioning'
  | 'pricing'
  | 'features'
  | 'audience'
  | 'content'
  | 'messaging'
  | 'community'
  | 'ads'
  | 'timeline';

export function CompetitorDetailModal({ competitor, onClose }: CompetitorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('overview');
  const [hasFaviconFailed, setHasFaviconFailed] = useState(false);
  if (!competitor) return null;

  const tabs: Array<{ id: IntelligenceTab; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: 'i-ph:chart-pie-duotone' },
    { id: 'recommends', label: 'Why AI Recommends', icon: 'i-ph:sparkle-duotone' },
    { id: 'headToHead', label: 'Where They Beat Us', icon: 'i-ph:sword-duotone' },
    { id: 'sources', label: 'Sources Support', icon: 'i-ph:share-network-duotone' },
    { id: 'positioning', label: 'Positioning Map', icon: 'i-ph:compass-duotone' },
    { id: 'pricing', label: 'Pricing Comparison', icon: 'i-ph:currency-circle-dollar-duotone' },
    { id: 'features', label: 'Feature Matrix', icon: 'i-ph:squares-four-duotone' },
    { id: 'audience', label: 'Audience / ICP', icon: 'i-ph:users-three-duotone' },
    { id: 'content', label: 'New Content', icon: 'i-ph:article-duotone' },
    { id: 'messaging', label: 'Messaging Changes', icon: 'i-ph:chats-teardrop-duotone' },
    { id: 'community', label: 'Community Presence', icon: 'i-ph:chat-circle-dots-duotone' },
    { id: 'ads', label: 'Ad Intelligence', icon: 'i-ph:megaphone-duotone' },
    { id: 'timeline', label: 'Recent Changes Timeline', icon: 'i-ph:clock-counter-clockwise-duotone' },
  ];

  return (
    <DialogRoot open={!!competitor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog
        onClose={onClose}
        onBackdrop={onClose}
        className="!w-[950px] !max-w-[95vw] !h-[85vh] p-0 flex flex-col overflow-hidden bg-white dark:bg-[#121215] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl"
      >
        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800 shrink-0 bg-[#FAFAFA] dark:bg-[#18181C]">
          <div className="flex items-center gap-3">
            {competitor.isUserProduct ? (
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ★
              </div>
            ) : competitor.domain && !hasFaviconFailed ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=64`}
                alt=""
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 p-1 border border-gray-200 dark:border-zinc-800 object-contain shrink-0 shadow-sm"
                onError={() => setHasFaviconFailed(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {competitor.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-xl font-bold">
                {competitor.name}
                {competitor.isUserProduct && <span className="text-xs font-normal text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">• You</span>}
              </div>
              <div className="text-xs text-gray-400 font-normal">{competitor.domain || 'No domain registered'}</div>
            </div>
          </div>
        </DialogTitle>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-64 border-r border-gray-200 dark:border-zinc-800 p-3 flex flex-col gap-1 overflow-y-auto bg-[#F9F9FB] dark:bg-[#141417] shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={classNames(
                    'w-full text-left px-3 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2.5 transition-all',
                    isActive
                      ? 'bg-[#0099ff]/20 text-[#0099ff]'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60'
                  )}
                >
                  <i className={classNames(tab.icon, 'text-base shrink-0')} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#121215]">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                    <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">AI Visibility</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-white mt-1">{competitor.visibilityPct}%</div>
                  </div>
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Share of Voice</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-white mt-1">{competitor.sovPct}%</div>
                  </div>
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Average Rank</div>
                    <div className="text-2xl font-bold text-emerald-900 dark:text-white mt-1">{competitor.avgPosition}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">AI Strategic Assessment</h4>
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {competitor.headToHead?.whyTheyWin || 'Not enough evidence yet.'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recommends' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Why AI Recommends {competitor.name}</h4>
                {(!competitor.whyRecommends || competitor.whyRecommends.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitor.whyRecommends.map((item, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-900 dark:text-white">{item.factor}</span>
                          <span className="font-extrabold text-purple-600 dark:text-purple-400">{item.score}/100</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div style={{ width: `${item.score}%` }} className="h-full bg-purple-600 rounded-full" />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{item.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'headToHead' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Direct Head-to-Head Benchmark</h4>
                {(!competitor.headToHead?.metrics || competitor.headToHead.metrics.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-gray-200 dark:divide-zinc-800 text-xs">
                    <div className="grid grid-cols-4 p-3 bg-gray-50 dark:bg-zinc-900 font-bold text-gray-500">
                      <div>Area</div>
                      <div>Our Product</div>
                      <div>{competitor.name}</div>
                      <div>Winner</div>
                    </div>
                    {competitor.headToHead.metrics.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-4 p-3.5 items-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{m.area}</div>
                        <div>{m.ourValue}</div>
                        <div>{m.competitorValue}</div>
                        <div>
                          <span className={classNames('px-2 py-0.5 rounded-full text-[10px] font-bold', m.winner === 'us' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                            {m.winner === 'us' ? 'Our Product' : competitor.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sources' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Supporting Sources & Citation Map</h4>
                {(!competitor.sources || competitor.sources.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitor.sources.map((src, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-gray-900 dark:text-white">{src.name}</span>
                          <span className="text-purple-600">Authority: {src.authority}/100</span>
                        </div>
                        <div className="text-gray-500">{(src.reasons || []).join(' · ')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'positioning' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Market Positioning Profile</h4>
                {!competitor.positioning?.category ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-3">
                    <div><span className="font-semibold text-gray-500">Category:</span> {competitor.positioning.category}</div>
                    <div><span className="font-semibold text-gray-500">Core Promise:</span> {competitor.positioning.corePromise}</div>
                    <div><span className="font-semibold text-gray-500">Target Audience:</span> {competitor.positioning.targetAudience}</div>
                    {competitor.positioning.primaryProblem && (
                      <div><span className="font-semibold text-gray-500">Primary Problem:</span> {competitor.positioning.primaryProblem}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pricing Model & Tiers</h4>
                {(!competitor.pricing?.plans || competitor.pricing.plans.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {competitor.pricing.plans.map((p, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-1">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</div>
                        <div className="text-lg font-extrabold text-purple-600">{p.price}</div>
                        <div className="text-gray-500">{p.limits}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Feature Matrix</h4>
                {(!competitor.features || competitor.features.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {competitor.features.map((f, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-900 dark:text-white">{f.name}</span>
                        <span className={classNames('px-2 py-0.5 rounded-full font-bold text-[10px]', f.available === true ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600')}>
                          {f.available === true ? 'Available' : 'Unknown / Evidence Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audience' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Audience / ICP Profile</h4>
                {!competitor.audience?.icp ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-3">
                    <div><span className="font-semibold text-gray-500">Ideal Customer Profile:</span> {competitor.audience.icp}</div>
                    <div><span className="font-semibold text-gray-500">Company Size:</span> {competitor.audience.companySize}</div>
                    <div><span className="font-semibold text-gray-500">Industry:</span> {competitor.audience.industry}</div>
                    {competitor.audience.overlapPct !== undefined && (
                      <div><span className="font-semibold text-gray-500">Audience Overlap:</span> {competitor.audience.overlapPct}%</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">New Content & Updates</h4>
                {(!competitor.newContent || competitor.newContent.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitor.newContent.map((c, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                          <span>{c.title}</span>
                          <span className="text-purple-600">{c.date}</span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-300">{c.whatChanged}</div>
                        <div className="text-gray-500 font-medium">Why it matters: {c.whyItMatters}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messaging' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Messaging & Positioning Shifts</h4>
                {(!competitor.messagingChanges || competitor.messagingChanges.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitor.messagingChanges.map((m, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-2">
                        <div className="font-bold text-purple-600">{m.area}</div>
                        <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-300">
                          <div><span className="font-semibold text-gray-500">Previous:</span> {m.previous}</div>
                          <div><span className="font-semibold text-gray-500">Current:</span> {m.current}</div>
                        </div>
                        <div className="text-gray-500 font-medium">Impact: {m.impact}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'community' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Community Presence & Social Signals</h4>
                {(!competitor.communityPresence || competitor.communityPresence.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitor.communityPresence.map((cp, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                          <span>{cp.platform}</span>
                          <span className="text-purple-600">{cp.mentionsCount} mentions ({cp.sentiment})</span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-300">Opportunity: {cp.opportunity}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ads' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Ad Intelligence</h4>
                {!competitor.ads?.messagingTheme && !competitor.ads?.activeAdsCount ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs space-y-3">
                    <div><span className="font-semibold text-gray-500">Active Ads Count:</span> {competitor.ads.activeAdsCount}</div>
                    <div><span className="font-semibold text-gray-500">Platforms:</span> {(competitor.ads.platforms || []).join(', ')}</div>
                    <div><span className="font-semibold text-gray-500">Messaging Theme:</span> {competitor.ads.messagingTheme}</div>
                    <div><span className="font-semibold text-gray-500">Top Offer:</span> {competitor.ads.topOffer}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Recent Changes Timeline</h4>
                {(!competitor.timelineEvents || competitor.timelineEvents.length === 0) ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-4 pl-4 border-l-2 border-purple-600">
                    {competitor.timelineEvents.map((ev, idx) => (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="font-bold text-purple-600">{ev.date} — {ev.title}</div>
                        <div className="text-gray-900 dark:text-white font-medium">{ev.whatChanged}</div>
                        <div className="text-gray-500">{ev.whyItMatters}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}

