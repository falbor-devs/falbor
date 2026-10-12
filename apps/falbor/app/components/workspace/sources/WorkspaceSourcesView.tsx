'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getWorkspaceSources, generateWorkspaceSources, type SourceItem } from '~/lib/actions/sources';
import { SourcesTableHeader } from './SourcesTableHeader';
import { SourcesFilterBar } from './SourcesFilterBar';
import { SourcesTable } from './SourcesTable';

interface WorkspaceSourcesViewProps {
  workspaceId: string;
}

export function WorkspaceSourcesView({ workspaceId }: WorkspaceSourcesViewProps) {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSources = async (forceGenerate = false) => {
    try {
      setLoading(true);
      let data: SourceItem[] = [];
      if (!forceGenerate) {
        data = await getWorkspaceSources(workspaceId);
      }
      if (data.length === 0 || forceGenerate) {
        data = await generateWorkspaceSources(workspaceId);
      }
      setSources(data);
    } catch (e) {
      console.error('Failed to load workspace acquisition sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [workspaceId]);

  const filteredSources = useMemo(() => {
    return sources.filter((item) => {
      const matchPlatform = selectedPlatform === 'All' || item.platform.toLowerCase() === selectedPlatform.toLowerCase();
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.strategy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPlatform && matchSearch;
    });
  }, [sources, selectedPlatform, searchQuery]);

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <SourcesTableHeader totalCount={sources.length} />

      <SourcesFilterBar
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => loadSources(true)}
        loading={loading}
      />

      <SourcesTable sources={filteredSources} loading={loading} />
    </div>
  );
}
