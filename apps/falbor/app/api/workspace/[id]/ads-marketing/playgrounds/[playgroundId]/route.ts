import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { db } from "~/lib/db";
import {
  adPlaygroundAssets,
  adPlaygroundImages,
  adPlaygrounds,
  users,
} from "~/lib/db/schema";
import { requireWorkspaceActor } from "~/lib/agents/authorization";

export const dynamic = "force-dynamic";
const IMAGE_COST = 25;

function imageDimensions(aspectRatio: string) {
  const dimensions: Record<string, string> = {
    "1:1": "1024x1024",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "4:3": "1536x1024",
    "3:4": "1024x1536",
    "4:5": "1024x1536",
    "9:16": "1024x1536",
    "16:9": "1536x1024",
    "21:9": "1536x1024",
  };
  return dimensions[aspectRatio] || dimensions["1:1"];
}

async function getPlayground(workspaceId: string, playgroundId: string) {
  return db.query.adPlaygrounds.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, playgroundId),
        helpers.eq(table.workspaceId, workspaceId),
      ),
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; playgroundId: string } },
) {
  await requireWorkspaceActor(params.id);
  const playground = await getPlayground(params.id, params.playgroundId);
  if (!playground)
    return NextResponse.json(
      { error: "Playground not found" },
      { status: 404 },
    );
  const [images, assets] = await Promise.all([
    db
      .select()
      .from(adPlaygroundImages)
      .where(
        and(
          eq(adPlaygroundImages.playgroundId, playground.id),
          eq(adPlaygroundImages.workspaceId, params.id),
        ),
      )
      .orderBy(desc(adPlaygroundImages.createdAt)),
    db
      .select()
      .from(adPlaygroundAssets)
      .where(
        and(
          eq(adPlaygroundAssets.playgroundId, playground.id),
          eq(adPlaygroundAssets.workspaceId, params.id),
        ),
      )
      .orderBy(desc(adPlaygroundAssets.createdAt)),
  ]);
  return NextResponse.json({ playground, images, assets });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; playgroundId: string } },
) {
  await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  const playground = await getPlayground(params.id, params.playgroundId);
  if (!playground)
    return NextResponse.json(
      { error: "Playground not found" },
      { status: 404 },
    );
  if (
    body.action === "asset_selection" &&
    typeof body.assetId === "string" &&
    typeof body.selected === "boolean"
  ) {
    const result = await db
      .update(adPlaygroundAssets)
      .set({ selected: body.selected })
      .where(
        and(
          eq(adPlaygroundAssets.id, body.assetId),
          eq(adPlaygroundAssets.playgroundId, playground.id),
          eq(adPlaygroundAssets.workspaceId, params.id),
        ),
      )
      .returning({ id: adPlaygroundAssets.id });
    if (!result.length)
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (
    typeof body.imageId === "string" &&
    typeof body.isFavorite === "boolean"
  ) {
    const result = await db
      .update(adPlaygroundImages)
      .set({ isFavorite: body.isFavorite })
      .where(
        and(
          eq(adPlaygroundImages.id, body.imageId),
          eq(adPlaygroundImages.playgroundId, playground.id),
          eq(adPlaygroundImages.workspaceId, params.id),
        ),
      )
      .returning({ id: adPlaygroundImages.id });
    if (!result.length)
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { error: "Invalid playground update" },
    { status: 400 },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; playgroundId: string } },
) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const playground = await getPlayground(params.id, params.playgroundId);
  if (!playground)
    return NextResponse.json(
      { error: "Playground not found" },
      { status: 404 },
    );
  const body = await request.json().catch(() => ({}));
  if (body.action === "upload_asset") {
    const assetUrl = typeof body.assetUrl === "string" ? body.assetUrl : "";
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 120)
        : "Uploaded asset";
    if (!assetUrl.startsWith("data:image/"))
      return NextResponse.json(
        { error: "Upload a valid image asset" },
        { status: 400 },
      );
    if (assetUrl.length > 12_000_000)
      return NextResponse.json(
        { error: "Asset is too large. Use an image smaller than 9 MB." },
        { status: 413 },
      );
    const [asset] = await db
      .insert(adPlaygroundAssets)
      .values({
        playgroundId: playground.id,
        workspaceId: params.id,
        userId: actor.user.id,
        name,
        kind: "uploaded",
        source: "user",
        assetUrl,
        selected: true,
      })
      .returning();
    return NextResponse.json({ asset }, { status: 201 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const aspectRatio =
    typeof body.aspectRatio === "string" ? body.aspectRatio : "1:1";
  const resolution =
    typeof body.resolution === "string" ? body.resolution : "1K";
  const referenceImage =
    typeof body.referenceImage === "string" ? body.referenceImage : null;
  const assetIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter(
        (value: unknown): value is string => typeof value === "string",
      )
    : [];
  if (!prompt)
    return NextResponse.json(
      { error: "Describe the image you want to create" },
      { status: 400 },
    );
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      { error: "Image generation is not configured on the server." },
      { status: 503 },
    );
  const charged = await db
    .update(users)
    .set({ balance: sql`${users.balance} - ${IMAGE_COST}` })
    .where(and(eq(users.id, actor.user.id), gte(users.balance, IMAGE_COST)))
    .returning({ id: users.id });
  if (!charged.length)
    return NextResponse.json(
      { error: "Not enough credits. Each image costs 25 credits." },
      { status: 402 },
    );
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const assets = assetIds.length
      ? await db
          .select()
          .from(adPlaygroundAssets)
          .where(
            and(
              eq(adPlaygroundAssets.playgroundId, playground.id),
              eq(adPlaygroundAssets.workspaceId, params.id),
              inArray(adPlaygroundAssets.id, assetIds),
            ),
          )
      : [];
    const enhancedPrompt = `Create a polished, professional product advertisement visual for the user's product. ${prompt}. Use the supplied brand assets naturally where appropriate, preserving their identity and proportions. No UI chrome, no watermarks, no fake logos, and no text unless explicitly requested. Aspect ratio: ${aspectRatio}.`;
    const referencePayload = referenceImage?.startsWith("data:")
      ? referenceImage.split(",")[1]
      : null;
    const assetFiles = await Promise.all(
      assets.map(async (asset) => {
        try {
          const response = await fetch(asset.assetUrl);
          if (!response.ok) return null;
          return toFile(
            Buffer.from(await response.arrayBuffer()),
            `${asset.kind}.png`,
            { type: response.headers.get("content-type") || "image/png" },
          );
        } catch {
          return null;
        }
      }),
    );
    const references = [
      referencePayload
        ? await toFile(
            Buffer.from(referencePayload, "base64"),
            "reference.png",
            { type: "image/png" },
          )
        : null,
      ...assetFiles,
    ].filter(Boolean);
    const imageResponse = references.length
      ? await client.images.edit({
          model: playground.model,
          image: references as any,
          prompt: enhancedPrompt,
          size: imageDimensions(aspectRatio) as any,
          n: 1,
        })
      : await client.images.generate({
          model: playground.model,
          prompt: enhancedPrompt,
          size: imageDimensions(aspectRatio) as any,
          n: 1,
        });
    const imageData = imageResponse.data?.[0];
    const imageUrl = imageData?.b64_json
      ? `data:image/png;base64,${imageData.b64_json}`
      : imageData?.url;
    if (!imageUrl) throw new Error("The image provider returned no image");
    const [image] = await db
      .insert(adPlaygroundImages)
      .values({
        playgroundId: playground.id,
        workspaceId: params.id,
        userId: actor.user.id,
        prompt,
        referenceImage,
        imageUrl,
        aspectRatio,
        resolution,
      })
      .returning();
    await db
      .update(adPlaygrounds)
      .set({ updatedAt: new Date() })
      .where(eq(adPlaygrounds.id, playground.id));
    return NextResponse.json({ image });
  } catch (error) {
    await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${IMAGE_COST}` })
      .where(eq(users.id, actor.user.id));
    const providerMessage =
      error instanceof Error
        ? error.message
            .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
            .slice(0, 240)
        : "Unknown image provider error";
    console.error("Ads playground image generation failed", {
      workspaceId: params.id,
      playgroundId: params.playgroundId,
      error: providerMessage,
    });
    return NextResponse.json(
      {
        error: `Image generation failed: ${providerMessage}. Your 25 credits were returned.`,
      },
      { status: 502 },
    );
  }
}
