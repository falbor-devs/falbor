import React from 'react';
import { Input, Button } from '~/components/ui';

interface SourcesInputProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: () => void;
  isSearching: boolean;
}

export function SourcesInput({ query, setQuery, onSubmit, isSearching }: SourcesInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      <img
        src="/hacking/on-falbor/image-light.png"
        alt="Robin Mascot"
        className="w-[500px] h-auto object-contain mb-4 drop-shadow-xl dark:hidden"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <img
        src="/hacking/on-falbor/image-dark.png"
        alt="Robin Mascot"
        className="w-[500px] h-auto object-contain mb-4 drop-shadow-xl hidden dark:block"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      <div className="w-full flex gap-3 p-4 rounded-xl bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor shadow-sm">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter something and get your answer…"
          disabled={isSearching}
          className="flex-1 dark:bg-black dark:border border-gray-700"
        />
        <Button
          onClick={onSubmit}
          disabled={!query.trim() || isSearching}
          size="lg"
          variant="default"
        >
          Run
        </Button>
      </div>
    </div>
  );
}
