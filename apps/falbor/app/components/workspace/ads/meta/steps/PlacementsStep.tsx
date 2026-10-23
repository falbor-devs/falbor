'use client';

import React from 'react';
import { PUBLISHER_PLATFORMS } from '../constants';
import type { StepProps } from '../types';

export function PlacementsStep({ draft, update }: StepProps) {
  const togglePlatform = (id: string) => {
    const next = draft.platforms.includes(id)
      ? draft.platforms.filter((p) => p !== id)
      : [...draft.platforms, id];
    update({ platforms: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Publisher Platforms</label>
        <div className="flex flex-wrap gap-3">
          {PUBLISHER_PLATFORMS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={draft.platforms.includes(p.id)}
                onChange={() => togglePlatform(p.id)}
                className="accent-[#0866FF]"
              />
              {p.label}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Leave all unchecked to use Meta's automatic placements.</p>
      </div>
    </div>
  );
}
