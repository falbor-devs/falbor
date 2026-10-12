import React from 'react';
import { classNames } from '~/utils/classNames';
import { SourcesMarkdown } from './SourcesMarkdown';
import type { InvestigationState } from '~/lib/sources/types';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Button } from '~/components/ui/Button';

interface SourcesResultsProps {
  state: InvestigationState;
  query: string;
  isSearching: boolean;
  onDownload: () => void;
}

export function SourcesResults({ state, query, isSearching, onDownload }: SourcesResultsProps) {
  if (state.phase === 'idle' && !state.summary && state.rawResultCount === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6">
      {state.phase !== 'idle' && (
        <Card className={classNames(
          "w-full transition-all border-l-4",
          state.phase === 'complete' ? "border-l-green-500 bg-green-500/10" :
            state.phase === 'error' ? "border-l-red-500 bg-red-500/10" :
              "border-l-blue-500 bg-blue-500/10"
        )}>
          <CardContent className="p-4 font-semibold flex items-center gap-2">
            {state.phase === 'complete' ? 'Pipeline completed successfully!' :
              state.phase === 'error' ? `✖ Error: ${state.error}` :
                `⏳ ${state.statusMessage}`}
          </CardContent>
        </Card>
      )}

      {(state.phase === 'complete' || state.rawResultCount > 0) && (
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center text-center p-6 bg-falbor-elements-background-depth-1 shadow-sm">
            <div className="text-falbor-elements-textPrimary font-bold mb-2">Refined Query</div>
            <div className="text-falbor-elements-textSecondary">{state.refinedQuery || '-'}</div>
          </Card>
          <Card className="flex flex-col items-center justify-center text-center p-6 bg-falbor-elements-background-depth-1 shadow-sm">
            <div className="text-falbor-elements-textPrimary font-bold mb-2">Search Results</div>
            <div className="text-falbor-elements-textSecondary text-2xl">{state.rawResultCount}</div>
          </Card>
          <Card className="flex flex-col items-center justify-center text-center p-6 bg-falbor-elements-background-depth-1 shadow-sm">
            <div className="text-falbor-elements-textPrimary font-bold mb-2">Filtered Results</div>
            <div className="text-falbor-elements-textSecondary text-2xl">{state.filteredResultCount}</div>
          </Card>
        </div>
      )}

      {(state.summary || isSearching) && (
        <Card className="w-full mt-2">
          <CardHeader className="flex flex-row justify-between items-center border-b border-falbor-elements-borderColor pb-4">
            <CardTitle>Investigation Summary</CardTitle>
            {state.phase === 'complete' && (
              <Button
                variant="outline"
                onClick={onDownload}
                className="flex items-center gap-2"
              >
                <span className="i-ph:download-simple-bold" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 text-falbor-elements-textSecondary text-sm bg-falbor-elements-background-depth-2 p-3 rounded-md">
              <span className="font-semibold">Query:</span> {query || state.refinedQuery}
            </div>

          <div className="prose prose-invert max-w-none text-falbor-elements-textPrimary text-base leading-relaxed mb-10">
            {state.summary ? (
              <SourcesMarkdown content={state.summary} />
            ) : (
              <span className="text-falbor-elements-textSecondary animate-pulse">Generating summary...</span>
            )}
          </div>

          {(state.sourceLinks.length > 0 || state.phase === 'complete') && (
            <div className="border-t border-falbor-elements-borderColor pt-6 mt-6">
              <h3 className="text-lg font-bold mb-4 text-falbor-elements-textPrimary">Source Links Referenced for Analysis</h3>
              {state.sourceLinks.length > 0 ? (
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-400">
                  {state.sourceLinks.map((link, i) => (
                    <li key={i}>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-300">
                        {link}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-falbor-elements-textSecondary text-sm">No source links were successfully scraped.</p>
              )}
            </div>
          )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
