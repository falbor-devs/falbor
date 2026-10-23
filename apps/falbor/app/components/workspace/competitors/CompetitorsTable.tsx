'use client';

import React, { useState } from 'react';
import classNames from 'classnames';
import { BRAND_COLORS, type Competitor } from './types';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '~/components/ui/Table';

interface CompetitorsTableProps {
  competitors: Competitor[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function CompetitorsTable({ competitors, searchQuery, onSearchChange }: CompetitorsTableProps) {
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pt-3 pb-8 mt-[10px] rounded-t-2xl bg-[#EBEBEB] dark:bg-[#282828]">
        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
          Showing {competitors.length} competitors
        </div>

        <div className="relative w-full sm:w-64">
          <i className="i-ph:magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Filter competitors..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-accent-500"
          />
        </div>
      </div>

      <div className="-mt-6 rounded-4xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>SOV</TableHead>
              <TableHead>Avg Position</TableHead>
              <TableHead>Beats You In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400 italic">
                  No competitors match your search.
                </TableCell>
              </TableRow>
            ) : (
              competitors.map((comp, idx) => {
                const colorStyle = BRAND_COLORS[idx % BRAND_COLORS.length];
                const domainKey = comp.domain || comp.name;
                const hasFaviconFailed = failedFavicons[domainKey];

                return (
                  <TableRow
                    key={idx}
                    className={classNames(comp.isUserProduct ? 'bg-purple-50/40 dark:bg-purple-950/20 font-semibold' : '')}
                  >
                    <TableCell className="text-center text-xs font-bold text-gray-500 dark:text-gray-400">
                      {comp.rank}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        {comp.isUserProduct ? (
                          <div className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            ★
                          </div>
                        ) : comp.domain && !hasFaviconFailed ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=64`}
                            alt=""
                            className="w-5 h-5 rounded object-contain shrink-0"
                            onError={() => setFailedFavicons((prev) => ({ ...prev, [domainKey]: true }))}
                          />
                        ) : (
                          <div
                            className={classNames(
                              'w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0',
                              colorStyle.bg,
                              colorStyle.text
                            )}
                          >
                            {colorStyle.icon}
                          </div>
                        )}

                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            {comp.name}
                            {comp.isUserProduct && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold">
                                You
                              </span>
                            )}
                          </span>
                          {comp.domain && <span className="text-[10px] text-gray-400">{comp.domain}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-falbor-elements-background-depth-2 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${comp.visibilityPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {comp.visibilityPct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-falbor-elements-textSecondary">
                      {comp.sovPct}%
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {comp.avgPosition}
                    </TableCell>
                    <TableCell className="text-xs text-falbor-elements-textSecondary max-w-sm truncate">
                      {comp.beatsYouIn}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
