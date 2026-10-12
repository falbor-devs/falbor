'use client';

import React from 'react';
import classNames from 'classnames';
import type { AiAeoData } from './types';

interface AiAeoWeeklyTrendProps {
  data: AiAeoData | null;
}

export function AiAeoWeeklyTrend({ data }: AiAeoWeeklyTrendProps) {
  const engines = data?.engines || [];

  return (
    <div className="w-full flex flex-col bg-[#F5F4F0] dark:bg-[#121214] text-gray-900 dark:text-gray-100 font-sans border border-gray-300 dark:border-zinc-800 rounded-md overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-300 dark:border-zinc-800 min-h-[340px]">
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Weekly trend
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Checked every week · shows at least the last 8 weeks
            </div>

            <div className="flex items-center gap-6 text-xs mt-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium">
                <span className="w-3 h-0.5 bg-purple-600" />
                <span>— Would recommend you</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-3 h-0.5 border-t border-dashed border-emerald-600" />
                <span>--- Knows you correctly</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[200px] flex flex-col justify-between relative my-2">
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 font-mono pointer-events-none">
              {['100%', '75%', '50%', '25%', '0%'].map((val, idx) => (
                <div key={idx} className="flex items-center gap-4 w-full">
                  <span className="w-8 text-right shrink-0">{val}</span>
                  <div className="flex-1 border-b border-dashed border-gray-300 dark:border-zinc-800" />
                </div>
              ))}
            </div>

            <div className="absolute inset-0 left-12 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-600 shadow-sm ring-4 ring-purple-600/20" />
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm ring-4 ring-emerald-500/20" />
                <span className="text-[11px] font-semibold text-gray-500 mt-2">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-[#F5F4F0] dark:bg-[#121214] flex flex-col justify-between p-5 min-h-[340px]">
          <div>
            <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
              This week
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {data?.overallRecommendPct}% <span className="text-xs font-normal text-gray-500">would recommend you</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1 pb-4 border-b border-gray-300 dark:border-zinc-800">
              described correctly by {data?.correctlyDescribedEnginesCount} of {data?.totalEnginesCount} engines
            </div>

            <div className="space-y-3.5 mt-4">
              {engines.map((eng, idx) => {
                const logoSrc =
                  eng.key === 'openai' || eng.displayName.toLowerCase().includes('chatgpt')
                    ? '/icons/OpenAI.svg'
                    : eng.key === 'anthropic' || eng.displayName.toLowerCase().includes('claude')
                      ? '/icons/claude-color.svg'
                      : eng.key === 'deepseek' || eng.displayName.toLowerCase().includes('deepseek')
                        ? '/icons/deepseek-color.svg'
                        : null;

                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                      {logoSrc ? (
                        <img src={logoSrc} alt={eng.displayName} className="w-4 h-4 object-contain" />
                      ) : (
                        <i className={classNames(eng.icon, 'text-sm text-purple-600')} />
                      )}
                      <span>{eng.displayName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span
                        className={classNames('w-2 h-2 rounded-full', {
                          'bg-emerald-500': eng.statusColor === 'green',
                          'bg-red-500': eng.statusColor === 'red',
                          'bg-amber-500': eng.statusColor === 'amber',
                          'bg-gray-400': eng.statusColor === 'gray',
                        })}
                      />
                      <span
                        className={classNames({
                          'text-emerald-600 dark:text-emerald-400': eng.statusColor === 'green',
                          'text-red-600 dark:text-red-400': eng.statusColor === 'red',
                          'text-amber-600 dark:text-amber-400': eng.statusColor === 'amber',
                          'text-gray-500': eng.statusColor === 'gray',
                        })}
                      >
                        {eng.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
