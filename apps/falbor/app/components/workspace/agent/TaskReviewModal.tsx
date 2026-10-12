'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { Markdown } from '~/components/chat/messages/Markdown';
import type { AgentTask } from './types';

interface TaskReviewModalProps {
  task: AgentTask | null;
  onClose: () => void;
}

export function TaskReviewModal({ task, onClose }: TaskReviewModalProps) {
  return (
    <DialogRoot open={!!task} onOpenChange={(open) => !open && onClose()}>
      {task && (
        <Dialog
          onClose={onClose}
          className="!w-[760px] !max-h-[85vh] !p-0 !bg-white dark:!bg-[#15161d] !border-gray-200 dark:!border-[#272836] !text-gray-900 dark:!text-gray-200 overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="flex flex-col h-full max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#242533] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="i-ph:check-circle-fill text-emerald-500 text-lg" />
                <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {task.resultTitle || task.title}
                </DialogTitle>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-[#242533]">
                Task: <span className="text-gray-900 dark:text-white font-medium">{task.title}</span>
                {task.description && (
                  <div className="mt-1 text-gray-600 dark:text-gray-400">{task.description}</div>
                )}
              </div>

              <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 markdown-body">
                {task.resultContent ? (
                  <Markdown>{task.resultContent}</Markdown>
                ) : (
                  <p className="text-gray-400 italic">No output text recorded for this task.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 dark:border-[#242533] flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </DialogRoot>
  );
}
