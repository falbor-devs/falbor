'use client';
import { useState, useRef, useEffect } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';

interface WebSearchProps {
  onSearchResult: (result: string) => void;
  disabled?: boolean;
  asMenuItem?: boolean;
}

interface WebSearchData {
  title: string;
  description: string;
  content: string;
  sourceUrl: string;
}

interface WebSearchResponse {
  success: boolean;
  data?: WebSearchData;
  error?: string;
}

function formatSearchResult(data: WebSearchData): string {
  const parts: string[] = [`[Web content from ${data.sourceUrl}]`];

  if (data.title) {
    parts.push(`Title: ${data.title}`);
  }

  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  parts.push('', data.content);

  return parts.join('\n');
}

export function WebSearch({ onSearchResult, disabled = false, asMenuItem }: WebSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleFetch = async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const result = (await response.json()) as WebSearchResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch URL content');
      }

      onSearchResult(formatSearchResult(result.data));
      toast.success('URL content fetched');
      setUrl('');
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch URL');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {asMenuItem ? (
        <IconButton
          disabled={disabled || isSearching}
          onClick={() => setIsOpen(!isOpen)}
          className={classNames('text-falbor-elements-item-contentAccent')}
        >
          {isSearching ? (
            <div className="i-svg-spinners:90-ring-with-bg text-falbor-elements-loader-progress text-xl animate-spin" />
          ) : (
            <div className="i-ph:globe text-xl text-falbor-elements-textSecondary" />
          )}
          <span>Fetch URL</span>
        </IconButton>
      ) : (
        <IconButton
          title="Fetch URL content"
          disabled={disabled || isSearching}
          onClick={() => setIsOpen(!isOpen)}
          className="transition-all"
        >
          {isSearching ? (
            <div className="i-svg-spinners:90-ring-with-bg text-falbor-elements-loader-progress text-xl animate-spin" />
          ) : (
            <div className="i-ph:globe text-xl" />
          )}
        </IconButton>
      )}
      {isOpen && (
        <div
          className={classNames(
            'absolute bottom-full left-0 mb-2 flex items-center gap-2',
            'rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 p-2 shadow-lg',
          )}
        >
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSearching) {
                handleFetch();
              }

              if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder="https://example.com"
            disabled={isSearching}
            className={classNames(
              'w-[300px] px-3 py-1.5 text-sm rounded-md',
              'border border-falbor-elements-borderColor',
              'bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary',
              'placeholder-falbor-elements-textTertiary',
              'focus:outline-none focus:ring-2 focus:ring-falbor-elements-focus',
            )}
          />
          <button
            onClick={handleFetch}
            disabled={isSearching || !url.trim()}
            className={classNames(
              'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap',
              'bg-falbor-elements-button-primary-background text-falbor-elements-button-primary-text',
              'hover:bg-falbor-elements-button-primary-backgroundHover',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isSearching ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      )}
    </div>
  );
}
