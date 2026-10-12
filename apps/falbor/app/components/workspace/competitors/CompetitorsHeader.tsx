'use client';

import React from 'react';

interface CompetitorsHeaderProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

export function CompetitorsHeader({ timeRange, onTimeRangeChange }: CompetitorsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Competitors</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Every brand AI names in your category, surfaced from the citations, ranked by how often AI names them.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="appearance-none bg-white dark:bg-[#111114] border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none shadow-sm cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <i className="i-ph:calendar-blank absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
