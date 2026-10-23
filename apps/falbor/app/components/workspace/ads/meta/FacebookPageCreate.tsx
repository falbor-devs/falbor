'use client';

import React, { useState } from 'react';
import { Input } from '~/components/ui/Input';
import { META_PAGE_CATEGORIES, META_PAGE_CREATE_URL } from '~/lib/services/metaAdsConstants';
import { createMetaPage } from '~/lib/actions/metaAds';

interface FacebookPageCreateProps {
  workspaceId: string;
  onCreated: (pageId?: string) => void;
  onRefresh: () => void;
  onCancel?: () => void;
}

export function FacebookPageCreate({ workspaceId, onCreated, onRefresh, onCancel }: FacebookPageCreateProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [about, setAbout] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Page name is required.');
      return;
    }
    if (!category) {
      setError('Please choose a Page category.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createMetaPage(workspaceId, { name: name.trim(), category, about });
      setSuccess('Page created. Refreshing your Pages…');
      onCreated(res.pageId);
    } catch (err: any) {
      setError(err?.message || 'Could not create the Page through the API.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114]">
        <i className="i-ph:info-fill text-[#0866FF] mt-0.5 shrink-0" />
        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          <p className="font-medium text-gray-800 dark:text-gray-100">A Facebook Page is required to run ads.</p>
          <p className="mt-1">
            Every Meta ad is published on behalf of a Page. Create one below, or use Facebook's official flow if the API
            declines your request.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle-fill shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs flex items-center gap-2">
          <i className="i-ph:check-circle-fill shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Page Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Studio" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="">Select a category…</option>
          {META_PAGE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">About (optional)</label>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={2}
          placeholder="A short description of your business."
          className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white resize-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {creating ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:plus-bold" />}
          {creating ? 'Creating…' : 'Create Page'}
        </button>

        <a
          href={META_PAGE_CREATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#18181b] hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
        >
          <i className="i-ph:arrow-square-out-bold" /> Create on Facebook
        </a>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
        >
          <i className="i-ph:arrow-clockwise" /> Refresh Pages
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Back to selection
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        If you create the Page on Facebook, return here and click <span className="font-medium">Refresh Pages</span> to
        continue. Meta only allows Page creation through its API for select partners, so the official flow is the
        reliable option.
      </p>
    </div>
  );
}
