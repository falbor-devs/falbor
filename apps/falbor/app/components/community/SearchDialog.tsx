'use client';

import React, { useState } from 'react';
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { Input } from '~/components/ui/Input';
import type { Marketer } from './MessagesSidebar';
import { Button } from '../ui';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Marketer[];
  onSelect: (m: Marketer) => void;
  title: string;
  placeholder: string;
  emptyText: string;
}

export function SearchDialog({
  isOpen,
  onClose,
  items,
  onSelect,
  title,
  placeholder,
  emptyText,
}: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) =>
    item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.bio && item.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (m: Marketer) => {
    onSelect(m);
    setSearchQuery('');
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog className="max-w-md p-4">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="i-ph:magnifying-glass text-blue-500" />
            {title}
          </DialogTitle>
        </div>

        <div className="mb-4">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-xs text-zinc-400 py-8 text-center">{emptyText}</div>
          ) : (
            filteredItems.map((m) => (
              <button
                key={m.id || m.userId}
                onClick={() => handleSelect(m)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="i-ph:user text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 truncate">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {m.fullName}
                  </div>
                  {m.bio && <div className="text-xs text-zinc-400 truncate">{m.bio}</div>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button className="bg-[#0099ff]/20 text-[#0099ff]" onClick={onClose}>
            Close
          </Button>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
