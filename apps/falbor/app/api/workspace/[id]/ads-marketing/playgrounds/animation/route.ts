import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspaceActor } from "~/lib/agents/authorization";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "~/lib/db";
import { adAnimationVideos } from "~/lib/db/schema";

export const dynamic = "force-dynamic";

const terminalFailureStatuses = new Set(["failed", "cancelled", "expired"]);

const videoModels = new Set([
  "google/veo-3.1-lite",
  "alibaba/wan-3.0",
  "bytedance/seedance-2.0-fast",
]);

const mageVideoModels = new Set([
  "mage:ltx_video:ltx-video-096-distilled",
]);

const modelMinimumDurations: Record<string, number> = {
  "google/veo-3.1-lite": 4,
  "alibaba/wan-3.0": 2,
  "bytedance/seedance-2.0-fast": 4,
  "mage:ltx_video:ltx-video-096-distilled": 2,
};

type MageJob = {
  provider: "mage";
  requestId: string;
  statusUrl: string;
  resultUrl?: string;
};

function encodeMageJob(job: MageJob) {
  return `mage:${encodeURIComponent(JSON.stringify(job))}`;
}

function decodeMageJob(value: string): MageJob | null {
  if (!value.startsWith("mage:")) return null;
  try {
    const job = JSON.parse(decodeURIComponent(value.slice(5))) as MageJob;
    if (
      job.provider !== "mage" ||
      typeof job.requestId !== "string" ||
      typeof job.statusUrl !== "string"
    ) {
      return null;
    }
    return job;
  } catch {
    return null;
  }
}

function providerMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const error = value as { message?: unknown; code?: unknown; type?: unknown };
    const message = typeof error.message === "string" ? error.message : JSON.stringify(value);
    const code = error.code ? ` (${String(error.code)})` : "";
    return `${message}${code}`;
  }
  return fallback;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireWorkspaceActor(params.id);
    const searchParams = new URL(request.url).searchParams;
    const jobId = searchParams.get("jobId");
    const animationId = searchParams.get("animationId");
    const statusRequest = searchParams.get("status") === "1";
    const downloadRequest = searchParams.get("download") === "1";
    if (animationId) {
      const history = await db
        .select()
        .from(adAnimationVideos)
        .where(
          and(
            eq(adAnimationVideos.workspaceId, params.id),
            eq(adAnimationVideos.userId, actor.user.id),
            eq(adAnimationVideos.animationId, animationId),
          ),
        )
        .orderBy(desc(adAnimationVideos.createdAt));
      return NextResponse.json({ history });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    const mageApiKey = process.env.MAGE_API_KEY;
    const mageJob = jobId ? decodeMageJob(jobId) : null;
    if (!jobId || (!mageJob && !apiKey) || (mageJob && !mageApiKey)) {
      return NextResponse.json({ error: "Video is unavailable." }, { status: 400 });
    }
    const ownedVideo = await db
      .select({ id: adAnimationVideos.id })
      .from(adAnimationVideos)
      .where(
        and(
          eq(adAnimationVideos.workspaceId, params.id),
          eq(adAnimationVideos.userId, actor.user.id),
          eq(adAnimationVideos.providerJobId, jobId),
        ),
      )
      .limit(1);
    if (!ownedVideo.length) {
      return NextResponse.json({ error: "Video is unavailable." }, { status: 404 });
    }
    if (statusRequest) {
      const statusResponse = mageJob
        ? await fetch(mageJob.statusUrl, {
            headers: { Authorization: `Bearer ${mageApiKey}` },
          })
        : await fetch(
            `https://openrouter.ai/api/v1/videos/${encodeURIComponent(jobId)}`,
            { headers: { Authorization: `Bearer ${apiKey}` } },
          );
      const status = await statusResponse.json().catch(() => ({}));
      if (!statusResponse.ok) {
        return NextResponse.json(
          {
            error: providerMessage(
              status?.error || status?.message,
              `OpenRouter status lookup failed (HTTP ${statusResponse.status}).`,
            ),
          },
          { status: 502 },
        );
      }
      const resultUrl = mageJob ? status.result?.url : status.unsigned_urls?.[0];
      if (status.status === "completed" && resultUrl) {
        const completedJobId = mageJob
          ? encodeMageJob({ ...mageJob, resultUrl })
          : jobId;
        await db
          .update(adAnimationVideos)
          .set({ status: "completed", providerJobId: completedJobId })
          .where(
            and(
              eq(adAnimationVideos.workspaceId, params.id),
              eq(adAnimationVideos.userId, actor.user.id),
              eq(adAnimationVideos.providerJobId, jobId),
            ),
          );
        return NextResponse.json({
          status: "completed",
          videoUrl: `/api/workspace/${params.id}/ads-marketing/playgrounds/animation?jobId=${encodeURIComponent(completedJobId)}`,
        });
      }
      if (terminalFailureStatuses.has(status.status)) {
        await db
          .update(adAnimationVideos)
          .set({ status: status.status })
          .where(
            and(
              eq(adAnimationVideos.workspaceId, params.id),
              eq(adAnimationVideos.userId, actor.user.id),
              eq(adAnimationVideos.providerJobId, jobId),
            ),
          );
        return NextResponse.json({
          status: status.status,
          error: providerMessage(status.error, `Animation generation ${status.status}.`),
        });
      }
      return NextResponse.json({ status: status.status || "in_progress" });
    }
    const range = request.headers.get("range");
    const contentUrl = mageJob?.resultUrl
      ? mageJob.resultUrl
      : `https://openrouter.ai/api/v1/videos/${encodeURIComponent(jobId)}/content?index=0`;
    const response = await fetch(contentUrl, {
      headers: {
        ...(mageJob ? {} : { Authorization: `Bearer ${apiKey}` }),
        ...(range ? { Range: range } : {}),
      },
    });
    if (!response.ok || !response.body) {
      const providerBody = await response.text().catch(() => "");
      const message = providerMessage(
        providerBody,
        `The generated video could not be downloaded (HTTP ${response.status}).`,
      );
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("content-type") || "video/mp4");
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("Accept-Ranges", response.headers.get("accept-ranges") || "bytes");
    if (downloadRequest) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="falbor-animation-${jobId}.mp4"`,
      );
    }
    for (const name of ["content-length", "content-range"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    console.error("Animation content request failed", {
      workspaceId: params.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "The generated video could not be loaded. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  if (typeof body.image !== "string" || !body.image.startsWith("data:image/")) return NextResponse.json({ error: "Upload an image first." }, { status: 400 });
  const duration = [2, 4, 6, 8].includes(body.duration) ? body.duration : 2;
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const configuredModel = process.env.OPENROUTER_VIDEO_MODEL;
  const model = videoModels.has(requestedModel) || mageVideoModels.has(requestedModel)
    ? requestedModel
    : configuredModel && videoModels.has(configuredModel)
      ? configuredModel
      : "alibaba/wan-3.0";
  const isMage = mageVideoModels.has(model);
  const minimumDuration = modelMinimumDurations[model] || 2;
  if (duration < minimumDuration) {
    return NextResponse.json(
      {
        error: `${model} requires a video duration of at least ${minimumDuration} seconds.`,
      },
      { status: 400 },
    );
  }
  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json(
      { error: "Describe the animation first." },
      { status: 400 },
    );
  }
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const mageApiKey = process.env.MAGE_API_KEY;
    if (isMage && !mageApiKey) throw new Error("MAGE_API_KEY is not configured.");
    if (!isMage && !apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
    if (typeof body.animationId === "string") {
      const activeJobs = await db
        .select({ providerJobId: adAnimationVideos.providerJobId })
        .from(adAnimationVideos)
        .where(
          and(
            eq(adAnimationVideos.workspaceId, params.id),
            eq(adAnimationVideos.userId, actor.user.id),
            eq(adAnimationVideos.animationId, body.animationId),
            inArray(adAnimationVideos.status, ["pending", "in_progress"]),
          ),
        )
        .limit(1);
      if (activeJobs[0]) {
        return NextResponse.json(
          { jobId: activeJobs[0].providerJobId, status: "in_progress", existing: true },
          { status: 202 },
        );
      }
    }
    const design = body.design === "pixel" ? "pixel" : "realistic";
    const designPrompt =
      design === "pixel"
        ? "Use a polished pixel-art game style with crisp hard-edged pixels, deliberate limited-color shading, clear readable silhouettes, and smooth game-like motion. Do not blur, smooth, or photorealistically reinterpret the subject."
        : "Use a polished realistic animation style with natural motion, physically coherent lighting, and clean professional detail.";
    const backgroundPrompt = body.includeBackground
      ? "Keep the original background unchanged."
      : "Do not add a scene, room, floor, horizon, shadows, color wash, white backdrop, black backdrop, or replacement background. Keep the subject isolated and preserve transparency when the selected provider supports alpha. Keep the area around the subject visually empty rather than inventing an environment.";
    const prompt = `${body.prompt.trim()}. Preserve the original subject, identity, shape, colors, linework, and visual quality. ${designPrompt} ${backgroundPrompt} Animate with intentional, noticeable movement while preserving the reference design and avoiding random extra objects, text, logos, or characters.`;
    const response = isMage
      ? await fetch("https://api.mage.space/v1/ltx_video/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mageApiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            prompt,
            aspect_ratio: "1:1",
            resolution: "480p",
            duration: String(duration),
            model_id: "ltx-video-096-distilled",
            first_image: body.image,
          }),
        })
      : await fetch("https://openrouter.ai/api/v1/videos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "Falbor Image to Animation",
          },
          body: JSON.stringify({
            model,
            prompt,
            duration,
            resolution: "720p",
            frame_images: [
              {
                type: "image_url",
                image_url: { url: body.image },
                frame_type: "first_frame",
              },
            ],
            generate_audio: false,
          }),
        });
    const task = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        providerMessage(
          task?.error || task?.message,
          `${isMage ? "Mage" : "OpenRouter"} rejected the animation request (HTTP ${response.status}).`,
        ),
      );
    }
    if (isMage && (!task?.request_id || !task?.status_url)) {
      throw new Error("Mage did not return a valid animation request.");
    }
    if (!isMage && !task?.id) throw new Error("OpenRouter did not return a video task ID.");
    const providerJobId = isMage
      ? encodeMageJob({
          provider: "mage",
          requestId: task.request_id,
          statusUrl: task.status_url,
        })
      : task.id;
    const animationId = typeof body.animationId === "string" ? body.animationId : task.request_id || task.id;
    await db.insert(adAnimationVideos).values({
      animationId,
      workspaceId: params.id,
      userId: actor.user.id,
      prompt: body.prompt.trim(),
      providerJobId,
      duration,
      includeBackground: body.includeBackground === true,
      status: task.status || "pending",
    });
    return NextResponse.json({ jobId: providerJobId, status: task.status || "pending" }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : providerMessage(error, "Animation generation failed.");
    console.error("Animation generation failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
