import React from 'react';
import Link from 'next/link';

export function BreadcrumbNav({ templateName }: { templateName: string }) {
  return (
    <nav
      className="mb-8 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
      aria-label="Breadcrumb"
    >
      <Link href="/templates" className="transition-colors hover:text-violet-600 dark:hover:text-violet-300">
        Template library
      </Link>
      <span aria-hidden="true">/</span>
      <span className="max-w-[220px] truncate text-slate-700 dark:text-slate-200">
        {templateName}
      </span>
    </nav>
  );
}
