'use client';

import React from 'react';
import type { SourceItem } from '~/lib/actions/sources';
import { SourcesTableRow } from './SourcesTableRow';
import { Table, TableHeader, TableBody, TableHead, TableRow } from '~/components/ui/Table';

interface SourcesTableProps {
  sources: SourceItem[];
  loading: boolean;
}

export function SourcesTable({ sources, loading }: SourcesTableProps) {
  if (loading) {
    return (
      <div className="w-full space-y-3 py-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl my-6">
        <i className="i-ph:share-network text-4xl text-gray-400 mb-2" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No Acquisition Sources Found</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
          Click the rescan button to run AI discovery across Reddit, Facebook, Twitter, and directories.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Channel / Community</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Est. Audience</TableHead>
          <TableHead>Match %</TableHead>
          <TableHead>Engagement Strategy</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((source, index) => (
          <SourcesTableRow key={source.id || index} source={source} />
        ))}
      </TableBody>
    </Table>
  );
}
