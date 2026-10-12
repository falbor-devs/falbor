'use client';

import React from 'react';
import type { Marketer } from './MessagesSidebar';

interface UserDetailsSidebarProps {
  selectedMarketer: Marketer | null;
}

export function UserDetailsSidebar({ selectedMarketer }: UserDetailsSidebarProps) {
  if (!selectedMarketer) return null;

  return (
    <div className="hidden md:flex w-72 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex-col p-6 flex-shrink-0 space-y-6">
      <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="h-20 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shadow-sm">
          {selectedMarketer.photoUrl ? (
            <img src={selectedMarketer.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="i-ph:user text-zinc-400 text-3xl" />
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {selectedMarketer.fullName}
          </h3>
          {selectedMarketer.bio && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {selectedMarketer.bio}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 text-xs">
        <div className="font-semibold text-zinc-400 uppercase tracking-wider">Contact Info</div>
        {selectedMarketer.email ? (
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
            <span className="i-ph:envelope-simple text-base text-blue-500" />
            <span className="truncate">{selectedMarketer.email}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
            <span className="i-ph:envelope-simple text-base text-zinc-400" />
            <span className="truncate text-zinc-400">Contact via Platform Messages</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
          <span className="i-ph:shield-check text-base text-emerald-500" />
          <span>Verified Account</span>
        </div>
      </div>
    </div>
  );
}
