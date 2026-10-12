'use client';

import React from 'react';
import classNames from 'classnames';
import type { SourceItem } from '~/lib/actions/sources';
import { TableRow, TableCell } from '~/components/ui/Table';

interface SourcesTableRowProps {
  source: SourceItem;
}

const PLATFORM_ICONS: Record<string, { icon: string; img?: string }> = {
  Reddit: { icon: 'i-ph:reddit-logo text-orange-500', img: '/landing/social/reddit.png' },
  Facebook: { icon: 'i-ph:facebook-logo text-blue-600', img: '/landing/social/facebook.png' },
  LinkedIn: { icon: 'i-ph:linkedin-logo text-blue-500', img: '/landing/social/linkdin.png' },
  Twitter: { icon: 'i-ph:twitter-logo text-sky-400', img: '/landing/social/X.png' },
  ProductHunt: { icon: 'i-ph:product-hunt-logo text-amber-600', img: 'https://www.google.com/s2/favicons?domain=producthunt.com&sz=64' },
  Directory: { icon: 'i-ph:folder text-purple-500' },
  Contacts: { icon: 'i-ph:user-circle-gear text-emerald-500' },
  Other: { icon: 'i-ph:globe text-gray-400' },
};

export function SourcesTableRow({ source }: SourcesTableRowProps) {
  const platformConfig = PLATFORM_ICONS[source.platform] || PLATFORM_ICONS.Other;
  const [imgError, setImgError] = React.useState(false);
  const getFaviconUrl = (targetUrl: string) => {
    try {
      const domain = new URL(targetUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  const imgSrc = platformConfig.img || (source.url ? getFaviconUrl(source.url) : null);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2.5">
          {imgSrc && !imgError ? (
            <img
              src={imgSrc}
              alt={source.platform}
              className="w-5 h-5 rounded object-contain shrink-0"
              onError={() => setImgError(true)}
            />
          ) : (
            <i className={classNames(platformConfig.icon, "text-xl shrink-0")} />
          )}
          <span className="truncate max-w-[220px] sm:max-w-xs">{source.title}</span>
        </div>
      </TableCell>

      <TableCell className="text-xs font-semibold">
        <span className="bg-falbor-elements-background-depth-2 px-2 py-0.5 rounded-md border border-falbor-elements-borderColor">
          {source.platform}
        </span>
      </TableCell>

      <TableCell className="text-xs text-falbor-elements-textSecondary">
        {source.audienceSize}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-16 bg-falbor-elements-background-depth-2 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${source.relevanceScore}%` }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {source.relevanceScore}%
          </span>
        </div>
      </TableCell>

      <TableCell className="text-xs text-falbor-elements-textSecondary max-w-sm truncate">
        {source.strategy}
      </TableCell>

      <TableCell className="text-right">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-500 hover:text-accent-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          {source.platform === 'Contacts' ? 'Contact Profile' : 'Visit Channel'}
          <i className="i-ph:arrow-square-out text-sm" />
        </a>
      </TableCell>
    </TableRow>
  );
}
