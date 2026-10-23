"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";
import { Tooltip } from "~/components/ui/Tooltip";
import { AdServiceContext } from "./AdServiceContext";

type PlaygroundImage = {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  resolution: string;
  isFavorite: boolean;
  createdAt: string;
};
type PlaygroundAsset = {
  id: string;
  name: string;
  kind: string;
  source: string;
  assetUrl: string;
  selected: boolean;
};
type Playground = { id: string; name: string; model: string };
const aspectRatios = [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "4:5",
  "9:16",
  "16:9",
  "21:9",
];
const resolutions = ["1K", "2K", "4K"];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function WorkspaceAdsPlaygroundView({
  workspaceId,
  playgroundId,
}: {
  workspaceId: string;
  playgroundId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageAdMode = searchParams.get("mode") === "image-ad";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const [playground, setPlayground] = useState<Playground | null>(null);
  const [images, setImages] = useState<PlaygroundImage[]>([]);
  const [assets, setAssets] = useState<PlaygroundAsset[]>([]);
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [count, setCount] = useState(1);
  const [filter, setFilter] = useState<"images" | "favorites">("images");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assetsOpen, setAssetsOpen] = useState(false);
  const initializedRef = useRef(false);

  const load = async (id: string) => {
    const response = await fetch(
      `/api/workspace/${workspaceId}/ads-marketing/playgrounds/${id}`,
    );
    if (!response.ok) {
      setError("This playground could not be loaded.");
      return;
    }
    const data = await response.json();
    setPlayground(data.playground);
    setImages(data.images);
    setAssets(data.assets || []);
  };
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      if (playgroundId === "new") {
        const response = await fetch(
          `/api/workspace/${workspaceId}/ads-marketing/playgrounds`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Untitled Playground" }),
          },
        );
        if (!response.ok || cancelled) {
          setError("Could not create the playground.");
          return;
        }
        const data = await response.json();
        router.replace(
          `/workspace/${workspaceId}/ads-marketing/playground/${data.playground.id}${imageAdMode ? "?mode=image-ad" : ""}`,
        );
        return;
      }
      await load(playgroundId);
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, playgroundId, imageAdMode]);
  const visibleImages = useMemo(
    () =>
      filter === "favorites"
        ? images.filter((image) => image.isFavorite)
        : images,
    [images, filter],
  );
  const handleReference = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setReferenceImage(await fileToDataUrl(file));
  };
  const uploadAsset = async (file?: File) => {
    if (!playground || !file || !file.type.startsWith("image/")) return;
    const assetUrl = await fileToDataUrl(file);
    const response = await fetch(
      `/api/workspace/${workspaceId}/ads-marketing/playgrounds/${playground.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_asset",
          name: file.name,
          assetUrl,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Asset upload failed.");
      return;
    }
    setAssets((current) => [data.asset, ...current]);
  };
  const toggleAsset = async (asset: PlaygroundAsset) => {
    const selected = !asset.selected;
    setAssets((current) =>
      current.map((item) =>
        item.id === asset.id ? { ...item, selected } : item,
      ),
    );
    await fetch(
      `/api/workspace/${workspaceId}/ads-marketing/playgrounds/${playgroundId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "asset_selection",
          assetId: asset.id,
          selected,
        }),
      },
    );
  };
  const generate = async () => {
    if (!playground || !prompt.trim()) return;
    setBusy(true);
    setError("");
    try {
      for (let index = 0; index < count; index += 1) {
        let response: Response;
        try {
          response = await fetch(
            `/api/workspace/${workspaceId}/ads-marketing/playgrounds/${playground.id}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt,
                referenceImage,
                aspectRatio,
                resolution,
                assetIds: assets
                  .filter((asset) => asset.selected)
                  .map((asset) => asset.id),
              }),
            },
          );
        } catch {
          setError(
            "Could not connect to the image generation server. Please check that Falbor is running and try again.",
          );
          break;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || "Image generation failed.");
          break;
        }
        if (data.image) setImages((current) => [data.image, ...current]);
      }
    } finally {
      setBusy(false);
    }
  };
  const toggleFavorite = async (image: PlaygroundImage) => {
    const next = !image.isFavorite;
    setImages((current) =>
      current.map((item) =>
        item.id === image.id ? { ...item, isFavorite: next } : item,
      ),
    );
    await fetch(
      `/api/workspace/${workspaceId}/ads-marketing/playgrounds/${playgroundId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id, isFavorite: next }),
      },
    );
  };
  if (!playground)
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        {error || "Loading playground..."}
      </div>
    );
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="h-13 border-b border-gray-200 dark:border-[#26262b] min-h-[48px] flex items-center justify-between px-3 gap-2 bg-transparent">
        <div>
          <div className="text-[10px] text-gray-500">
            Ads Marketing / Playground
          </div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            {playground.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/workspace/${workspaceId}/ads-marketing`)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300"
        >
          Back to Ads Marketing
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 p-5 dark:border-gray-800 lg:w-[390px] lg:border-b-0 lg:border-r">
          {imageAdMode && <AdServiceContext workspaceId={workspaceId} />}
          <div className="mb-4 flex rounded-lg border border-gray-200 p-1 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setAssetsOpen(false)}
              className={`flex-1 rounded-md py-2 text-xs font-medium text-gray-900 dark:text-white ${!assetsOpen ? "bg-gray-100 dark:bg-gray-800" : "text-gray-500 dark:text-gray-400"}`}
            >
              <i className="i-ph:image mr-1 inline-block" />
              Images
            </button>
            <button
              type="button"
              onClick={() => setAssetsOpen(true)}
              className={`flex-1 rounded-md py-2 text-xs font-medium text-gray-900 dark:text-white ${assetsOpen ? "bg-gray-100 dark:bg-gray-800" : "text-gray-500 dark:text-gray-400"}`}
            >
              <i className="i-ph:stack mr-1 inline-block" />
              Assets
            </button>
          </div>
          {assetsOpen ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Brand assets
                  </h2>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Selected assets are used automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => assetInputRef.current?.click()}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
                >
                  Upload
                </button>
              </div>
              <input
                ref={assetInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => uploadAsset(event.target.files?.[0])}
              />
              <div className="space-y-2">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleAsset(asset)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left ${asset.selected ? "border-gray-400 dark:border-gray-600" : "border-gray-200 opacity-60 dark:border-gray-800"}`}
                  >
                    <img
                      src={asset.assetUrl}
                      alt={asset.name}
                      className="h-10 w-10 rounded-md object-contain bg-gray-50 dark:bg-gray-800"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-gray-900 dark:text-white">
                        {asset.name}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {asset.source === "website"
                          ? "From your website"
                          : "Uploaded asset"}
                      </span>
                    </span>
                    <i
                      className={
                        asset.selected
                          ? "i-ph:check-circle-fill text-green-500"
                          : "i-ph:circle text-gray-400"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-3 flex h-20 items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 text-left text-gray-900 dark:border-gray-700 dark:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <i className="i-ph:image-square text-lg" />
                </span>
                <span>
                  <span className="block text-xs font-medium text-gray-900 dark:text-white">
                    Add reference image
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    Use an image for visual direction
                  </span>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleReference(event.target.files?.[0])}
              />
              {referenceImage && (
                <div className="relative mb-3 h-24 overflow-hidden rounded-lg">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>
              )}
              <label className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                Describe your visual
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the product ad you want to create..."
                className="min-h-36 resize-none rounded-xl border border-gray-200 bg-transparent p-3 text-sm outline-none focus:border-gray-400 dark:border-gray-800 dark:text-white"
                maxLength={4500}
              />
              <div className="mt-4">
                <Tooltip
                  content="More image models will be available soon. This playground currently uses the configured model."
                  side="right"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-3 text-left text-gray-900 dark:border-gray-800 dark:text-white"
                  >
                    <span>
                      <span className="block text-[11px] text-gray-500">
                        AI Model
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {playground.model}
                      </span>
                    </span>
                    <i className="i-ph:caret-right text-gray-400" />
                  </button>
                </Tooltip>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
                    >
                      {aspectRatio}
                      <i className="i-ph:caret-up-down" />
                    </button>
                  }
                  side="top"
                  align="start"
                >
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {aspectRatios.map((value) => (
                      <DropdownItem
                        key={value}
                        onSelect={() => setAspectRatio(value)}
                      >
                        {value}
                      </DropdownItem>
                    ))}
                  </div>
                </Dropdown>
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
                    >
                      {resolution}
                      <i className="i-ph:caret-up-down" />
                    </button>
                  }
                  side="top"
                  align="start"
                >
                  <div className="p-1">
                    {resolutions.map((value) => (
                      <DropdownItem
                        key={value}
                        onSelect={() => setResolution(value)}
                      >
                        {value}
                      </DropdownItem>
                    ))}
                  </div>
                </Dropdown>
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
                    >
                      {count}
                      <i className="i-ph:caret-up-down" />
                    </button>
                  }
                  side="top"
                  align="end"
                >
                  <div className="p-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <DropdownItem key={value} onSelect={() => setCount(value)}>
                        {value} {value === 1 ? "image" : "images"}
                      </DropdownItem>
                    ))}
                  </div>
                </Dropdown>
              </div>
              {error && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={busy || !prompt.trim()}
                onClick={generate}
                className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900"
              >
                {busy ? (
                  <i className="i-ph:spinner-gap animate-spin" />
                ) : (
                  <i className="i-ph:sparkle" />
                )}
                Generate · {25 * count} credits
              </button>
            </>
          )}
        </aside>
        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Playground Marketing
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Images generated in this Playground.
              </p>
            </div>
            <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setFilter("images")}
                className={`rounded-md px-3 py-1.5 text-xs text-gray-900 dark:text-white ${filter === "images" ? "bg-gray-100 font-medium dark:bg-gray-800" : "text-gray-500 dark:text-gray-400"}`}
              >
                Image
              </button>
              <button
                type="button"
                onClick={() => setFilter("favorites")}
                className={`rounded-md px-3 py-1.5 text-xs text-gray-900 dark:text-white ${filter === "favorites" ? "bg-gray-100 font-medium dark:bg-gray-800" : "text-gray-500 dark:text-gray-400"}`}
              >
                <i className="i-ph:heart mr-1 inline-block" />
                Favorites
              </button>
            </div>
          </div>
          {visibleImages.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleImages.map((image) => (
                <div
                  key={image.id}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={image.prompt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={() => toggleFavorite(image)}
                      className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm"
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={image.isFavorite ? "currentColor" : "none"}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                      {image.prompt}
                    </p>
                    <div className="mt-2 text-[10px] text-gray-400">
                      {image.aspectRatio} · {image.resolution}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
              <div className="text-center">
                <i className="i-ph:images text-4xl text-gray-300 dark:text-gray-700" />
                <p className="mt-3 text-sm font-medium text-gray-500">
                  Start creating
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Your images will appear here
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
