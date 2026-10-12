'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';

interface DashboardMetricsProps {
  totalErrors: number;
  unresolvedIssues: number;
  activeProjects: number;
}

export function DashboardMetrics({ totalErrors, unresolvedIssues, activeProjects }: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/20 backdrop-blur-sm p-6">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/10 blur-2xl rounded-full pointer-events-none transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-sm text-gray-500 dark:text-gray-400 tracking-medium">
            Total Events 24h
          </h3>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shadow-inner">
            <div className="i-ph:activity text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {totalErrors.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <div className="i-ph:trend-up text-emerald-500 w-3.5 h-3.5 mr-1.5" />
            <span>Monitored across all apps</span>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/20 backdrop-blur-sm p-6">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-rose-500/10 dark:bg-rose-500/10 blur-2xl rounded-full pointer-events-none transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-sm text-gray-500 dark:text-gray-400 tracking-medium">
            Unresolved Issues
          </h3>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shadow-inner">
            <div className="i-ph:bug-duotone text-rose-600 dark:text-rose-400 w-5 h-5" />
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-end gap-3">
            <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {unresolvedIssues.toLocaleString()}
            </div>
            <div className="pb-1.5">
              {unresolvedIssues > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                  Action Required
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  All Clear
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <div className="i-ph:warning-circle text-rose-500 w-3.5 h-3.5 mr-1.5" />
            <span>Pending triage</span>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/20 backdrop-blur-sm p-6">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/10 blur-2xl rounded-full pointer-events-none transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-sm text-gray-500 dark:text-gray-400 tracking-medium">
            Active Projects
          </h3>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shadow-inner">
            <div className="i-ph:folders-duotone text-blue-600 dark:text-blue-400 w-5 h-5" />
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {activeProjects.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <div className="i-ph:broadcast text-blue-500 w-3.5 h-3.5 mr-1.5" />
            <span>Sending telemetry data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
