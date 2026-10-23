"use client";

import {
  Dialog,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from "~/components/ui/Dialog";
import { useMemo, useState } from "react";

type Playground = { id: string; name: string; model: string; updatedAt: string };

export function AdsCreateContentDialog({
  open,
  onClose,
  workspaceId,
  playgrounds = [],
  previewImages = {},
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  playgrounds?: Playground[];
  previewImages?: Record<string, string[]>;
}) {
  const [search, setSearch] = useState("");
  const filteredPlaygrounds = useMemo(() => playgrounds.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [playgrounds, search]);
  return (
    <DialogRoot open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog
        className="!w-[min(620px,92vw)] !max-w-[620px] p-6"
        onBackdrop={onClose}
      >
        <div className="space-y-5 pr-5">
          <div>
            <DialogTitle>Choose a playground</DialogTitle>
            <DialogDescription>
              Open one of your existing image playgrounds.
            </DialogDescription>
          </div>
          <div className="relative">
            <i className="i-ph:magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search playgrounds" className="w-full rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-400 dark:border-gray-800" />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredPlaygrounds.map((playground) => (
              <button key={playground.id} type="button" onClick={() => { onClose(); window.location.href = `/workspace/${workspaceId}/ads-marketing/playground/${playground.id}`; }} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-900">
                <div className="flex h-12 w-12 shrink-0 gap-0.5 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  {(previewImages[playground.id] || []).slice(0, 3).map((src, index) => <img key={`${src}-${index}`} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />)}
                  {!previewImages[playground.id]?.length && <i className="i-ph:sparkle m-auto text-gray-500" />}
                </div>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{playground.name}</span><span className="text-xs text-gray-500">Updated {new Date(playground.updatedAt).toLocaleDateString()}</span></span>
                <i className="i-ph:arrow-right text-gray-400" />
              </button>
            ))}
            {!filteredPlaygrounds.length && <p className="py-6 text-center text-sm text-gray-500">No matching playgrounds.</p>}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
