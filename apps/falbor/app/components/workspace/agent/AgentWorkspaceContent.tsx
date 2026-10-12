'use client';

import React from 'react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { getAgentIcon, type AgentTask } from './types';

interface AgentWorkspaceContentProps {
  selectedAgent: any;
  agentTasks: AgentTask[];
  activeTasks: AgentTask[];
  finishedTasks: AgentTask[];
  onOpenAssign: () => void;
  onReviewTask: (task: AgentTask) => void;
  agentIndex?: number;
}

export function AgentWorkspaceContent({
  selectedAgent,
  agentTasks,
  activeTasks,
  finishedTasks,
  onOpenAssign,
  onReviewTask,
  agentIndex = 0,
}: AgentWorkspaceContentProps) {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-white dark:bg-[#1E1E1E]">
      <div className="h-14 border-b border-gray-200 dark:border-[#26262b] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {selectedAgent ? (
            <>
              <img
                src={getAgentIcon(selectedAgent, agentIndex)}
                alt=""
                className="w-6 h-6 rounded-md object-contain"
              />
              <span className="text-base font-semibold text-gray-900 dark:text-white">{selectedAgent.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#25252b] text-gray-600 dark:text-[#9e9ea7]">
                {selectedAgent.role || 'Teammate'}
              </span>
            </>
          ) : (
            <span className="text-base font-semibold text-gray-900 dark:text-white">Agents</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAssign}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0099ff]/20 text-[#0099ff] text-xs font-medium transition-colors shadow-sm"
          >
            <span className="i-ph:plus text-sm" />
            Assign work
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {agentTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[360px] text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-[#212127] border border-gray-200 dark:border-[#2d2d35] flex items-center justify-center shadow-md dark:shadow-xl">
                {selectedAgent ? (
                  <img
                    src={getAgentIcon(selectedAgent, agentIndex)}
                    alt=""
                    className="w-12 h-12 rounded-xl object-contain"
                  />
                ) : (
                  <span className="i-ph:robot text-3xl text-gray-400" />
                )}
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No assigned work yet</h3>
            <p className="text-xs text-gray-500 dark:text-[#8e8e93] mb-5">To get started, assign a task to this agent.</p>
            <button
              onClick={onOpenAssign}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white dark:bg-[#2b2b34] dark:hover:bg-[#34343f] dark:text-white text-xs font-medium transition-colors border border-gray-800 dark:border-[#3a3a46]"
            >
              <span className="i-ph:plus text-sm" />
              Assign work
            </button>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {activeTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-lg text-gray-500 dark:text-[#8e8e93] mb-2">
                  <span className="i-ph:spinner-gap animate-spin text-blue-500 text-sm" />
                  <span>In Progress</span>
                </div>
                {activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#202025] border border-gray-200 dark:border-[#2b2b32] flex items-start justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="i-ph:circle-dashed text-blue-500 text-lg mt-0.5 shrink-0 animate-spin" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-600 dark:text-[#9e9ea7] mt-1 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400 dark:text-[#8e8e93] mt-1.5 flex items-center gap-2">
                          <span>Requested by {task.requestor}</span>
                          <span>•</span>
                          <span>{task.createdAt}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => aiSidebarStore.open()}
                      className="px-2.5 py-1 text-xs rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-[#2a2a32] dark:hover:bg-[#34343e] text-gray-700 dark:text-gray-200 transition-colors shrink-0"
                    >
                      View Agent
                    </button>
                  </div>
                ))}
              </div>
            )}
            {finishedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-lg text-gray-500 dark:text-[#8e8e93] mb-2">
                  <span>Finished</span>
                </div>
                {finishedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="i-ph:check-circle-fill text-[#22c55e] text-lg shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</span>
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-[#8e8e93] shrink-0">{task.createdAt}</span>
                    </div>
                    <div className="pl-7 flex items-center gap-2 text-xs text-gray-600 dark:text-[#9e9ea7]">
                      <span className="i-ph:chat-circle-text text-gray-400 dark:text-[#8e8e93] shrink-0" />
                      <span className="text-gray-500 dark:text-[#8e8e93]">I created</span>
                      <button
                        onClick={() => onReviewTask(task)}
                        className="font-medium text-[#0099ff] hover:underline underline-offset-2 transition-colors cursor-pointer text-left"
                      >
                        {task.resultTitle || `Review ${task.title}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}