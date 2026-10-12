'use client';

import React, { useState } from 'react';
import { SearchDialog } from './SearchDialog';

export interface Marketer {
  id: string;
  userId: string;
  fullName: string;
  photoUrl?: string | null;
  bio?: string | null;
  email?: string | null;
}

interface MessagesSidebarProps {
  marketers: Marketer[];
  conversations: Marketer[];
  selectedMarketer: Marketer | null;
  hidePicker?: boolean;
  onSelectMarketer: (m: Marketer) => void;
  className?: string;
}

export function MessagesSidebar({
  marketers,
  conversations,
  selectedMarketer,
  hidePicker = false,
  onSelectMarketer,
  className = '',
}: MessagesSidebarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className={`w-72 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950 flex-shrink-0 ${className}`}>
      <div className="h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-semibold">Messages</h2>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="h-8 w-8 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 hover:bg-zinc-300/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-colors"
          title={hidePicker ? "Search contacts" : "Search marketers"}
        >
          <span className="i-ph:magnifying-glass text-base" />
        </button>
      </div>

      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={hidePicker ? conversations : marketers}
        onSelect={onSelectMarketer}
        title={hidePicker ? "Search Contacts" : "Search Marketers"}
        placeholder={hidePicker ? "Search by contact name..." : "Search marketer by name..."}
        emptyText={hidePicker ? "No matching contacts found" : "No registered marketers found"}
      />

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="text-xs text-zinc-400 text-center py-8">
            No conversations yet.<br />Click the <b>+</b> button to message a marketer.
          </div>
        ) : (
          conversations.map((m) => {
            const isSelected = selectedMarketer?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMarketer(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left ${isSelected
                  ? 'bg-[#0099ff]/10'
                  : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
                  }`}
              >
                <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="i-ph:user text-zinc-500 text-lg" />
                  )}
                </div>
                <div className="flex-1 truncate">
                  <div className="text-sm font-semibold truncate">{m.fullName}</div>
                  <div className="text-xs text-zinc-400 truncate">{m.bio || 'Marketer'}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
