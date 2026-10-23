import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspaceActor } from "~/lib/agents/authorization";
import { and, desc, eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { adAnimationVideos } from "~/lib/db/schema";

export const dynamic = "force-dynamic";

const terminalFailureStatuses = new Set(["failed", "cancelled", "expired"]);

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
    if (!jobId || !apiKey) {
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
      const statusResponse = await fetch(
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
      if (status.status === "completed" && status.unsigned_urls?.[0]) {
        await db
          .update(adAnimationVideos)
          .set({ status: "completed" })
          .where(
            and(
              eq(adAnimationVideos.workspaceId, params.id),
              eq(adAnimationVideos.userId, actor.user.id),
              eq(adAnimationVideos.providerJobId, jobId),
            ),
          );
        return NextResponse.json({
          status: "completed",
          videoUrl: `/api/workspace/${params.id}/ads-marketing/playgrounds/animation?jobId=${encodeURIComponent(jobId)}`,
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
    const response = await fetch(
      `https://openrouter.ai/api/v1/videos/${encodeURIComponent(jobId)}/content?index=0`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(range ? { Range: range } : {}),
        },
      },
    );
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
  const duration = [4, 6, 8].includes(body.duration) ? body.duration : 8;
  if (typeof body.prompt !== "string" || !body.prompt.trim()) return NextResponse.json({ error: "Describe the animation first." }, { status: 400 });
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
    const response = await fetch("https://openrouter.ai/api/v1/videos", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", "X-Title": "Falbor Image to Animation" }, body: JSON.stringify({ model: process.env.OPENROUTER_VIDEO_MODEL || "google/veo-3.1-lite", prompt: `${body.prompt.trim()}. Preserve the original subject, identity, shape, colors, linework, and visual quality. ${body.includeBackground ? "Keep the original background unchanged." : "Keep the background clean and still."}`, duration, resolution: "720p", frame_images: [{ type: "image_url", image_url: { url: body.image }, frame_type: "first_frame" }], generate_audio: false }) });
    const task = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(providerMessage(task?.error || task?.message, `OpenRouter rejected the animation request (HTTP ${response.status}).`));
    if (!task?.id) throw new Error("OpenRouter did not return a video task ID.");
    const animationId = typeof body.animationId === "string" ? body.animationId : task.id;
    await db.insert(adAnimationVideos).values({
      animationId,
      workspaceId: params.id,
      userId: actor.user.id,
      prompt: body.prompt.trim(),
      providerJobId: task.id,
      duration,
      includeBackground: body.includeBackground !== false,
      status: task.status || "pending",
    });
    return NextResponse.json({ jobId: task.id, status: task.status || "pending" }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : providerMessage(error, "Animation generation failed.");
    console.error("Animation generation failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
