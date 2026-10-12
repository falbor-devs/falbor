'use client';

import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import Link from 'next/link';

interface DashboardData {
  metrics: {
    visibility: number;
    shareOfVoice: number;
    averagePosition: number | null;
    productUnderstanding: number;
    answersCount: number;
    breakdown: {
      competitors?: Array<{
        name: string;
        domain: string | null;
        mentions: number;
        shareOfVoice: number;
        answerShare: number;
        providers: string[];
        topRankedCount: number;
      }>;
      sources?: Array<{
        domain: string;
        mentions: number;
        providers: string[];
        types: string[];
        isFirstParty: boolean;
        isCommunity: boolean;
        discussesProduct: boolean;
        discussesProblem: boolean;
        mentionsCompetitors: boolean;
        influencesMultipleModels: boolean;
      }>;
    };
  } | null;
}

type TabType = 'visibility_time' | 'visibility' | 'sov' | 'position' | 'citations';

export function IntelligenceDashboard({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('visibility_time');
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspace/${workspaceId}/intelligence-dashboard`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="w-full h-full p-6 animate-pulse flex flex-col gap-4">
        <div className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const competitors = metrics?.breakdown?.competitors || [];
  const sources = metrics?.breakdown?.sources || [];
  const citationsCount = sources.reduce((acc, s) => acc + s.mentions, 0);

  const visibilityPct = Math.round((metrics?.visibility || 0) * 100);
  const sovPct = Math.round((metrics?.shareOfVoice || 0) * 100);
  const avgPos = metrics?.averagePosition ? `#${metrics.averagePosition.toFixed(1)}` : '-';
  const citationsPct = metrics?.answersCount ? Math.round((citationsCount / metrics.answersCount) * 100) : 0;

  const getTabYAxis = () => {
    switch (activeTab) {
      case 'visibility': return ['60%', '45%', '30%', '15%', '0%'];
      case 'sov': return ['25%', '20%', '15%', '10%', '0%'];
      case 'position': return ['#1', '#1.8', '#2.5', '#3.3', '#4'];
      case 'citations': return ['100%', '75%', '50%', '25%', '0%'];
      default: return ['60%', '45%', '30%', '15%', '0%'];
    }
  };

  const getTabCaption = () => {
    switch (activeTab) {
      case 'visibility': return 'Share of AI answers that mention each brand, on the latest day.';
      case 'sov': return 'Share of total brand mentions across AI answers.';
      case 'position': return 'Where the brand is named on average when an answer lists brands (1 = named first).';
      case 'citations': return 'Share of AI answers that link to each brand\'s own website.';
      default: return 'Share of AI answers that mention the brand, over the period.';
    }
  };

  const getRightHeaderTitle = () => {
    switch (activeTab) {
      case 'citations': return 'Top brands by citations';
      case 'sov': return 'Top brands by share of voice';
      case 'position': return 'Top brands by position';
      case 'visibility': return 'Top brands by visibility';
      default: return 'Top brands by visibility over time';
    }
  };

  const getRightHeaderValue = () => {
    switch (activeTab) {
      case 'citations': return `${citationsCount} citations`;
      case 'sov': return `${sovPct}% total SOV`;
      case 'position': return `${avgPos} avg position`;
      default: return `${metrics?.answersCount || 0} mentions`;
    }
  };

  const topBrandsList = [
    ...competitors.slice(0, 4).map(c => ({
      name: c.name,
      domain: c.domain,
      pct: Math.round(c.answerShare * 100) || Math.round(c.shareOfVoice * 100) || 15,
      isUser: false
    })),
    {
      name: 'Your Product',
      domain: null,
      pct: visibilityPct || 10,
      isUser: true
    }
  ];

  return (
    <div className="w-full flex flex-col bg-[#F5F4F0] dark:bg-[#292929] text-gray-900 dark:text-gray-100 font-sans border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-4 flex flex-col border-r border-gray-300 dark:border-zinc-800">
          <div className="grid grid-cols-5 bg-[#EFECE6] dark:bg-[#18181B]">
            {[
              { id: 'visibility_time', label: 'Visibility over time', value: `${visibilityPct}%`, sub: 'avg' },
              { id: 'visibility', label: 'Visibility', value: `${visibilityPct}%`, sub: 'latest' },
              { id: 'sov', label: 'Share of voice', value: `${sovPct}%`, sub: 'avg' },
              { id: 'position', label: 'Position', value: avgPos, sub: 'avg' },
              { id: 'citations', label: 'Citations', value: `${citationsPct}%`, sub: 'of answers' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={classNames(
                    'p-4 text-left border-r last:border-r-0 border-b border-gray-300 dark:border-zinc-800 flex flex-col justify-between relative h-[90px]',
                    isActive
                      ? 'bg-[#F5F4F0] dark:bg-[#121214] border-b-2  border-b-[#0099ff]'
                      : 'hover:bg-[#E7E4DC] dark:hover:bg-zinc-800/50 text-gray-600 dark:text-gray-400'
                  )}
                >
                  <div className={classNames('text-xs transition-colors', isActive ? '' : 'text-gray-600 dark:text-gray-400')}>
                    {tab.label}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                    {tab.value}
                    <span className="text-xs font-normal text-gray-500">{tab.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-8 flex-1 flex flex-col justify-between min-h-[380px] relative bg-[#F5F4F0] dark:bg-[#121214]">
            <div className="w-full h-[260px] flex flex-col justify-between relative my-4">
              <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 font-mono pointer-events-none">
                {getTabYAxis().map((val, idx) => (
                  <div key={idx} className="flex items-center gap-4 w-full">
                    <span className="w-10 text-right shrink-0">{val}</span>
                    <div className="flex-1 border-b border-dashed border-gray-300 dark:border-zinc-800" />
                  </div>
                ))}
              </div>

              {activeTab === 'visibility' ? (
                <div className="absolute inset-0 left-14 right-4 flex items-end justify-around pb-6">
                  {topBrandsList.map((brand, idx) => {
                    const hasFailed = brand.domain ? failedFavicons[brand.domain] : true;
                    const barColors = ['bg-slate-600', 'bg-slate-400', 'bg-teal-600', 'bg-blue-500', 'bg-purple-600'];
                    return (
                      <div key={idx} className="flex flex-col items-center gap-3 w-16 h-full justify-end group">
                        <div
                          style={{ height: `${Math.max(15, Math.min(90, brand.pct * 1.5))}%` }}
                          className={classNames(
                            'w-12 rounded-t-md transition-all duration-500 shadow-sm',
                            brand.isUser ? 'bg-purple-600 dark:bg-purple-500' : barColors[idx % barColors.length]
                          )}
                        />
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {brand.domain && !hasFailed ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${brand.domain}&sz=32`}
                              alt=""
                              className="w-4 h-4 rounded-full bg-white object-contain"
                              onError={() => setFailedFavicons((prev) => ({ ...prev, [brand.domain!]: true }))}
                            />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold">
                              {brand.name[0]}
                            </div>
                          )}
                          <span className="truncate max-w-[80px]">{brand.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : activeTab === 'position' ? (
                <div className="absolute inset-0 left-14 right-4 flex flex-col justify-end items-center pb-4">
                  <div className="flex flex-col items-center gap-3">
                    {competitors.slice(0, 4).map((comp, idx) => (
                      <div key={idx} className="w-2.5 h-2.5 rounded-full border-2 border-slate-500 bg-white dark:bg-zinc-900 shadow-sm" />
                    ))}
                    <div className="w-3 h-3 rounded-full bg-purple-600 ring-2 ring-purple-300 shadow-sm" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 left-14 right-4 top-2 bottom-6 pointer-events-none">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 960 200" preserveAspectRatio="none">
                    <path
                      d="M 0 160 Q 240 180 480 120 T 960 60"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 mt-6">
                      {competitors.slice(0, 4).map((comp, idx) => {
                        const hasFailed = comp.domain ? failedFavicons[comp.domain] : true;
                        return comp.domain && !hasFailed ? (
                          <img
                            key={idx}
                            src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                            alt=""
                            className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 p-0.5 border border-gray-200 dark:border-zinc-800 object-contain shadow-sm"
                            onError={() => setFailedFavicons((prev) => ({ ...prev, [comp.domain!]: true }))}
                          />
                        ) : (
                          <div key={idx} className="w-3 h-3 rounded-full border-2 border-purple-600 bg-white shadow-sm" />
                        );
                      })}
                      <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold shadow-md">
                        ★
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500 mt-1">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800/60">
              Based on {metrics?.answersCount || 0} AI answers · {getTabCaption()}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-[#F5F4F0] dark:bg-[#121214] flex flex-col justify-between h-full min-h-[470px] overflow-hidden">
          <div className="p-4 border-b border-gray-300 dark:border-zinc-800 h-[90px] flex flex-col justify-center shrink-0">
            <div className="text-xs text-gray-500 font-medium truncate">
              {getRightHeaderTitle()}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
              {getRightHeaderValue()}
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-zinc-800/80 flex-1 overflow-y-auto min-h-0">
            {competitors.slice(0, 5).map((comp, i) => {
              const hasFailed = comp.domain ? failedFavicons[comp.domain] : true;
              return (
                <div key={i} className="p-2.5 px-3 flex items-center justify-between hover:bg-[#EFECE6] dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {comp.domain && !hasFailed ? (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                        alt=""
                        className="w-5 h-5 rounded bg-white dark:bg-zinc-900 p-0.5 border border-gray-200 dark:border-zinc-800 object-contain shrink-0"
                        onError={() => setFailedFavicons((prev) => ({ ...prev, [comp.domain!]: true }))}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-[10px] shrink-0 text-gray-700 dark:text-gray-300">
                        {comp.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{comp.name}</div>
                      <div className="text-[10px] text-gray-400 truncate leading-tight">{comp.domain || 'competitor.com'}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100 shrink-0 ml-1">
                    {activeTab === 'sov' ? `${Math.round(comp.shareOfVoice * 100)}%` : `${Math.round(comp.answerShare * 100)}%`}
                  </div>
                </div>
              );
            })}

            <div className="p-2.5 px-3 flex items-center justify-between bg-[#E7E4DC] dark:bg-zinc-800/50 border-l-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-[#0099ff]/20 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  ★
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                    Your Product <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">• you</span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold shrink-0 ml-1">
                {activeTab === 'sov' ? `${sovPct}%` : `${visibilityPct}%`}
              </div>
            </div>
          </div>

          <Link href={`/workspace/${workspaceId}/competitors`} className="shrink-0">
            <div className="p-3 border-t border-gray-300 dark:border-zinc-800 text-xs font-semibold hover:underline flex items-center gap-1.5 cursor-pointer bg-[#F5F4F0] dark:bg-[#121214]">
              <span>All competitors</span>
              <i className="i-ph:arrow-right" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

