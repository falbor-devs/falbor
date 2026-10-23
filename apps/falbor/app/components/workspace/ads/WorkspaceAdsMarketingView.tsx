"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdsCreateContentDialog } from "./AdsCreateContentDialog";

type Playground = {
  id: string;
  name: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export function WorkspaceAdsMarketingView({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`/api/workspace/${workspaceId}/ads-marketing/playgrounds`)
      .then((response) => (response.ok ? response.json() : { playgrounds: [] }))
      .then((data) => { setPlaygrounds(data.playgrounds || []); setPreviewImages(data.previewImages || {}); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto p-6">
      <div className="mb-7 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <i className="i-ph:megaphone-duotone text-[#0099ff]" />
          Ads Marketing
        </h1>
      </div>
      <div className="flex flex-wrap items-stretch gap-4">
      <div className="relative">
        <button type="button" onClick={() => setCreateMenuOpen((open) => !open)} className="flex h-[220px] w-[240px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-50 transition-colors hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
          <i className="i-ph:plus text-2xl text-amber-600" />
          <span className="text-sm font-medium text-amber-600">Create Content</span>
          <i className={`i-ph:caret-${createMenuOpen ? "up" : "down"} text-amber-600`} />
        </button>
        {createMenuOpen && <div className="absolute left-0 top-[228px] z-20 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-800 dark:bg-gray-950">
          <button type="button" onClick={() => { setCreateMenuOpen(false); window.location.href = `/workspace/${workspaceId}/ads-marketing/playground/new?mode=image-ad`; }} className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"><i className="i-ph:image-square mt-0.5 text-lg text-amber-500" /><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">Create Image</span><span className="block text-xs text-gray-500">Start a new image playground</span></span></button>
          <button type="button" onClick={() => { setCreateMenuOpen(false); setDialogOpen(true); }} className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"><i className="i-ph:folder-open mt-0.5 text-lg text-blue-500" /><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">Select Playground</span><span className="block text-xs text-gray-500">Open an existing playground</span></span></button>
          <button type="button" onClick={() => { setCreateMenuOpen(false); const id = crypto.randomUUID(); window.location.href = `/workspace/${workspaceId}/ads-marketing/playground/animation/${id}`; }} className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"><i className="i-ph:film-strip mt-0.5 text-lg text-purple-500" /><span><span className="block text-sm font-semibold text-gray-900 dark:text-white">Image to Animation</span><span className="block text-xs text-gray-500">Animate an image with instructions</span></span></button>
        </div>}
      </div>
      {playgrounds.slice(0, 3).map((playground) => (
        <button key={playground.id} type="button" onClick={() => router.push(`/workspace/${workspaceId}/ads-marketing/playground/${playground.id}`)} className="relative flex h-[220px] w-[180px] flex-col overflow-hidden rounded-xl border border-gray-200 text-left hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600">
          <div className="flex h-32 w-full gap-1 bg-gray-100 dark:bg-gray-900">{(previewImages[playground.id] || []).slice(0, 3).map((src, index) => <img key={`${src}-${index}`} src={src} alt="" className="min-w-0 flex-1 object-cover" />)}{!previewImages[playground.id]?.length && <i className="i-ph:sparkle m-auto text-gray-500" />}</div>
          <span className="truncate px-3 pt-3 text-sm font-semibold text-gray-900 dark:text-white">{playground.name}</span><span className="px-3 pt-1 text-xs text-gray-500">{previewImages[playground.id]?.length || 0} image{previewImages[playground.id]?.length === 1 ? "" : "s"}</span>
        </button>
      ))}
      {playgrounds.length > 3 && <button type="button" onClick={() => setDialogOpen(true)} className="flex h-[220px] w-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gray-500 dark:border-gray-700"><i className="i-ph:arrows-out text-xl" />View More</button>}
      </div>
      {loading && <div className="mt-10 h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900" />}
      <AdsCreateContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workspaceId={workspaceId}
        playgrounds={playgrounds}
        previewImages={previewImages}
      />
    </div>
  );
}
