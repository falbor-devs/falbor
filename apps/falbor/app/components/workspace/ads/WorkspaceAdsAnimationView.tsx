"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";

const durations = [2, 4, 6, 8];
const videoModels = [
  {
    id: "alibaba/wan-3.0",
    name: "Wan 3.0",
    detail: "Low cost · supports 2 seconds",
    minimumDuration: 2,
  },
  {
    id: "bytedance/seedance-2.0-fast",
    name: "Seedance 2.0 Fast",
    detail: "Fast motion · low cost",
    minimumDuration: 4,
  },
  {
    id: "google/veo-3.1-lite",
    name: "Veo 3.1 Lite",
    detail: "Higher fidelity · 4–8 seconds",
    minimumDuration: 4,
  },
  {
    id: "mage:ltx_video:ltx-video-096-distilled",
    name: "Mage · LTX Video",
    detail: "Low cost · open-weights video",
    minimumDuration: 2,
  },
];
const designs = [
  {
    id: "pixel",
    name: "Pixel game",
    detail: "Crisp, game-like motion",
    preview: "/icons/pets/Image2.png",
  },
  {
    id: "realistic",
    name: "Realistic",
    detail: "Natural lighting and movement",
    preview: null,
  },
];
type AnimationHistory = {
  id: string;
  providerJobId: string;
  prompt: string;
  duration: number;
  includeBackground: boolean;
  status: string;
  createdAt: string;
};

export function WorkspaceAdsAnimationView({
  workspaceId,
  animationId,
}: {
  workspaceId: string;
  animationId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(2);
  const [includeBackground, setIncludeBackground] = useState(false);
  const [model, setModel] = useState(videoModels[0].id);
  const [design, setDesign] = useState("pixel");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AnimationHistory[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const settingsKey = `falbor:animation-settings:${workspaceId}:${animationId}`;

  const loadHistory = async () => {
    const response = await fetch(
      `/api/workspace/${workspaceId}/ads-marketing/playgrounds/animation?animationId=${encodeURIComponent(animationId)}`,
    );
    if (!response.ok) return;
    const nextHistory = (await response.json()).history || [];
    setHistory(nextHistory);
    const latest = nextHistory[0] as AnimationHistory | undefined;
    if (latest?.status === "completed") {
      setVideoUrl(
        `/api/workspace/${workspaceId}/ads-marketing/playgrounds/animation?jobId=${encodeURIComponent(latest.providerJobId)}`,
      );
    }
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(settingsKey);
      if (saved) {
        const settings = JSON.parse(saved) as {
          duration?: number;
          model?: string;
          design?: string;
          includeBackground?: boolean;
        };
        if ([2, 4, 6, 8].includes(settings.duration || 0)) {
          setDuration(settings.duration as number);
        }
        if (videoModels.some((item) => item.id === settings.model)) {
          setModel(settings.model as string);
        }
        if (designs.some((item) => item.id === settings.design)) {
          setDesign(settings.design as string);
        }
        if (typeof settings.includeBackground === "boolean") {
          setIncludeBackground(settings.includeBackground);
        }
      }
    } catch {
      window.localStorage.removeItem(settingsKey);
    }
    setSettingsLoaded(true);
    void loadHistory();
  }, [settingsKey]);

  useEffect(() => {
    if (!settingsLoaded) return;
    window.localStorage.setItem(
      settingsKey,
      JSON.stringify({ duration, model, design, includeBackground }),
    );
  }, [settingsLoaded, settingsKey, duration, model, design, includeBackground]);

  useEffect(() => {
    const pendingJob = history.find((item) =>
      ["pending", "in_progress"].includes(item.status),
    );
    if (pendingJob) setActiveJobId(pendingJob.providerJobId);
  }, [history]);

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/workspace/${workspaceId}/ads-marketing/playgrounds/animation?jobId=${encodeURIComponent(activeJobId)}&status=1`,
        );
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || "Unable to check animation status.");
        if (data.status === "completed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setActiveJobId(null);
          await loadHistory();
          return;
        }
        if (["failed", "cancelled", "expired"].includes(data.status)) {
          setError(data.error || `Animation generation ${data.status}.`);
          setActiveJobId(null);
          await loadHistory();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to check animation status.");
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId, workspaceId]);

  const selectDuration = (value: number) => {
    if (value === 2) {
      const selectedModel = videoModels.find((item) => item.id === model);
      if (selectedModel && selectedModel.minimumDuration > 2) {
        setModel("alibaba/wan-3.0");
      }
    }
    setDuration(value);
  };

  const selectModel = (value: string) => {
    const selectedModel = videoModels.find((item) => item.id === value);
    if (selectedModel && duration < selectedModel.minimumDuration) {
      setDuration(selectedModel.minimumDuration);
    }
    setModel(value);
  };

  const readImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const send = async () => {
    if (!image || !prompt.trim() || busy || activeJobId) return;
    setBusy(true);
    setError("");
    setVideoUrl(null);
    try {
      const response = await fetch(
        `/api/workspace/${workspaceId}/ads-marketing/playgrounds/animation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image,
            prompt,
            duration,
            includeBackground,
            model,
            design,
            animationId,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok && response.status !== 202)
        throw new Error(data.error || "Animation generation failed.");
      if (data.jobId) setActiveJobId(data.jobId);
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Animation generation failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <header className="flex min-h-[48px] items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        <div>
          <p className="text-[10px] text-gray-500">
            Ads Marketing / Image to Animation
          </p>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            Untitled Animation Playground
          </h1>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/workspace/${workspaceId}/ads-marketing`)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:text-white"
        >
          Back to Ads Marketing
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-gray-200 p-5 dark:border-gray-800 lg:w-[300px] lg:border-b-0 lg:border-r">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Animation setup
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900"
          >
            {image ? (
              <img
                src={image}
                alt="Source character"
                className="h-full w-full object-contain"
              />
            ) : (
              <span>
                <i className="i-ph:upload-simple mr-2" />
                Upload character image
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => readImage(event.target.files?.[0])}
          />
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Duration
            </label>
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:text-white"
                >
                  {duration} seconds <i className="i-ph:caret-up-down" />
                </button>
              }
              side="bottom"
              align="start"
            >
              <div className="p-1">
                {durations.map((value) => (
                  <DropdownItem
                    key={value}
                    onSelect={() => selectDuration(value)}
                  >
                    {value} seconds
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Design
            </label>
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-900 dark:border-gray-800 dark:text-white"
                >
                  <span>
                    {designs.find((item) => item.id === design)?.name}
                  </span>
                  <i className="i-ph:caret-up-down" />
                </button>
              }
              side="bottom"
              align="start"
            >
              <div className="min-w-56 p-1">
                {designs.map((item) => (
                  <DropdownItem
                    key={item.id}
                    onSelect={() => setDesign(item.id)}
                  >
                    <span className="flex items-center gap-2">
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt=""
                          className="h-8 w-8 rounded-md object-contain"
                        />
                      ) : (
                        <span className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-800" />
                      )}
                      <span className="flex flex-col items-start">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-gray-500">
                        {item.detail}
                      </span>
                      </span>
                    </span>
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Model
            </label>
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-900 dark:border-gray-800 dark:text-white"
                >
                  <span>
                    {videoModels.find((item) => item.id === model)?.name}
                  </span>
                  <i className="i-ph:caret-up-down" />
                </button>
              }
              side="bottom"
              align="start"
            >
              <div className="min-w-56 p-1">
                {videoModels.map((item) => (
                  <DropdownItem
                    key={item.id}
                    onSelect={() => selectModel(item.id)}
                  >
                    <span className="flex flex-col items-start">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-gray-500">
                        {item.detail}
                      </span>
                    </span>
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          </div>
          <button
            type="button"
            onClick={() => setIncludeBackground((value) => !value)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:text-white"
          >
            <span>Include background</span>
            <span
              className={`h-5 w-9 rounded-full p-0.5 ${includeBackground ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-700"}`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white transition-transform ${includeBackground ? "translate-x-4" : "translate-x-0"}`}
              />
            </span>
          </button>
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Animation history
            </p>
            {history.length ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {history.map((item) => {
                  const itemVideoUrl = `/api/workspace/${workspaceId}/ads-marketing/playgrounds/animation?jobId=${encodeURIComponent(item.providerJobId)}`;
                  const itemDownloadUrl = `${itemVideoUrl}&download=1`;
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVideoUrl(itemVideoUrl)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setVideoUrl(itemVideoUrl);
                        }
                      }}
                      className="w-full cursor-pointer rounded-lg border border-gray-200 p-2 text-left hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-900"
                    >
                      <span className="block truncate text-xs text-gray-900 dark:text-white">
                        {item.prompt}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                        <span>
                          {item.duration}s · {item.status} ·{" "}
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        <a
                          href={itemDownloadUrl}
                          download={`falbor-animation-${item.id}.mp4`}
                          aria-disabled={item.status !== "completed"}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (item.status !== "completed") event.preventDefault();
                          }}
                          title="Download MP4"
                          aria-label="Download animation as MP4"
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${item.status !== "completed" ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <i className="i-ph:download-simple text-sm" />
                        </a>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Generated animations will appear here.
              </p>
            )}
          </div>
        </aside>
        <main className="relative flex min-h-0 flex-1 flex-col p-5">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/20">
            {activeJobId ? (
              <div className="flex flex-col items-center justify-center text-center text-gray-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <i className="i-ph:spinner-gap animate-spin text-3xl text-purple-500" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                  Generating your animation
                </p>
                <p className="mt-1 max-w-xs text-xs">
                  The preview will appear here when the video is ready.
                </p>
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                onError={() =>
                  setError(
                    "The animation was generated, but the video could not be played. Try downloading the MP4 and opening it locally.",
                  )
                }
                className="max-h-full max-w-full rounded-xl"
              />
            ) : image ? (
              <img
                src={image}
                alt="Animation source"
                className="max-h-full max-w-full rounded-xl object-contain opacity-70"
              />
            ) : (
              <div className="text-center text-sm text-gray-500">
                <i className="i-ph:film-strip text-4xl" />
                <p className="mt-3">Upload an image to begin animating.</p>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Describe how you want to animate the character..."
              className="min-h-14 w-full resize-none bg-transparent px-2 py-1 text-sm text-gray-900 outline-none dark:text-white"
            />
            <div className="flex items-center justify-between">
              <span className="px-2 text-[11px] text-gray-500">
                {activeJobId
                  ? "Generating animation… This can take a few minutes."
                  : image
                  ? `${duration}s animation · ${includeBackground ? "with" : "without"} background`
                  : "Add an image first"}
              </span>
              <button
                type="button"
                disabled={!image || !prompt.trim() || busy || Boolean(activeJobId)}
                onClick={send}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900"
              >
                {busy || activeJobId ? (
                  <i className="i-ph:spinner-gap animate-spin" />
                ) : (
                  <i className="i-ph:paper-plane-right" />
                )}{" "}
                Send
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </main>
      </div>
    </div>
  );
}
