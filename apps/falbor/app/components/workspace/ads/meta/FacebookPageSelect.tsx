'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FacebookPageCreate } from './FacebookPageCreate';
import { getMetaPromotablePages } from '~/lib/actions/metaAds';
import type { PromotablePage } from './types';

interface FacebookPageSelectProps {
  workspaceId: string;
  value: string;
  onSelect: (page: PromotablePage) => void;
  onError: (message: string) => void;
}

export function FacebookPageSelect({ workspaceId, value, onSelect, onError }: FacebookPageSelectProps) {
  const [pages, setPages] = useState<PromotablePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const loadStartedRef = useRef(false);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMetaPromotablePages(workspaceId);
      setPages(res);
      setMode(res.length === 0 ? 'create' : 'select');
      if (res.length > 0 && !value) {
        onSelect(res[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load Facebook Pages.');
      onError(err?.message || 'Failed to load Facebook Pages.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, value, onSelect, onError]);

  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    void loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreated = useCallback(
    async (pageId?: string) => {
      loadStartedRef.current = true;
      setLoading(true);
      try {
        const res = await getMetaPromotablePages(workspaceId);
        setPages(res);
        setMode('select');
        const created = (pageId && res.find((p) => p.id === pageId)) || res[0];
        if (created) onSelect(created);
      } catch {
        // Keep the user on the create view; they can retry with Refresh.
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, onSelect],
  );

  if (loading) {
    return (
      <div className="text-xs text-gray-400 flex items-center gap-2">
        <i className="i-ph:spinner-gap animate-spin" /> Loading Pages…
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <FacebookPageCreate
        workspaceId={workspaceId}
        onCreated={handleCreated}
        onRefresh={loadPages}
        onCancel={pages.length > 0 ? () => setMode('select') : undefined}
      />
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
          <i className="i-ph:warning-circle-fill shrink-0" />
          <span>{error}</span>
          <button className="ml-auto text-xs font-semibold hover:underline" onClick={loadPages}>
            Retry
          </button>
        </div>
      )}
      <select
        value={value}
        onChange={(e) => {
          const page = pages.find((p) => p.id === e.target.value);
          if (page) onSelect(page);
        }}
        className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
      >
        {!value && <option value="">Select a Page…</option>}
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.instagramUsername ? ` (+ @${p.instagramUsername})` : ''}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setMode('create')}
        className="text-xs text-[#0866FF] hover:underline"
      >
        Don't see your Page? Create one
      </button>
    </div>
  );
}
