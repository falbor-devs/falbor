'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { generateAdImage } from '~/lib/actions/adsMarketing';
import type { SelectedMedia } from './types';

export type { SelectedMedia } from './types';

interface WorkspaceMediaItem {
  id: string;
  kind: 'image' | 'video';
  mimeType: string | null;
  source: string;
  url: string | null;
  previewUrl: string;
  prompt: string | null;
  createdAt: string;
}

interface MetaMediaPickerProps {
  workspaceId: string;
  value: SelectedMedia | null;
  onChange: (media: SelectedMedia | null) => void;
  disabled?: boolean;
}

type Tab = 'upload' | 'workspace' | 'generate';

export function MetaMediaPicker({ workspaceId, value, onChange, disabled }: MetaMediaPickerProps) {
  const [tab, setTab] = useState<Tab>('upload');
  const [items, setItems] = useState<WorkspaceMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ads/meta/media?workspaceId=${workspaceId}`);
      const json = await res.json();
      if (json.media) setItems(json.media);
      else if (json.error) setError(json.error);
    } catch {
      setError('Failed to load workspace media.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (tab === 'workspace') loadMedia();
  }, [tab, loadMedia]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('workspaceId', workspaceId);
      form.append('file', file);
      form.append('filename', file.name);
      const res = await fetch('/api/ads/meta/media', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Upload failed');
      const m = json.media;
      onChange({ mediaId: m.id, previewUrl: m.previewUrl, kind: m.kind });
      setItems((prev) => [m, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateAdImage(workspaceId);
      const res = await fetch('/api/ads/meta/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, kind: 'image', source: 'ai', url: result.url, prompt: result.prompt, mimeType: 'image/png' }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to save generated image');
      const m = json.media;
      onChange({ mediaId: m.id, previewUrl: m.previewUrl, kind: m.kind });
      setItems((prev) => [m, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Image generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'upload', label: 'Upload', icon: 'i-ph:upload-simple-bold' },
    { id: 'workspace', label: 'Workspace', icon: 'i-ph:folders-bold' },
    { id: 'generate', label: 'Generate with AI', icon: 'i-ph:sparkle-bold' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[#18181b] w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => setTab(t.id)}
            className={classNames(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50',
              tab === t.id ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <i className="i-ph:warning-circle-fill" /> {error}
        </div>
      )}

      {tab === 'upload' && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#111114] cursor-pointer hover:border-[#0866FF] transition-colors"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <>
              <i className="i-ph:spinner-gap animate-spin text-2xl text-[#0866FF]" />
              <p className="text-xs text-gray-500">Uploading…</p>
            </>
          ) : (
            <>
              <i className="i-ph:image-square text-2xl text-gray-400" />
              <p className="text-xs text-gray-500">Click to upload an image or video from your computer</p>
              <p className="text-[10px] text-gray-400">Images up to 10MB · Videos up to 64MB</p>
            </>
          )}
        </div>
      )}

      {tab === 'workspace' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-xs">
              <i className="i-ph:spinner-gap animate-spin mr-2" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              No media in this workspace yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar p-0.5">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ mediaId: m.id, previewUrl: m.previewUrl, kind: m.kind })}
                  className={classNames(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all disabled:opacity-50',
                    value?.mediaId === m.id ? 'border-[#0866FF] ring-2 ring-[#0866FF]/30' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700',
                  )}
                >
                  {m.kind === 'video' ? (
                    <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] px-1 py-0.5 rounded bg-black/60 text-white">
                    {m.kind === 'video' ? 'VIDEO' : m.source === 'ai' ? 'AI' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'generate' && (
        <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#111114]">
          <i className="i-ph:sparkle text-2xl text-[#0866FF]" />
          <p className="text-xs text-gray-500 text-center">Generate a marketing image for your workspace using AI.</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0050CC] text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {generating ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:magic-wand-bold" />}
            {generating ? 'Generating…' : 'Generate image'}
          </button>
        </div>
      )}

      {value && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-gray-800">
          <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
            {value.kind === 'video' ? (
              <video src={value.previewUrl} className="w-full h-full object-cover" muted />
            ) : (
              <img src={value.previewUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 flex-1">
            Selected {value.kind}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            disabled={disabled}
          >
            <i className="i-ph:x-bold" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
