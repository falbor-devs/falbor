'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface QuickActionsHeaderProps {
  profileId: string;
  onOpenProductModal: () => void;
}

export function QuickActionsHeader({ profileId, onOpenProductModal }: QuickActionsHeaderProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        type="button"
        onClick={onOpenProductModal}
        className="h-28 rounded-2xl bg-amber-100/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <span className="i-ph:plus-bold text-amber-500 text-2xl" />
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Sell</span>
      </button>
      <button
        type="button"
        onClick={() => router.push(`/b2b/${profileId}/messages`)}
        className="h-28 rounded-2xl bg-purple-100/70 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <span className="i-ph:chat-teardrop-text-bold text-purple-500 text-2xl" />
        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Message your customer</span>
      </button>
      <button
        type="button"
        onClick={() => router.push(`/b2b/${profileId}/earnings?tab=payout`)}
        className="h-28 rounded-2xl bg-sky-100/70 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <span className="i-ph:link-bold text-sky-500 text-2xl" />
        <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Get Paid</span>
      </button>
    </div>
  );
}
