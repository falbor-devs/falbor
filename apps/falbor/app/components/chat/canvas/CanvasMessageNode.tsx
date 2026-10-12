'use client';

import React from 'react';
import { classNames } from '~/utils/classNames';

interface CanvasMessageNodeProps {
  children: React.ReactNode;
  isUser?: boolean;
  index: number;
  totalNodes: number;
}

export function CanvasMessageNode({ children, isUser, index, totalNodes }: CanvasMessageNodeProps) {
  const user = Boolean(isUser);

  return (
    <div className="relative flex flex-col items-center w-full max-w-chat mb-8 group" data-interactive="true">
      {index > 0 && (
        <div className="flex flex-col items-center -mt-6 mb-2 z-10 pointer-events-none">
          <div className="w-[2px] h-6 bg-gradient-to-b from-blue-500/40 to-indigo-500/80 dark:from-blue-400/40 dark:to-indigo-400/80" />
          <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
        </div>
      )}

      <div
        className={classNames(
          'w-full rounded-2xl border transition-all duration-200 shadow-md hover:shadow-xl backdrop-blur-md overflow-hidden',
          user
            ? 'bg-zinc-50/90 dark:bg-zinc-900/70 border-indigo-200/60 dark:border-indigo-900/40 hover:border-indigo-400/60'
            : 'bg-white/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        )}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span
              className={classNames(
                'w-2 h-2 rounded-full',
                user ? 'bg-indigo-500' : 'bg-emerald-500'
              )}
            />
            <span className="text-xs font-medium font-mono text-zinc-600 dark:text-zinc-400">
              {user ? 'Prompt Node' : 'AI Node'} #{index + 1}
            </span>
          </div>
          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Canvas Node
            </span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
