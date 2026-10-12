import React, { useState } from 'react';
import { DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Scanner } from './Scanner';
import { HistoryList } from './HistoryList';
import { HistoryDetail } from './HistoryDetail';

export interface TestHistoryItem {
  id: string;
  date: string;
  status: 'passed' | 'failed' | 'running';
  issuesFound: number;
}

const MOCK_HISTORY: TestHistoryItem[] = [
  { id: '1', date: new Date().toISOString(), status: 'failed', issuesFound: 3 },
  { id: '2', date: new Date(Date.now() - 86400000).toISOString(), status: 'passed', issuesFound: 0 },
];

export default function TestingTab() {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<TestHistoryItem[]>(MOCK_HISTORY);

  const handleScanComplete = (result: TestHistoryItem) => {
    setHistory([result, ...history]);
    setSelectedHistoryId(result.id);
  };

  const selectedItem = history.find(h => h.id === selectedHistoryId);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 gap-6">
      <div className="flex flex-col space-y-1.5">
        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Testing & Diagnostics</DialogTitle>
        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
          Run automated tests and security scans on your current codebase.
        </DialogDescription>
      </div>

      <div className="flex flex-col gap-6">
        <Scanner onScanComplete={handleScanComplete} />
        
        {selectedHistoryId && selectedItem ? (
          <HistoryDetail 
            item={selectedItem} 
            onBack={() => setSelectedHistoryId(null)} 
          />
        ) : (
          <HistoryList 
            history={history} 
            onSelect={setSelectedHistoryId} 
          />
        )}
      </div>
    </div>
  );
}
