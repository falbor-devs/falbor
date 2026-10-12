'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown } from '~/components/ui/Dropdown';

interface DashboardHeaderProps {
  profile: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
  };
  activityNotifications: {
    sales: any[];
    payouts: any[];
  };
}

export function DashboardHeader({ profile, activityNotifications }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {profile.fullName}'s Business
        </h1>
        <span className="i-ph:gem-duotone text-amber-500 text-xl" />
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <Dropdown
          align="end"
          trigger={
            <button
              className="relative p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors outline-none flex items-center justify-center"
              title="Notifications & Activity"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-950" />
            </button>
          }
        >
          <div className="w-80 p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span className="i-ph:bell-duotone text-amber-500 text-sm" />
                Account Activity & Alerts
              </h4>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {/* Default Welcome Message */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                  <span className="i-ph:sparkle-duotone text-amber-500" />
                  <span>Welcome to your business!</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Your business dashboard is active and ready to process customer orders.
                </p>
              </div>

              {/* Dynamic Sales Notifications */}
              {activityNotifications.sales.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/b2b/${profile.id}/earnings?tab=transactions`)}
                  className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-xs space-y-1 cursor-pointer hover:bg-emerald-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span className="i-ph:check-circle-duotone" />
                      {idx === activityNotifications.sales.length - 1 ? 'You made your first sale!' : 'You made a sale'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">+${s.amount}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                    {s.productName} purchased by <span className="font-semibold">Customer User</span>
                  </p>
                  <span className="text-[10px] text-zinc-400 underline block">View transaction details →</span>
                </div>
              ))}

              {/* Dynamic PayPal Withdrawal Warnings & Alerts */}
              {activityNotifications.payouts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/b2b/${profile.id}/earnings?tab=payout`)}
                  className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-xs space-y-1 cursor-pointer hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <span className="i-ph:warning-circle-duotone" />
                      PayPal Payout Notice
                    </span>
                    <span className="text-[10px] uppercase font-extrabold text-amber-600">${p.amount}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                    Funds transferred to <span className="font-semibold">{p.paypalEmail}</span> ({p.status})
                  </p>
                  <span className="text-[10px] text-zinc-400 underline block">View payout status →</span>
                </div>
              ))}
            </div>
          </div>
        </Dropdown>

        <button
          onClick={() => router.push(`/marketers/profile/${profile.id}`)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <span className="i-ph:globe-duotone text-base" />
          View Public Profile
        </button>
        <div className="h-7 w-7 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-700">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <span className="i-ph:user text-xs text-zinc-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
