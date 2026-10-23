'use client';

import { classNames } from '~/utils/classNames';
import type { AutomationStatusSummary } from '~/lib/automation/types';

function MiniMetric({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      {label}
      <span
        className={classNames(
          'font-mono font-semibold px-1.5 py-0.5 rounded',
          alert
            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
            : 'text-gray-900 dark:text-white bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800',
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function TaskQueueStatus({ status }: { status: AutomationStatusSummary }) {
  const { queued, running, failed } = status.tasks;

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
          <i className="i-ph:list-checks text-gray-500 dark:text-gray-400" />
          Task queue
        </div>
        <MiniMetric label="Queued" value={queued} />
        <MiniMetric label="Running" value={running} />
        <MiniMetric label="Failed" value={failed} alert={failed > 0} />
      </div>

      {(queued > 0 || failed > 0) && (
        <div className="mt-2 space-y-1">
          {queued > 0 && status.extension.state !== 'connected' && (
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <i className="i-ph:warning-circle shrink-0" />
              {queued} task{queued === 1 ? ' is' : 's are'} waiting for your browser extension to come online.
            </p>
          )}
          {failed > 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <i className="i-ph:warning-circle shrink-0" />
              {failed} task{failed === 1 ? '' : 's'} failed — review the Activity tab.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
