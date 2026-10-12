'use client';

import React from 'react';
import Link from 'next/link';
import { classNames } from '~/utils/classNames';
import { getAgentIcon } from './types';

interface AgentSidebarProps {
  workspaceId: string;
  agents: any[];
  selectedAgentId: string | null;
  loading: boolean;
  onSelectAgent: (id: string) => void;
}

export function AgentSidebar({
  workspaceId,
  agents,
  selectedAgentId,
  loading,
  onSelectAgent,
}: AgentSidebarProps) {
  return (
    <div className="w-64 shrink-0 h-full border-r border-gray-200 dark:border-[#26262b] flex flex-col">
      <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-gray-200 dark:border-[#26262b]">
        <div className="flex items-center gap-2">
          <span className="text-md text-gray-500 dark:text-[#8e8e93]">Recents Agents</span>
        </div>
        <Link
          href={`/workspace/${workspaceId}/agent/create`}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-[#8e8e93] dark:hover:text-white transition-colors"
          title="Create New Agent"
        >
          <span className="i-ph:plus text-sm" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {loading ? (
          <div className="px-3 py-4 text-xs text-gray-400 dark:text-[#8e8e93]">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-400 dark:text-[#8e8e93]">
            No agents yet. Click + above to create your first agent!
          </div>
        ) : (
          agents.map((ag, idx) => {
            const isSelected = selectedAgentId === ag.id;
            const icon = getAgentIcon(ag, idx);
            return (
              <button
                key={ag.id}
                onClick={() => onSelectAgent(ag.id)}
                className={classNames(
                  'w-full flex items-center gap-3 px-3 py-1 rounded-lg text-sm font-medium transition-colors text-left group',
                  isSelected
                    ? 'bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-white shadow-sm border border-gray-200/80 dark:border-gray-700'
                    : 'text-gray-600 dark:text-[#9e9ea7] hover:bg-gray-200/60 dark:hover:bg-[#1f1f24] hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <img src={icon} alt="" className="w-8 h-8 rounded-md object-contain shrink-0" />
                <span className="truncate flex-1">{ag.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}