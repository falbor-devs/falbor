'use client';

import React from 'react';
import { Input } from '~/components/ui/Input';
import { classNames } from '~/utils/classNames';
import type { StepProps } from '../types';

interface BudgetScheduleStepProps extends StepProps {
  currency: string | null;
}

export function BudgetScheduleStep({ draft, update, currency }: BudgetScheduleStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Budget Type</label>
        <div className="flex gap-2">
          {(['daily', 'lifetime'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update({ budgetType: t })}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                draft.budgetType === t
                  ? 'bg-[#0866FF] text-white'
                  : 'bg-gray-100 dark:bg-[#18181b] text-gray-600 dark:text-gray-400',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {draft.budgetType === 'daily' ? 'Daily Budget' : 'Lifetime Budget'} ({currency || 'USD'})
        </label>
        <Input
          type="number"
          min={1}
          value={draft.budgetAmount}
          onChange={(e) => update({ budgetAmount: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date (optional)</label>
          <Input type="date" value={draft.startDate} onChange={(e) => update({ startDate: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            End Date {draft.budgetType === 'lifetime' ? '' : '(optional)'}
          </label>
          <Input type="date" value={draft.endDate} onChange={(e) => update({ endDate: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
