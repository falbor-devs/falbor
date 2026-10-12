'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { SourcesBaseChat } from './SourcesBaseChat';
import type { InvestigationState, ProviderStatus } from '~/lib/sources/types';
import { useRouter } from 'next/navigation';

const initialState: InvestigationState = {
  phase: 'idle',
  statusMessage: 'Ready',
  refinedQuery: '',
  rawResultCount: 0,
  filteredResultCount: 0,
  filteredResults: [],
  scrapedResults: [],
  summary: '',
  sourceLinks: [],
  pivots: [],
  error: '',
  searchMode: 'osint',
};

export function SourcesChat({ 
  initialData = null, 
  investigationId = null 
}: { 
  initialData?: InvestigationState | null,
  investigationId?: string | null 
}) {
  const router = useRouter();
  const [state, setState] = useState<InvestigationState>(initialData || initialState);
  const [isSearching, setIsSearching] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(investigationId);
  const [searchMode, setSearchMode] = useState<'osint' | 'websites'>('osint');
  const abortRef = useRef<AbortController | null>(null);

  
  useEffect(() => {
    fetch('/api/sources-health')
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) setProviders(data.providers);
        if (data.available_models) setAvailableModels(data.available_models);
      })
      .catch(console.error);

    if (!investigationId) {
      fetch('/api/sources-investigations')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHistory(data);
        })
        .catch(console.error);
    }
  }, [investigationId]);

  const handleSearch = useCallback(async (query: string, model: string, engines: string[], scrapingThreads: number) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    let currentState: InvestigationState = {
      ...initialState,
      phase: 'refining',
      statusMessage: 'Starting investigation...',
      searchMode: searchMode,
    };
    setState(currentState);

    let activeInvestigationId = investigationId;

    try {
      if (!activeId || initialData) {
        const createRes = await fetch('/api/sources-investigations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, state: currentState })
        });
        if (createRes.ok) {
          const newRecord = await createRes.json();
          setActiveId(newRecord.id);
        }
      }

      
      const response = await fetch('/api/sources-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, model, engines, scrapingThreads, searchMode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      const updateState = (updater: (prev: InvestigationState) => InvestigationState) => {
        currentState = updater(currentState);
        setState(currentState);
      };

      const handleEvent = (type: string, data: any) => {
        updateState((prev) => {
          const next = { ...prev };
          if (type === 'status') {
            next.phase = data.phase || prev.phase;
            next.statusMessage = data.message || prev.statusMessage;
          } else if (type === 'refined_query') {
            next.refinedQuery = data.refined || data.original;
          } else if (type === 'search_results') {
            next.rawResultCount = data.count || 0;
          } else if (type === 'filtered_results') {
            next.filteredResultCount = data.count || 0;
            next.filteredResults = data.results || [];
          } else if (type === 'scraped_results') {
            next.scrapedResults = data.results || [];
          } else if (type === 'summary_chunk') {
            next.summary += data.text || '';
          } else if (type === 'summary') {
            next.summary = data.text || prev.summary;
            next.pivots = data.pivots || [];
            next.sourceLinks = data.sourceLinks || [];
          } else if (type === 'error') {
            next.phase = 'error';
            next.error = data.message;
          }
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;
          let eventType = 'message';
          let dataStr = '';
          for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }
          if (dataStr) {
            try {
              handleEvent(eventType, JSON.parse(dataStr));
            } catch (e) {}
          }
        }
      }

      
      setActiveId((currentActiveId) => {
        if (currentActiveId) {
          fetch(`/api/sources-investigations/${currentActiveId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: currentState })
          });
          
          
          if (window.location.pathname === '/sources') {
            window.history.pushState(null, '', `/sources/${currentActiveId}`);
          }
        }
        return currentActiveId;
      });

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorState = {
          ...currentState,
          phase: 'error' as const,
          error: err.message || 'Connection failed',
          statusMessage: 'Error',
        };
        setState(errorState);
        
        setActiveId((currentActiveId) => {
          if (currentActiveId) {
            fetch(`/api/sources-investigations/${currentActiveId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: errorState })
            }).catch(console.error);
          }
          return currentActiveId;
        });
      }
    } finally {
      setIsSearching(false);
    }
  }, [investigationId, initialData, router]);

  return (
    <SourcesBaseChat
      state={state}
      onSearch={handleSearch}
      isSearching={isSearching}
      providers={providers}
      availableModels={availableModels}
      history={history}
      isDetailsView={!!activeId}
      searchMode={searchMode}
      setSearchMode={setSearchMode}
    />
  );
}
