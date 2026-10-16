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
    <div className="pb-4">
      <h1 className="text-2xl text-gray-900 dark:text-white flex items-center gap-2">
        Sources <span className='text-sm'>[to know where to post]</span>
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        *There is conmmunits that have ruls read them and follow them to dont get banned!
      </p>
    </div>
  );
}
