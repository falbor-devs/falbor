'use client';

import React, { useEffect, useState } from 'react';
import type { Competitor, CompetitorsData } from './types';
import { CompetitorsHeader } from './CompetitorsHeader';
import { CompetitorsTable } from './CompetitorsTable';
import { CompetitorDetailModal } from './CompetitorDetailModal';
import classNames from 'classnames';

export function WorkspaceCompetitorsView({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<CompetitorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'features' | 'sources' | 'timeline'>('benchmarks');

  useEffect(() => {
    async function loadCompetitors() {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspace/${workspaceId}/competitors`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load competitors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompetitors();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="w-full h-full p-6 animate-pulse flex flex-col gap-6">
        <div className="h-10 w-64 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  const competitors = data?.competitors || [];
  const filteredCompetitors = competitors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const topRival = competitors.find((c) => !c.isUserProduct) || competitors[0];

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col gap-2 font-sans">
      <CompetitorsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      {topRival && (
        <div className="bg-white dark:bg-[#18181C] border border-gray-300 dark:border-zinc-800 rounded-md p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <i className="i-ph:sparkle-fill" />
              <span>Primary Category Rival</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {topRival.name} is currently leading AI recommendations
            </h2>
            <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
              {topRival.headToHead?.whyTheyWin || 'Maintains higher third-party source citations and domain authority across model evaluations.'}
            </p>
          </div>

          <button
            onClick={() => setSelectedCompetitor(topRival)}
            className="px-2 py-1 bg-[#0099ff]/20 text-[#0099ff] rounded-md text-sm shrink-0 flex items-center gap-2"
          >
            <span>Inspect Full Intelligence Profile</span>
            <i className="i-ph:arrow-right" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-1 border border-gray-300 dark:border-zinc-800 p-1 rounded-md">
        {[
          { id: 'benchmarks', label: 'Competitor Index', icon: 'i-ph:list-numbers-duotone' },
          { id: 'features', label: 'Feature Comparison', icon: 'i-ph:squares-four-duotone' },
          { id: 'sources', label: 'Source Authority Map', icon: 'i-ph:share-network-duotone' },
          { id: 'timeline', label: 'Recent Market Activity', icon: 'i-ph:clock-counter-clockwise-duotone' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={classNames(
              'px-2 py-1 rounded-md text-sm flex items-center gap-2 transition-all',
              activeTab === t.id
                ? 'bg-[#0099ff]/20 text-[#0099ff]'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60'
            )}
          >
            <i className={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'benchmarks' && (
        <CompetitorsTable
          competitors={filteredCompetitors}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectCompetitor={setSelectedCompetitor}
        />
      )}

      {activeTab === 'features' && (
        <div className="bg-white dark:bg-[#18181C] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Feature Matrix Across Rivals</h3>
          <div className="overflow-x-auto">
            {competitors.every((c) => !c.features || c.features.length === 0) ? (
              <div className="p-6 text-center text-xs text-gray-500">Not enough evidence yet</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 font-bold">
                    <th className="py-3 px-4">Feature</th>
                    {competitors.slice(0, 4).map((c, i) => (
                      <th key={i} className="py-3 px-4">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {Array.from(new Set(competitors.flatMap((c) => (c.features || []).map((f) => f.name)))).map((feat, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{feat}</td>
                      {competitors.slice(0, 4).map((c, i) => {
                        const match = (c.features || []).find((f) => f.name === feat);
                        const isAvail = match ? match.available : false;
                        return (
                          <td key={i} className="py-3 px-4">
                            <span className={classNames('inline-flex items-center gap-1 font-bold', isAvail ? 'text-emerald-600' : 'text-gray-400')}>
                              <i className={isAvail ? 'i-ph:check-circle-fill text-sm' : 'i-ph:minus-circle text-sm'} />
                              {isAvail ? 'Available' : 'Unknown'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {competitors.slice(0, 3).map((c, i) => (
            <div key={i} className="bg-white dark:bg-[#18181C] border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between font-bold text-sm">
                <span>{c.name}</span>
                <span className="text-xs text-purple-600 font-normal">{c.sources?.length || 0} Key Sources</span>
              </div>
              {(!c.sources || c.sources.length === 0) ? (
                <div className="p-4 text-center text-xs text-gray-500">Not enough evidence yet</div>
              ) : (
                <div className="space-y-2 text-xs">
                  {c.sources.map((s, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{s.name}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{s.type} domain</div>
                      </div>
                      <div className="font-bold text-purple-600">{s.authority}/100</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-[#18181C] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Market Activity Feed</h3>
          {competitors.flatMap((c) => (c.timelineEvents || []).map((e) => ({ ...e, brand: c.name }))).length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">Not enough evidence yet</div>
          ) : (
            <div className="space-y-4 pl-4 border-l-2 border-purple-600">
              {competitors.flatMap(c => (c.timelineEvents || []).map(e => ({ ...e, brand: c.name }))).slice(0, 6).map((ev, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="font-bold text-purple-600">{ev.date} — {ev.brand}</div>
                  <div className="text-gray-900 dark:text-white font-bold">{ev.title}</div>
                  <div className="text-gray-600 dark:text-gray-400">{ev.whatChanged}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CompetitorDetailModal
        competitor={selectedCompetitor}
        onClose={() => setSelectedCompetitor(null)}
      />
    </div>
  );
}

