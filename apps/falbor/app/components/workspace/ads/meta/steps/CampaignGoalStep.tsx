'use client';

import React from 'react';
import { Input } from '~/components/ui/Input';
import { classNames } from '~/utils/classNames';
import { META_OBJECTIVES } from '~/lib/services/metaAdsConstants';
import { SPECIAL_CATEGORIES } from '../constants';
import type { StepProps } from '../types';

export function CampaignGoalStep({ draft, update }: StepProps) {
  const selected = META_OBJECTIVES.find((o) => o.id === draft.objective) || META_OBJECTIVES[0];

  const toggleCategory = (id: string) => {
    const next = draft.specialCategories.includes(id)
      ? draft.specialCategories.filter((c) => c !== id)
      : [...draft.specialCategories, id];
    update({ specialCategories: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Campaign Name</label>
        <Input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Spring Sale — Traffic"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Objective</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {META_OBJECTIVES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() =>
                update({ objective: o.id, optimizationGoal: o.defaultOptimizationGoal })
              }
              className={classNames(
                'text-left p-3 rounded-xl border transition-colors',
                draft.objective === o.id
                  ? 'border-[#0866FF] bg-[#0866FF]/5'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
              )}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">{o.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{o.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Optimization Goal</label>
        <select
          value={draft.optimizationGoal}
          onChange={(e) => update({ optimizationGoal: e.target.value })}
          className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
        >
          {selected.optimizationGoals.map((g) => (
            <option key={g} value={g}>
              {g.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Special Ad Categories</label>
        <div className="flex flex-wrap gap-3">
          {SPECIAL_CATEGORIES.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={draft.specialCategories.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
                className="accent-[#0866FF]"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
