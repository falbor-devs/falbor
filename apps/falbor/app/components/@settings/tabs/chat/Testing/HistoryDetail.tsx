import React from 'react';
import { Badge } from '~/components/ui';
import type { TestHistoryItem } from './index';

interface HistoryDetailProps {
  item: TestHistoryItem;
  onBack: () => void;
}

export function HistoryDetail({ item, onBack }: HistoryDetailProps) {
  return (
    <div className="flex flex-col gap-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors self-start"
      >
        <div className="i-ph:arrow-left" />
        Back to History
      </button>

      <div className="flex flex-col bg-white dark:bg-[#1a1a1a] border border-[#D6D5DE] dark:border-[#333] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#D6D5DE] dark:border-[#333] bg-[#F3F0F5] dark:bg-[#111]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Scan Results
            </h3>
            {item.status === 'passed' ? (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                <div className="i-ph:check-circle" /> Passed
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-transparent">
                <div className="i-ph:warning-circle" /> Failed
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Date: {new Date(item.date).toLocaleString()}
          </p>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#222] rounded border border-gray-200 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Issues Found</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.issuesFound}</span>
          </div>

          {item.issuesFound > 0 ? (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Detected Issues</h4>
              <ul className="flex flex-col gap-2">
                {Array.from({ length: item.issuesFound }).map((_, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded">
                    <div className="i-ph:warning-circle text-red-500 shrink-0 mt-0.5" />
                    <span>Potential security vulnerability detected in component rendering logic. Please review input sanitization.</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded text-green-700 dark:text-green-400 text-sm">
              <div className="i-ph:check-circle text-lg shrink-0" />
              <span>Great job! No security vulnerabilities or common errors were detected during this scan.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
