'use client';

import React, { useState } from 'react';
import classNames from 'classnames';
import { BRAND_COLORS, type Competitor } from './types';
import { Input } from '~/components/ui';

interface CompetitorsTableProps {
  competitors: Competitor[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCompetitor: (competitor: Competitor) => void;
}

export function CompetitorsTable({
  competitors,
  searchQuery,
  onSearchChange,
  onSelectCompetitor,
}: CompetitorsTableProps) {
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  return (
    <div className="w-full bg-white dark:bg-[#111114] border border-gray-200 dark:border-zinc-800 rounded-md overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <i className="i-ph:magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <Input
            type="text"
            placeholder="Search competitor..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-8'
          />
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Showing {competitors.length} competitors
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800 bg-[#F9F8F6] dark:bg-[#18181B] text-[11px] font-bold text-gray-500 dark:text-gray-400">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">BRAND</th>
              <th className="py-3 px-4">VISIBILITY</th>
              <th className="py-3 px-4">SOV</th>
              <th className="py-3 px-4">AVG POSITION</th>
              <th className="py-3 px-4">BEATS YOU IN</th>
              <th className="py-3 px-4 text-right">DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs">
            {competitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                  No competitors match your search.
                </td>
              </tr>
            ) : (
              competitors.map((comp, idx) => {
                const colorStyle = BRAND_COLORS[idx % BRAND_COLORS.length];
                const domainKey = comp.domain || comp.name;
                const hasFaviconFailed = failedFavicons[domainKey];

                return (
                  <tr
                    key={idx}
                    className={classNames(
                      'transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/40',
                      comp.isUserProduct ? 'bg-purple-50/40 dark:bg-purple-950/20 font-semibold' : ''
                    )}
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                      {comp.rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {comp.isUserProduct ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                            ★
                          </div>
                        ) : comp.domain && !hasFaviconFailed ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=64`}
                            alt=""
                            className="w-7 h-7"
                            onError={() => setFailedFavicons((prev) => ({ ...prev, [domainKey]: true }))}
                          />
                        ) : (
                          <div
                            className={classNames(
                              'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm',
                              colorStyle.bg,
                              colorStyle.text
                            )}
                          >
                            {colorStyle.icon}
                          </div>
                        )}

                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {comp.name}
                            {comp.isUserProduct && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold">
                                You
                              </span>
                            )}
                          </span>
                          {comp.domain && (
                            <span className="text-[10px] text-gray-400">{comp.domain}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      {comp.visibilityPct}%
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-medium">
                      {comp.sovPct}%
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      {comp.avgPosition}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      {comp.beatsYouIn}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectCompetitor(comp)}
                        className="text-[#0099FF] font-semibold text-xs transition-colors"
                      >
                        View details →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
