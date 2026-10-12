import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '~/components/ui';
import type { TestHistoryItem } from './index';

interface ScannerProps {
  onScanComplete: (result: TestHistoryItem) => void;
}

export function Scanner({ onScanComplete }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleScan = () => {
    setIsScanning(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          const issuesFound = Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : 0;
          const result: TestHistoryItem = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: issuesFound > 0 ? 'failed' : 'passed',
            issuesFound
          };
          
          onScanComplete(result);
          if (issuesFound > 0) {
            toast.warning(`Scan complete. Found ${issuesFound} issues.`);
          } else {
            toast.success('Scan complete. No issues found!');
          }
          return 100;
        }
        return p + 10;
      });
    }, 300);
  };

  return (
    <div className="flex flex-col gap-4 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Code Scanner</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Run a static analysis to detect common issues, bugs, and security vulnerabilities.
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={isScanning}
          className="shrink-0"
        >
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

      {isScanning && (
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 mt-2 overflow-hidden">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
