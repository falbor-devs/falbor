import React from 'react';
import Link from 'next/link';
import type { Template } from '../types';
import { Avatar } from './Avatar';

export function TemplateInfo({
  template,
  publisherName,
  handleUseTemplate,
  isUsing,
}: {
  template: Template;
  publisherName: string;
  handleUseTemplate: () => void;
  isUsing: boolean;
}) {
  return (
    <div>
      <div className="pb-1 rounded-lg">
        <div className="mb-2 flex flex-wrap items-center rounded-lg">
          <Link
            href={`/profile/${template.user?.username || template.user?.id}`}
            className="bg-[#0099ff]/20 flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <Avatar user={template.user} />
            <span className='mr-4'>
              <span className="block text-sm text-slate-900 dark:text-white">
                {publisherName}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                Published by creator
              </span>
            </span>
          </Link>
        </div>
        <h1 className="max-w-2xl text-2xl leading-[1.04] tracking-[-0.045em] text-slate-950 dark:text-white sm:text-3xl">
          {template.name}
        </h1>
        <p className="max-w-xl text-md leading-8 text-slate-600 dark:text-slate-300">
          {template.shortDescription || 'A thoughtfully crafted starting point for your next project.'}
        </p>
        {template.categories?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {template.categories.map((category) => (
              <span
                key={category}
                className="rounded-lg border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                {category}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
        <button
          type="button"
          onClick={handleUseTemplate}
          disabled={isUsing}
          className="!bg-[#0099ff]/20 text-[#0099ff] inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-200"
        >
          {isUsing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <span aria-hidden="true">✦</span>
          )}
          {isUsing ? 'Preparing project…' : 'Use this template'}
        </button>
        {template.url && (
          <a
            href={template.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:border-white dark:hover:text-white"
          >
            Preview live site
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
