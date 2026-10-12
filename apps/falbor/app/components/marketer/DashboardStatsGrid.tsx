'use client';

import React from 'react';
import { Card } from '~/components/ui/Card';

interface DashboardStatsGridProps {
  stats: {
    totalMessages: number;
    newMessages: number;
    totalProducts: number;
    totalSales: number;
  };
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-none">
        <div className="flex items-center justify-between text-zinc-500 mb-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Total Messages</span>
          <span className="i-ph:paper-plane-tilt-duotone text-lg" />
        </div>
        <span className="text-2xl font-extrabold">{stats.totalMessages}</span>
      </Card>
      <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-none">
        <div className="flex items-center justify-between text-zinc-500 mb-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">New Messages</span>
          <span className="i-ph:chat-teardrop-text-duotone text-lg" />
        </div>
        <span className="text-2xl font-extrabold">{stats.newMessages}</span>
      </Card>
      <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-none">
        <div className="flex items-center justify-between text-zinc-500 mb-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Active Products</span>
          <span className="i-ph:cube-duotone text-lg" />
        </div>
        <span className="text-2xl font-extrabold">{stats.totalProducts} / 3</span>
      </Card>
      <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-none">
        <div className="flex items-center justify-between text-zinc-500 mb-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Total Sales</span>
          <span className="i-ph:shopping-cart-simple-duotone text-lg" />
        </div>
        <span className="text-2xl font-extrabold">{stats.totalSales}</span>
      </Card>
    </div>
  );
}
