'use client';
import React, { useState } from 'react';
import { classNames } from '~/utils/classNames';

export interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
  engine?: string;
  scrape_status?: 'success' | 'timeout' | 'error' | 'skipped' | 'not_scraped';
  scraped_content?: string;
}

interface SourcesResultCardProps {
  result: SearchResult;
  index: number;
  isFiltered?: boolean;
  scrapeStatus?: string;
}

const ENGINE_COLORS: Record<string, string> = {
  Ahmia: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  OnionLand: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  Torgle: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  Amnesia: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  Kaizer: 'bg-green-500/20 text-green-400 border border-green-500/30',
  Anima: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  Tornado: 'bg-red-500/20 text-red-400 border border-red-500/30',
  TorNet: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

function truncateLink(link: string): string {
  try {
    const match = link.match(/^(https?:\/\/[a-z2-7]{16,56}\.onion)/i);
    return match ? match[1] : link.slice(0, 60);
  } catch {
    return link.slice(0, 60);
  }
}

function ScrapeStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'not_scraped') return null;
  const configs: Record<string, { label: string; cls: string; icon: string }> = {
    success:          { label: 'Scraped', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: 'i-ph:check-circle' },
    timeout:          { label: 'Timeout', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', icon: 'i-ph:clock' },
    error:            { label: 'Error', cls: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: 'i-ph:x-circle' },
    skipped:          { label: 'Skipped', cls: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', icon: 'i-ph:minus-circle' },
    connection_error: { label: 'Offline', cls: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: 'i-ph:wifi-slash' },
  };
  const cfg = configs[status] || configs.error;
  return (
    <span className={classNames('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', cfg.cls)}>
      <span className={classNames('w-3 h-3', cfg.icon)} />
      {cfg.label}
    </span>
  );
}

export function SourcesResultCard({ result, index, isFiltered, scrapeStatus }: SourcesResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const shortLink = truncateLink(result.link);
  const engineColor = ENGINE_COLORS[result.engine || ''] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30';

  return (
    <div className={classNames(
      'group relative rounded-xl border transition-all duration-200',
      isFiltered
        ? 'bg-white/[0.04] dark:bg-white/[0.04] border-white/10 hover:border-violet-500/40 hover:bg-white/[0.06]'
        : 'bg-white/[0.02] dark:bg-white/[0.02] border-white/5 opacity-70 hover:opacity-90'
    )}>
      <div className="p-3 flex flex-col gap-1.5">
        {}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-black/20 dark:bg-white/[0.06] flex items-center justify-center text-[10px] text-gray-500 font-mono">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 dark:text-gray-200 truncate leading-tight">
              {result.title || 'Untitled'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5">{shortLink}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {result.engine && (
              <span className={classNames('text-[10px] font-medium px-1.5 py-0.5 rounded-full', engineColor)}>
                {result.engine}
              </span>
            )}
            <ScrapeStatusBadge status={scrapeStatus || result.scrape_status} />
          </div>
        </div>

        {}
        {result.snippet && (
          <p className="text-[12px] text-gray-500 leading-relaxed pl-7 line-clamp-2">
            {result.snippet}
          </p>
        )}

        {}
        {result.scraped_content && (
          <div className="pl-7">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              <span className={classNames('w-3 h-3 transition-transform', expanded ? 'i-ph:caret-up' : 'i-ph:caret-down')} />
              {expanded ? 'Hide' : 'Show'} scraped content
            </button>
            {expanded && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-black/30 p-2.5 text-[11px] text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                {result.scraped_content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
