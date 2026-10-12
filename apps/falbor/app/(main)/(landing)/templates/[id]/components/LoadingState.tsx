import React from 'react';

export function LoadingState() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 dark:bg-[#090b12] sm:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="mb-8 h-5 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="aspect-[1.3/1] rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-5 py-4">
            <div className="h-5 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-14 w-4/5 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-20 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-14 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </main>
  );
}
