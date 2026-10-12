'use client';
import React, { useState, useEffect } from 'react';
import { SourcesSidebar } from './SourcesSidebar';
import { SourcesInput } from './SourcesInput';
import { SourcesResults } from './SourcesResults';
import { SourcesHistoryGrid } from './SourcesHistoryGrid';
import type { InvestigationState, ProviderStatus } from '~/lib/sources/types';
import { ALL_ENGINES } from '~/lib/sources/types';
import { useRouter } from 'next/navigation';

export interface SourcesBaseChatProps {
  state: InvestigationState;
  onSearch: (query: string, model: string, engines: string[], scrapingThreads: number) => void;
  isSearching: boolean;
  providers: ProviderStatus[];
  availableModels: string[];
  history?: any[]; 
  isDetailsView?: boolean;
  searchMode: 'osint' | 'websites';
  setSearchMode: (mode: 'osint' | 'websites') => void;
}

export function SourcesBaseChat({
  state,
  onSearch,
  isSearching,
  providers,
  availableModels,
  history = [],
  isDetailsView = false,
  searchMode,
  setSearchMode
}: SourcesBaseChatProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1');
  const [scrapingThreads, setScrapingThreads] = useState(16);

  
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels]);

  const handleSubmit = () => {
    const q = query.trim();
    if (!q || isSearching) return;
    onSearch(q, selectedModel, ALL_ENGINES.map(e => e.name), scrapingThreads);
  };

  const handleDownload = () => {
    const content = `# Investigation Summary\n\nInput Query: ${query}\n\n${state.summary}\n\n## Source Links Referenced for Analysis\n\n${state.sourceLinks.map((link, i) => `${i + 1}. ${link}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full bg-falbor-elements-background text-falbor-elements-textPrimary font-sans overflow-hidden">
      <SourcesSidebar
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        availableModels={availableModels}
        isSearching={isSearching}
        scrapingThreads={scrapingThreads}
        setScrapingThreads={setScrapingThreads}
        providers={providers}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
      />

      <main className="flex-1 flex flex-col overflow-y-auto items-center p-8">
        <SourcesInput
          query={query}
          setQuery={setQuery}
          onSubmit={handleSubmit}
          isSearching={isSearching}
        />

        <SourcesResults
          state={state}
          query={query}
          isSearching={isSearching}
          onDownload={handleDownload}
        />

        {!isDetailsView && state.phase === 'idle' && (
          <SourcesHistoryGrid history={history} />
        )}
      </main>
    </div>
  );
}
