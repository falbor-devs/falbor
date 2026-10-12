import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface SQLQueryTabProps {
  databaseUrl: string;
  chatId: string | undefined;
  adminFetch: (action: string, payload?: any) => Promise<any>;
}

export function SQLQueryTab({ databaseUrl, chatId, adminFetch }: SQLQueryTabProps) {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{ rows: any[]; columns: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    setIsRunning(true);
    setError(null);
    try {
      const data = await adminFetch('run_sql', { query });
      if (data?.columns) {
        setResults({ rows: data.rows, columns: data.columns });
        toast.success('Query executed successfully');
      } else {
        setResults(null);
        toast.success('Query executed successfully (no results)');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to execute query');
      setResults(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111]">
      <div className="flex-1 relative border-b border-falbor-elements-borderColor">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter SQL query..."
          className="w-full h-full p-4 bg-transparent text-gray-900 dark:text-gray-100 font-mono text-sm outline-none resize-none"
        />
        <div className="absolute bottom-4 right-4 flex items-center gap-4">
          <span className="text-xs text-gray-500">Press Cmd/Ctrl + Enter to execute</span>
          <button
            onClick={handleRunQuery}
            disabled={isRunning || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-900 dark:text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <div className="i-ph:spinner animate-spin w-4 h-4" />
            ) : (
              <div className="i-ph:play w-4 h-4" />
            )}
            Run Query
          </button>
        </div>
      </div>
      <div className="h-1/2 overflow-auto bg-gray-50 dark:bg-black/20 p-4">
        {error ? (
          <div className="text-red-500 font-mono text-sm whitespace-pre-wrap">{error}</div>
        ) : results ? (
          results.rows.length > 0 ? (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    {results.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                  {results.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {results.columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300 max-w-[300px] truncate"
                          title={String(row[col])}
                        >
                          {row[col] !== null ? String(row[col]) : <span className="text-gray-400 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No results found
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="i-ph:play-circle text-4xl mb-2 opacity-50" />
            <p>Run a query</p>
            <p className="text-xs opacity-70">Execute a SQL query to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}
