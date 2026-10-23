'use client';

import { classNames } from '~/utils/classNames';

export type StatusTone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  good: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50',
  warn: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50',
  bad: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50',
  info: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
  neutral: 'bg-gray-50 dark:bg-[#111114] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800',
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}
