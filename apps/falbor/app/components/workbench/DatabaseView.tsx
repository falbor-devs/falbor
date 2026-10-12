'use client';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatId } from '~/lib/persistence/useChatHistory';
import { StudioSidebar } from './database/StudioSidebar';
import { DatabaseSetupScreen } from './database/DatabaseSetupScreen';
import { TablesTab } from './database/TablesTab';
import { SQLQueryTab } from './database/SQLQueryTab';
import type {
  ActiveTab,
  DbTable,
  TableData,
} from './database/types';
import { Badge } from '../ui';

interface DatabaseViewProps {
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
}

const POLL_INTERVAL = 5000;

export const DatabaseView = memo(({ sendMessage }: DatabaseViewProps) => {
  const currentChatId = useStore(chatId);

  const [databaseUrl, setDatabaseUrl] = useState<string | null>(null);
  const [sqlMigrationFiles, setSqlMigrationFiles] = useState<[string, any][]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('tables');
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = workbenchStore.files.subscribe((files) => {
      let foundUrl: string | null = null;
      for (const [path, file] of Object.entries(files)) {
        if (path.endsWith('.env') && file?.type === 'file' && typeof file.content === 'string') {
          const lines = file.content.split('\n');
          for (const line of lines) {
            if (line.startsWith('DATABASE_URL=') || line.startsWith('NEON_DATABASE_URL=')) {
              foundUrl = line.substring(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
              break;
            }
          }
          if (foundUrl) break;
        }
      }
      setDatabaseUrl(foundUrl);
      setSqlMigrationFiles(
        Object.entries(files)
          .filter(([p]) => p.endsWith('.sql'))
          .sort(([a], [b]) => a.localeCompare(b)),
      );
    });
    return unsubscribe;
  }, []);

  const adminFetch = useCallback(
    async (action: string, payload?: any) => {
      if (!currentChatId || !databaseUrl) return null;
      const res = await fetch('/api/database/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, databaseUrl, action, payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [currentChatId],
  );

  const fetchData = useCallback(async () => {
    if (!databaseUrl || !currentChatId) return;
    setIsLoading(true);
    try {
      if (activeTab === 'tables') {
        const data = await adminFetch('get_tables');
        if (data?.tables) setDbTables(data.tables);

        if (selectedTable) {
          const tData = await adminFetch('get_table_data', { tableName: selectedTable });
          if (tData?.columns) setTableData(tData);
        }
      }
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error('Dashboard fetch error:', e.message);
      toast.error(`DB Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [databaseUrl, currentChatId, activeTab, selectedTable, adminFetch]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    fetchData();
    pollingRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedTable(null);
    setTableData(null);
  };

  const handlePushMigrations = async () => {
    if (!currentChatId) return;
    setIsPushing(true);
    try {
      if (!sqlMigrationFiles.length) {
        toast.info('No SQL migration files found to push.');
        return;
      }
      toast.info(`Pushing ${sqlMigrationFiles.length} migration(s)...`);
      for (const [path, file] of sqlMigrationFiles) {
        if (file?.type === 'file' && file.content) {
          const res = await fetch('/api/database/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentChatId, databaseUrl, sql: file.content }),
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`Failed to push ${path}: ${errorData.message || res.statusText}`);
          }
        }
      }
      toast.success('Successfully pushed all migrations to Neon database!');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to push migrations');
    } finally {
      setIsPushing(false);
    }
  };



  if (!databaseUrl) {
    return (
      <DatabaseSetupScreen
        onConnectSupabase={() => document.dispatchEvent(new CustomEvent('open-supabase-connection'))}
        onCreateDatabase={() => sendMessage?.({} as any, 'Create a database for this project')}
      />
    );
  }

  return (
    <div className="flex h-full bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary overflow-hidden">
      <StudioSidebar
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        dbTables={dbTables}
        selectedTable={selectedTable}
        onSelectTable={(name) => {
          setActiveTab('tables');
          setSelectedTable(name);
        }}
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-falbor-elements-background-depth-1">
        <div className="border-b border-falbor-elements-borderColor flex items-center justify-between px-4 py-2 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('tables')}
              className={`text-sm font-medium pb-2 border-b-2 -mb-2 ${activeTab === 'tables' ? 'border-accent-500 text-falbor-elements-textPrimary' : 'border-transparent text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary'}`}
            >
              Table View
            </button>
            <button
              onClick={() => setActiveTab('sql' as any)}
              className={`text-sm font-medium pb-2 border-b-2 -mb-2 ${activeTab === 'sql' ? 'border-accent-500 text-falbor-elements-textPrimary' : 'border-transparent text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary'}`}
            >
              SQL Query
            </button>
            <Badge>Beta</Badge>
          </div>

          <button
            onClick={() => {
              if (pollingRef.current) clearInterval(pollingRef.current);
              fetchData();
              pollingRef.current = setInterval(fetchData, POLL_INTERVAL);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 px-2 py-1 rounded-md border border-falbor-elements-borderColor transition-colors"
          >
            <div className={`i-ph:arrows-clockwise ${isLoading ? 'animate-spin text-accent-500' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="bg-red-100 text-red-900 text-xs p-1 font-mono break-all">
          DEBUG: ID={currentChatId || 'NULL'} | URL={databaseUrl || 'NULL'}
        </div>
        <div className="h-[calc(100%-41px)]">
          {activeTab === 'tables' && (
            <TablesTab
              sqlMigrationFiles={sqlMigrationFiles}
              dbTables={dbTables}
              selectedTable={selectedTable}
              tableData={tableData}
              isPushing={isPushing}
              isLoading={isLoading}
              onPushMigrations={handlePushMigrations}
              onSelectTable={(name) => setSelectedTable(name)}
              onBack={() => { setSelectedTable(null); setTableData(null); }}
            />
          )}
          {activeTab === 'sql' && (
            <SQLQueryTab
              databaseUrl={databaseUrl}
              chatId={currentChatId}
              adminFetch={adminFetch}
            />
          )}
        </div>
      </div>
    </div>
  );
});

DatabaseView.displayName = 'DatabaseView';
