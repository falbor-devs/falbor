'use client';

import React from 'react';
import { META_OBJECTIVES } from '~/lib/services/metaAdsConstants';
import type { StepProps } from '../types';

interface ReviewPublishStepProps extends StepProps {
  currency: string | null;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-900 dark:text-white text-right break-words">{value}</span>
    </div>
  );
}

export function ReviewPublishStep({ draft, currency }: ReviewPublishStepProps) {
  const objective = META_OBJECTIVES.find((o) => o.id === draft.objective);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-gray-800 space-y-2 text-sm">
        <ReviewRow label="Name" value={draft.name} />
        <ReviewRow label="Objective" value={objective?.label || draft.objective} />
        <ReviewRow label="Optimization" value={draft.optimizationGoal.replace(/_/g, ' ')} />
        <ReviewRow label="Locations" value={draft.countries.join(', ') || 'US'} />
        <ReviewRow label="Age / Gender" value={`${draft.ageMin}–${draft.ageMax} · ${draft.gender}`} />
        <ReviewRow label="Placements" value={draft.platforms.length ? draft.platforms.join(', ') : 'Automatic'} />
        <ReviewRow label="Budget" value={`${draft.budgetAmount} ${currency || 'USD'} / ${draft.budgetType}`} />
        {draft.startDate && <ReviewRow label="Start" value={draft.startDate} />}
        {draft.endDate && <ReviewRow label="End" value={draft.endDate} />}
        <ReviewRow label="Creative" value={`${draft.headline || '(no headline)'} → ${draft.linkUrl}`} />
        <ReviewRow label="CTA" value={draft.callToAction.replace(/_/g, ' ')} />
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs">
        <i className="i-ph:info-fill shrink-0 mt-0.5" />
        <span>
          Your campaign will be created <strong>paused</strong>. Review it in Ads Manager, then activate it when you are
          ready.
        </span>
      </div>
    </div>
  );
}
