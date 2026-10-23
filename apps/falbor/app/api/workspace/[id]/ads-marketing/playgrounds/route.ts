import { NextResponse, type NextRequest } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "~/lib/db";
import {
  adPlaygroundAssets,
  adPlaygroundImages,
  adPlaygrounds,
  workspaceProductProfiles,
} from "~/lib/db/schema";
import { requireWorkspaceActor } from "~/lib/agents/authorization";

export const dynamic = "force-dynamic";

async function discoverWebsiteAssets(domain: string) {
  let logoUrl = `https://${domain}/apple-touch-icon.png`;
  let faviconUrl = `https://${domain}/favicon.ico`;
  try {
    const response = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const html = await response.text();
      const resolve = (value: string) =>
        new URL(value, `https://${domain}`).toString();
      const logoMatch =
        html.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
        ) ||
        html.match(
          /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)/i,
        );
      const faviconMatch = html.match(
        /<link[^>]+rel=["'][^"']*(?:icon|shortcut icon)[^"']*["'][^>]+href=["']([^"']+)/i,
      );
      if (logoMatch?.[1]) logoUrl = resolve(logoMatch[1]);
      if (faviconMatch?.[1]) faviconUrl = resolve(faviconMatch[1]);
    }
  } catch {}
  return { logoUrl, faviconUrl };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  await requireWorkspaceActor(params.id);
  const playgrounds = await db
    .select()
    .from(adPlaygrounds)
    .where(eq(adPlaygrounds.workspaceId, params.id))
    .orderBy(desc(adPlaygrounds.updatedAt));
  const images = playgrounds.length
    ? await db
        .select({ playgroundId: adPlaygroundImages.playgroundId, imageUrl: adPlaygroundImages.imageUrl })
        .from(adPlaygroundImages)
        .where(inArray(adPlaygroundImages.playgroundId, playgrounds.map((playground) => playground.id)))
        .orderBy(desc(adPlaygroundImages.createdAt))
    : [];
  const previewImages = images.reduce<Record<string, string[]>>((result, image) => {
    const current = result[image.playgroundId] || [];
    if (current.length < 3) result[image.playgroundId] = [...current, image.imageUrl];
    return result;
  }, {});
  return NextResponse.json({ playgrounds, previewImages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : "Untitled Playground";
  const [playground] = await db
    .insert(adPlaygrounds)
    .values({
      workspaceId: params.id,
      userId: actor.user.id,
      name,
      model: "gpt-image-1",
    })
    .returning();
  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (table, helpers) => helpers.eq(table.workspaceId, params.id),
  });
  const domain = profile?.domain
    ?.replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();
  if (domain) {
    const { logoUrl, faviconUrl } = await discoverWebsiteAssets(domain);
    await db.insert(adPlaygroundAssets).values([
      {
        playgroundId: playground.id,
        workspaceId: params.id,
        userId: actor.user.id,
        name: "Website logo",
        kind: "logo",
        source: "website",
        assetUrl: logoUrl,
        selected: true,
      },
      {
        playgroundId: playground.id,
        workspaceId: params.id,
        userId: actor.user.id,
        name: "Website favicon",
        kind: "favicon",
        source: "website",
        assetUrl: faviconUrl,
        selected: true,
      },
    ]);
  }
  return NextResponse.json({ playground }, { status: 201 });
}
