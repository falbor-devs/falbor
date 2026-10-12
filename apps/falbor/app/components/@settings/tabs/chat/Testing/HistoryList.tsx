import React from 'react';
import { Badge } from '~/components/ui';
import type { TestHistoryItem } from './index';

interface HistoryListProps {
  history: TestHistoryItem[];
  onSelect: (id: string) => void;
}

export function HistoryList({ history, onSelect }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-[#F3F0F5]/50 dark:bg-[#111]/50 rounded-lg border border-dashed border-[#D6D5DE] dark:border-[#333]">
        <div className="i-ph:magnifying-glass text-4xl mb-3 opacity-50" />
        <p className="text-sm">No test history available.</p>
        <p className="text-xs mt-1">Run a scan to see results here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scan History</h3>
      
      <div className="flex flex-col gap-2">
        {history.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="flex items-center justify-between p-3 bg-white dark:bg-[#1a1a1a] border border-[#D6D5DE] dark:border-[#333] hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg transition-colors text-left"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Scan {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.issuesFound} issue{item.issuesFound !== 1 ? 's' : ''} found
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {item.status === 'passed' ? (
                <Badge variant="outline" className="flex items-center gap-1 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                  <div className="i-ph:check-circle" /> Passed
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-transparent">
                  <div className="i-ph:warning-circle" /> Failed
                </Badge>
              )}
              <div className="i-ph:caret-right text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
