'use client';

import React from 'react';
import classNames from 'classnames';
import type { SourceItem } from '~/lib/actions/sources';

interface SourcesTableHeaderProps {
  totalCount: number;
  onRefresh: () => void;
  loading: boolean;
}

export function SourcesTableHeader({ totalCount }: { totalCount: number }) {
  return (
    <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <i className="i-ph:share-network text-accent-500" />
        Acquisition Sources
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        AI-curated communities, posts, and channels to acquire your first users. ({totalCount} channels found)
      </p>
    </div>
  );
}
