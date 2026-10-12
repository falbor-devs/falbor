'use client';

import React, { useState } from 'react';
import classNames from 'classnames';
import { BRAND_COLORS, type Competitor } from './types';

interface CompetitorsTrendCardProps {
  topRankedList: Competitor[];
  userItem: Competitor;
}

export function CompetitorsTrendCard({ topRankedList, userItem }: CompetitorsTrendCardProps) {
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  return (
    <div className="w-full flex flex-col bg-[#F5F4F0] dark:bg-[#121214] border border-gray-300 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-4 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-300 dark:border-zinc-800 min-h-[360px]">
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
              Visibility over time
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs mb-6">
              <div className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400">
                <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                  ★
                </div>
                <span>You</span>
              </div>

              {topRankedList
                .filter((c) => !c.isUserProduct)
                .map((comp, idx) => {
                  const colorStyle = BRAND_COLORS[idx % BRAND_COLORS.length];
                  const domainKey = comp.domain || comp.name;
                  const hasFailed = failedFavicons[domainKey];

                  return (
                    <div key={idx} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      {comp.domain && !hasFailed ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                          alt=""
                          className="w-4 h-4 rounded-full bg-white dark:bg-zinc-900 object-contain shrink-0"
                          onError={() => setFailedFavicons((prev) => ({ ...prev, [domainKey]: true }))}
                        />
                      ) : (
                        <div
                          className={classNames(
                            'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                            colorStyle.bg,
                            colorStyle.text
                          )}
                        >
                          {colorStyle.icon}
                        </div>
                      )}
                      <span>{comp.name}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="w-full h-[220px] flex flex-col justify-between relative my-2">
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 font-mono pointer-events-none">
              {['60%', '45%', '30%', '15%', '0%'].map((val, idx) => (
                <div key={idx} className="flex items-center gap-4 w-full">
                  <span className="w-8 text-right shrink-0">{val}</span>
                  <div className="flex-1 border-b border-dashed border-gray-300 dark:border-zinc-800" />
                </div>
              ))}
            </div>

            <div className="absolute inset-0 left-12 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-4 mt-2">
                {topRankedList
                  .filter((c) => !c.isUserProduct)
                  .map((comp, idx) => {
                    const colorStyle = BRAND_COLORS[idx % BRAND_COLORS.length];
                    const domainKey = comp.domain || comp.name;
                    const hasFailed = failedFavicons[domainKey];

                    return comp.domain && !hasFailed ? (
                      <img
                        key={idx}
                        src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=64`}
                        alt=""
                        className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 p-0.5 border border-gray-200 dark:border-zinc-800 object-contain shadow-sm ring-2 ring-white dark:ring-zinc-900"
                        onError={() => setFailedFavicons((prev) => ({ ...prev, [domainKey]: true }))}
                      />
                    ) : (
                      <div
                        key={idx}
                        className={classNames(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white dark:ring-zinc-900',
                          colorStyle.bg,
                          colorStyle.text
                        )}
                      >
                        {colorStyle.icon}
                      </div>
                    );
                  })}
                <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md ring-2 ring-purple-400">
                  ★
                </div>
                <span className="text-[11px] font-semibold text-gray-500 mt-1">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-[#F5F4F0] dark:bg-[#121214] flex flex-col justify-between p-4 min-h-[360px]">
          <div>
            <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-4 uppercase tracking-wider">
              Ranking
            </div>

            <div className="space-y-3">
              {topRankedList
                .filter((c) => !c.isUserProduct)
                .map((comp, idx) => {
                  const colorStyle = BRAND_COLORS[idx % BRAND_COLORS.length];
                  const domainKey = comp.domain || comp.name;
                  const hasFailed = failedFavicons[domainKey];

                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-gray-500 text-[11px]">#{idx + 1}</span>
                        {comp.domain && !hasFailed ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                            alt=""
                            className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 p-0.5 border border-gray-200 dark:border-zinc-800 object-contain shrink-0"
                            onError={() => setFailedFavicons((prev) => ({ ...prev, [domainKey]: true }))}
                          />
                        ) : (
                          <div
                            className={classNames(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                              colorStyle.bg,
                              colorStyle.text
                            )}
                          >
                            {colorStyle.icon}
                          </div>
                        )}
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {comp.name}
                        </span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white shrink-0">
                        {comp.visibilityPct}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-purple-100/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">
                #{userItem.rank}
              </span>
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                ★
              </div>
              <span className="font-bold text-purple-950 dark:text-purple-200 truncate">You</span>
            </div>
            <span className="font-bold text-purple-900 dark:text-purple-300 shrink-0">
              {userItem.visibilityPct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
