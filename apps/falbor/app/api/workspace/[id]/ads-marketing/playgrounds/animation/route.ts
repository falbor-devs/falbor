import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspaceActor } from "~/lib/agents/authorization";
import { and, desc, eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { adAnimationVideos } from "~/lib/db/schema";

export const dynamic = "force-dynamic";

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
  const actor = await requireWorkspaceActor(params.id);
  const searchParams = new URL(request.url).searchParams;
  const jobId = searchParams.get("jobId");
  const animationId = searchParams.get("animationId");
  if (animationId) {
    const history = await db.select().from(adAnimationVideos).where(and(eq(adAnimationVideos.workspaceId, params.id), eq(adAnimationVideos.userId, actor.user.id), eq(adAnimationVideos.animationId, animationId))).orderBy(desc(adAnimationVideos.createdAt));
    return NextResponse.json({ history });
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!jobId || !apiKey) return NextResponse.json({ error: "Video is unavailable." }, { status: 400 });
  const response = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}/content?index=0`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok || !response.body) return NextResponse.json({ error: "The generated video could not be downloaded." }, { status: 502 });
  return new Response(response.body, { headers: { "Content-Type": response.headers.get("content-type") || "video/mp4", "Content-Length": response.headers.get("content-length") || "", "Cache-Control": "private, max-age=3600" } });
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
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const statusResponse = await fetch(`https://openrouter.ai/api/v1/videos/${task.id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      const status = await statusResponse.json().catch(() => ({}));
      if (status.status === "completed" && (status.urls?.[0] || status.unsigned_urls?.[0])) {
        const animationId = typeof body.animationId === "string" ? body.animationId : task.id;
        await db.insert(adAnimationVideos).values({ animationId, workspaceId: params.id, userId: actor.user.id, prompt: body.prompt.trim(), providerJobId: task.id, duration, includeBackground: body.includeBackground !== false, status: "completed" });
        return NextResponse.json({ videoUrl: `/api/workspace/${params.id}/ads-marketing/playgrounds/animation?jobId=${encodeURIComponent(task.id)}` });
      }
      if (status.status === "failed" || status.status === "cancelled") throw new Error(providerMessage(status.error, "OpenRouter could not generate this animation."));
    }
    throw new Error("OpenRouter is still processing the animation. Please try again shortly.");
  } catch (error) {
    const message = error instanceof Error ? error.message : providerMessage(error, "Animation generation failed.");
    console.error("Animation generation failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
