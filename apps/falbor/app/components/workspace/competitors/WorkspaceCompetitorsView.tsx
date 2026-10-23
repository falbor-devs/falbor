'use client';

import React, { useEffect, useState } from 'react';
import type { CompetitorsData } from './types';
import { CompetitorsHeader } from './CompetitorsHeader';
import { CompetitorsTable } from './CompetitorsTable';

export function WorkspaceCompetitorsView({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<CompetitorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCompetitors() {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspace/${workspaceId}/competitors`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load competitors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompetitors();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="w-full h-full p-6 animate-pulse flex flex-col gap-6">
        <div className="h-10 w-64 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-14 bg-gray-200 dark:bg-zinc-800 rounded-t-2xl" />
        <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  const competitors = data?.competitors || [];
  const filteredCompetitors = competitors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <CompetitorsHeader />

      <CompetitorsTable
        competitors={filteredCompetitors}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
}
