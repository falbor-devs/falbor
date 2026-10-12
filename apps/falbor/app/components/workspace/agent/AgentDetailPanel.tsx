'use client';

import React from 'react';

interface AgentDetailPanelProps {
  selectedAgent: any;
  onOpenAssign: () => void;
}

export function AgentDetailPanel({ selectedAgent, onOpenAssign }: AgentDetailPanelProps) {
  if (!selectedAgent) return null;

  return (
    <div className="w-80 shrink-0 h-full border-l border-gray-200 dark:border-[#26262b] p-5 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
      <div>
        <h4 className="text-lg text-gray-500 dark:text-[#8e8e93] mb-3">
          Quick actions
        </h4>
        <button
          onClick={onOpenAssign}
          className="w-full p-3 rounded-xl bg-white dark:bg-[#202025] hover:bg-gray-100 dark:hover:bg-[#282830] border border-gray-200 dark:border-[#2d2d35] text-left transition-colors flex items-start gap-3 group shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-[#2563eb]/20 text-[#3b82f6] flex items-center justify-center shrink-0 mt-0.5">
            <span className="i-ph:paper-plane-tilt text-base" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Send Task...
            </div>
            <div className="text-xs text-gray-500 dark:text-[#8e8e93] mt-0.5 leading-snug">
              Hand this Teammate a specific task
            </div>
          </div>
        </button>
      </div>

      <div>
        <h4 className="text-lg text-gray-500 dark:text-[#8e8e93] mb-3">
          About
        </h4>
        <p className="text-xs text-gray-600 dark:text-[#cfcfd4] leading-relaxed">
          {selectedAgent.instructions || selectedAgent.goal || 'Autonomous agent dedicated to handling workspace tasks.'}
        </p>
      </div>

      <div>
        <h4 className="text-lg text-gray-500 dark:text-[#8e8e93] mb-3">
          Skills
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {Array.isArray(selectedAgent.tools) && selectedAgent.tools.length > 0 ? (
            selectedAgent.tools.map((t: string) => (
              <span
                key={t}
                className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-[#222228] border border-gray-200 dark:border-[#2f2f38] text-gray-700 dark:text-[#d1d1d6] flex items-center gap-1.5 shadow-sm"
              >
                <span className="i-ph:file-text text-[11px] text-[#8e8e93]" />
                {t}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 dark:text-[#8e8e93]">General task execution & research</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-lg text-gray-500 dark:text-[#8e8e93] mb-3">
          Model
        </h4>
        <div className="text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-[#222228] border border-gray-200 dark:border-[#2f2f38] text-gray-700 dark:text-[#d1d1d6] flex items-center gap-2 w-fit shadow-sm">
          <span className="i-ph:cpu text-sm text-[#f59e0b]" />
          <span>{selectedAgent.model || 'GPT-4o'}</span>
        </div>
      </div>
    </div>
  );
}