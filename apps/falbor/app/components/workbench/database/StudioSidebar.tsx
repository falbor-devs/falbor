'use client';
import React from 'react';
import { classNames } from '~/utils/classNames';
import type { ActiveTab, DbTable } from './types';

interface StudioSidebarProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  dbTables: DbTable[];
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'tables', label: 'Tables', icon: 'i-ph:table' },
  { id: 'auth', label: 'Authentication', icon: 'i-ph:users' },
  { id: 'storage', label: 'Storage', icon: 'i-ph:folder-open' },
  { id: 'functions', label: 'Functions', icon: 'i-ph:function' },
  { id: 'logs', label: 'Logs', icon: 'i-ph:list-dashes' },
];

export function StudioSidebar({ isLoading, lastUpdated, dbTables, selectedTable, onSelectTable }: StudioSidebarProps) {
  
  const schemas = dbTables.reduce((acc, table) => {
    if (!acc[table.schema]) acc[table.schema] = [];
    acc[table.schema].push(table);
    return acc;
  }, {} as Record<string, DbTable[]>);

  const [expandedSchemas, setExpandedSchemas] = React.useState<Record<string, boolean>>({});

  
  React.useEffect(() => {
    if (dbTables.length > 0 && !expandedSchemas['public'] && schemas['public']) {
      setExpandedSchemas(prev => ({ ...prev, 'public': true }));
    }
  }, [dbTables]);

  const toggleSchema = (schema: string) => {
    setExpandedSchemas(prev => ({ ...prev, [schema]: !prev[schema] }));
  };

  return (
    <aside className="w-56 flex-shrink-0 border-r border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-falbor-elements-borderColor">
        <span className="font-semibold text-base text-falbor-elements-textPrimary">Tables</span>
        {isLoading && (
          <div className="i-ph:spinner-gap-bold animate-spin ml-auto text-falbor-elements-textTertiary text-sm" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {Object.entries(schemas).map(([schemaName, tables]) => (
          <div key={schemaName} className="mb-2">
            <button
              onClick={() => toggleSchema(schemaName)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary uppercase tracking-wider"
            >
              <div className="flex items-center gap-2">
                <div className={`i-ph:caret-${expandedSchemas[schemaName] ? 'down' : 'right'} w-3 h-3 transition-transform`} />
                {schemaName}
              </div>
              <span className="text-[10px] bg-falbor-elements-background-depth-3 px-1.5 py-0.5 rounded-md">
                {tables.length}
              </span>
            </button>
            {expandedSchemas[schemaName] && (
              <div className="mt-1 space-y-0.5">
                {tables.map(table => (
                  <button
                    key={table.fullName}
                    onClick={() => onSelectTable(table.fullName)}
                    className={classNames(
                      'flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm font-medium text-left ml-2',
                      selectedTable === table.fullName
                        ? 'bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary font-semibold'
                        : 'text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-3 hover:text-falbor-elements-textPrimary',
                    )}
                  >
                    <div className="i-ph:database w-4 h-4 text-falbor-elements-textTertiary" />
                    {table.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {dbTables.length === 0 && !isLoading && (
          <div className="text-sm text-falbor-elements-textTertiary text-center mt-4">
            No tables found.
          </div>
        )}
      </nav>
    </aside>
  );
}
