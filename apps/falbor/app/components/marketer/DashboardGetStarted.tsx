'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface DashboardGetStartedProps {
  profileId: string;
  onboardingStatus: { profileComplete: boolean; productsCount: number };
  totalSales: number;
  onOpenProductModal: () => void;
}

export function DashboardGetStarted({
  profileId,
  onboardingStatus,
  totalSales,
  onOpenProductModal,
}: DashboardGetStartedProps) {
  const router = useRouter();

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="i-ph:rocket-launch-duotone text-lg" />
        <h3 className="text-sm font-bold tracking-tight">Get Started</h3>
      </div>
      <div className="bg-white dark:bg-zinc-950 rounded-md overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-900">
        <div
          onClick={() => router.push(`/b2b/${profileId}/settings/edit`)}
          className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={
                onboardingStatus.profileComplete
                  ? 'i-ph:check-circle-fill text-emerald-500 text-lg'
                  : 'i-ph:number-circle-one-duotone text-zinc-400 text-lg'
              }
            />
            <span className={`text-xs font-semibold ${onboardingStatus.profileComplete ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
              Fill out your entire business profile
            </span>
          </div>
          <span className="i-ph:caret-right text-zinc-400 text-xs" />
        </div>

        <div
          onClick={onOpenProductModal}
          className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={
                onboardingStatus.productsCount > 0
                  ? 'i-ph:check-circle-fill text-emerald-500 text-lg'
                  : 'i-ph:number-circle-two-duotone text-zinc-400 text-lg'
              }
            />
            <span className={`text-xs font-semibold ${onboardingStatus.productsCount > 0 ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
              Create your first marketing product ({onboardingStatus.productsCount}/3)
            </span>
          </div>
          <span className="i-ph:caret-right text-zinc-400 text-xs" />
        </div>

        <div
          onClick={() => router.push(`/b2b/${profileId}/messages`)}
          className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={
                totalSales > 0
                  ? 'i-ph:check-circle-fill text-emerald-500 text-lg'
                  : 'i-ph:number-circle-three-duotone text-zinc-400 text-lg'
              }
            />
            <span className={`text-xs font-semibold ${totalSales > 0 ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
              Make your first sale ({totalSales > 0 ? 'Completed' : '0 sales'})
            </span>
          </div>
          <span className="i-ph:caret-right text-zinc-400 text-xs" />
        </div>
      </div>
    </div>
  );
}
