'use client';

import React, { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { Dropdown, DropdownItem, DropdownSeparator } from '~/components/ui/Dropdown';
import { generateAdImage, generateAdVideo } from '~/lib/actions/adsMarketing';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  loading?: boolean;
}

interface WorkspaceAdsMarketingViewProps {
  workspaceId: string;
}

export function WorkspaceAdsMarketingView({ workspaceId }: WorkspaceAdsMarketingViewProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);

  const storageKey = `ads_marketing_items_${workspaceId}`;

  useEffect(() => {
    loadOrInitialize();
  }, [workspaceId]);

  const loadOrInitialize = async () => {
    setInitializing(true);
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setInitializing(false);
          return;
        }
      }
    } catch {
      // ignore JSON parse error
    }

    const placeholders: MediaItem[] = [
      { id: 'init-1', type: 'image', url: '', prompt: '', loading: true },
      { id: 'init-2', type: 'image', url: '', prompt: '', loading: true },
    ];
    setItems(placeholders);

    const results = await Promise.allSettled([
      generateAdImage(workspaceId),
      generateAdImage(workspaceId),
    ]);

    const generated = results
      .map((r, i) => ({
        id: `img-${Date.now()}-${i}`,
        type: 'image' as const,
        url: r.status === 'fulfilled' ? r.value.url : '',
        prompt: r.status === 'fulfilled' ? r.value.prompt : '',
        loading: false,
      }))
      .filter(item => item.url);

    setItems(generated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(generated));
    } catch {}
    setInitializing(false);
  };

  const saveItemsToStorage = (updated: MediaItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated.filter(i => !i.loading)));
    } catch {}
  };

  const handleCreate = async (type: 'image' | 'video') => {
    setCreateLoading(true);
    const tempId = `creating-${Date.now()}`;
    setItems(prev => [...prev, { id: tempId, type, url: '', prompt: '', loading: true }]);

    try {
      const result = type === 'image'
        ? await generateAdImage(workspaceId)
        : await generateAdVideo(workspaceId);

      setItems(prev => {
        const updated = prev.map(item =>
          item.id === tempId
            ? { ...item, url: result.url, prompt: result.prompt, loading: false }
            : item,
        );
        saveItemsToStorage(updated);
        return updated;
      });
    } catch {
      setItems(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveItemsToStorage(updated);
      return updated;
    });
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#09090B]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="i-ph:megaphone-duotone text-[#0099ff]" />
          Ads Marketing
        </h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <Dropdown
          trigger={
            <button
              disabled={createLoading}
              className="w-[240px] h-[240px] rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 flex flex-col items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLoading ? (
                <i className="i-ph:spinner-gap animate-spin text-2xl text-amber-600" />
              ) : (
                <i className="i-ph:plus text-2xl text-amber-600" />
              )}
              <span className="text-sm font-medium text-amber-600">Create Content</span>
            </button>
          }
          align="start"
          side="right"
          sideOffset={8}
        >
          <DropdownItem onSelect={() => handleCreate('image')}>
            <i className="i-ph:image w-4 h-4" />
            Image
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onSelect={() => handleCreate('video')}>
            <i className="i-ph:video w-4 h-4" />
            Video
          </DropdownItem>
        </Dropdown>

        {items.map(item => (
          <div
            key={item.id}
            className="relative w-[240px] h-[240px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 group shrink-0"
          >
            {item.loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <i className="i-ph:spinner-gap animate-spin text-3xl text-gray-400" />
                <span className="text-xs text-gray-400">
                  Generating {item.type}...
                </span>
              </div>
            ) : item.type === 'image' ? (
              <img
                src={item.url}
                alt={item.prompt}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            )}

            {!item.loading && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Dropdown
                  trigger={
                    <button className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
                      <i className="i-ph:dots-three-bold text-white text-sm" />
                    </button>
                  }
                  align="end"
                  sideOffset={4}
                >
                  <DropdownItem
                    onSelect={() => handleDelete(item.id)}
                    className="text-red-500 focus:bg-red-50 dark:focus:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <i className="i-ph:trash w-4 h-4" />
                    Delete
                  </DropdownItem>
                </Dropdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
