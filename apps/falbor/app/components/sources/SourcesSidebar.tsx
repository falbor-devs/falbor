import React from 'react';
import type { ProviderStatus } from '~/lib/sources/types';
import { Slider } from '~/components/ui/Slider';

interface SourcesSidebarProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: string[];
  isSearching: boolean;
  scrapingThreads: number;
  setScrapingThreads: (threads: number) => void;
  providers: ProviderStatus[];
  searchMode: 'osint' | 'websites';
  setSearchMode: (mode: 'osint' | 'websites') => void;
}

export function SourcesSidebar({
  selectedModel,
  setSelectedModel,
  availableModels,
  isSearching,
  scrapingThreads,
  setScrapingThreads,
  providers,
  searchMode,
  setSearchMode,
}: SourcesSidebarProps) {
  return (
    <aside className="w-[320px] flex-shrink-0 bg-falbor-elements-background-depth-1 border-r border-falbor-elements-borderColor overflow-y-auto flex flex-col p-6">
      <h1 className="text-3xl font-bold mt-[-20px] ml-[-10px]">
        <img src={"/logo-light-styled.png"} alt="logo" className="w-[180px] inline-block dark:hidden" />
        <img src={"/logo-dark-styled.png"} alt="logo" className="w-[180px] inline-block hidden dark:block" />
      </h1>

      <div className="mb-6 flex flex-col gap-2">
        <label className="block text-sm text-falbor-elements-textSecondary">Select LLM Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isSearching}
          className="w-full bg-falbor-elements-background dark:bg-black dark:border-gray-700 border border-falbor-elements-border rounded-md px-3 py-2 text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-falbor-elements-ring focus:ring-offset-2 disabled:opacity-50"
        >
          {availableModels.length > 0 ? (
            availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))
          ) : (
            <option value="gpt-4.1">gpt-4.1</option>
          )}
        </select>
        <p className="text-xs text-falbor-elements-textTertiary mt-1">
          Locally detected Ollama models are automatically added to this list.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <label className="text-falbor-elements-textSecondary">Scraping Threads</label>
          <span className="text-falbor-elements-textPrimary font-bold">{scrapingThreads}</span>
        </div>
        <input
          type="range"
          min="1"
          max="32"
          value={scrapingThreads}
          onChange={(e) => setScrapingThreads(Number(e.target.value))}
          disabled={isSearching}
          className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF4B4B] disabled:opacity-50"
        />
      </div>

      <div className="mb-6 flex flex-col gap-2">
        <label className="block text-sm text-falbor-elements-textSecondary">Search Mode</label>

        <div className="w-full flex justify-center py-2" style={{ pointerEvents: isSearching ? 'none' : 'auto', opacity: isSearching ? 0.5 : 1 }}>
          <Slider
            selected={searchMode}
            setSelected={(val) => setSearchMode(val as any)}
            options={{
              left: { value: 'osint', text: 'OSINT' },
              right: { value: 'websites', text: 'Websites' }
            }}
          />
        </div>

        <p className="text-xs text-falbor-elements-textTertiary mt-1">
          {searchMode === 'osint'
            ? 'Searches for dark web links and creates a threat intel summary.'
            : 'Finds actual onion sites/marketplaces matching your request.'}
        </p>
      </div>
    </aside>
  );
}
