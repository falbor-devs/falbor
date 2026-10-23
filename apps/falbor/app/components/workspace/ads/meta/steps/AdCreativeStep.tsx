'use client';

import React from 'react';
import { Input } from '~/components/ui/Input';
import { META_CALL_TO_ACTIONS } from '~/lib/services/metaAdsConstants';
import { FacebookPageSelect } from '../FacebookPageSelect';
import { MetaMediaPicker } from '../MetaMediaPicker';
import type { StepProps } from '../types';

interface AdCreativeStepProps extends StepProps {
  workspaceId: string;
  onError: (message: string) => void;
}

export function AdCreativeStep({ draft, update, workspaceId, onError }: AdCreativeStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Facebook Page</label>
        <FacebookPageSelect
          workspaceId={workspaceId}
          value={draft.pageId}
          onSelect={(page) =>
            update({ pageId: page.id, instagramAccountId: page.instagramAccountId })
          }
          onError={onError}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Media</label>
        <MetaMediaPicker workspaceId={workspaceId} value={draft.media} onChange={(media) => update({ media })} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Primary Text</label>
        <textarea
          value={draft.primaryText}
          onChange={(e) => update({ primaryText: e.target.value })}
          rows={3}
          placeholder="Tell people what your product does and why they should click."
          className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Headline</label>
          <Input
            value={draft.headline}
            onChange={(e) => update({ headline: e.target.value })}
            placeholder="Short attention grabber"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <Input
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Optional supporting line"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Destination URL</label>
          <Input
            type="url"
            value={draft.linkUrl}
            onChange={(e) => update({ linkUrl: e.target.value })}
            placeholder="https://yourproduct.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Call to Action</label>
          <select
            value={draft.callToAction}
            onChange={(e) => update({ callToAction: e.target.value })}
            className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
          >
            {META_CALL_TO_ACTIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
