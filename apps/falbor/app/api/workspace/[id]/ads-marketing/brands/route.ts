import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { adBrandDna } from "~/lib/db/schema";
import { requireWorkspaceActor } from "~/lib/agents/authorization";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireWorkspaceActor(params.id);
  const brands = await db.select().from(adBrandDna).where(eq(adBrandDna.workspaceId, params.id)).orderBy(desc(adBrandDna.updatedAt));
  return NextResponse.json({ brands });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  if (typeof body.serviceId !== "string" || typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "Service and brand name are required." }, { status: 400 });
  const [brand] = await db.insert(adBrandDna).values({ workspaceId: params.id, userId: actor.user.id, serviceId: body.serviceId, name: body.name.trim().slice(0, 160), websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl.trim().slice(0, 1000) : null, logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : null, colors: Array.isArray(body.colors) ? body.colors.filter((x: unknown): x is string => typeof x === "string").slice(0, 8) : [], fonts: Array.isArray(body.fonts) ? body.fonts.filter((x: unknown): x is string => typeof x === "string").slice(0, 8) : [] }).returning();
  return NextResponse.json({ brand }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "Brand id is required." }, { status: 400 });
  const [brand] = await db.update(adBrandDna).set({ isActive: typeof body.isActive === "boolean" ? body.isActive : undefined, updatedAt: new Date() }).where(and(eq(adBrandDna.id, body.id), eq(adBrandDna.workspaceId, params.id), eq(adBrandDna.userId, actor.user.id))).returning();
  return brand ? NextResponse.json({ brand }) : NextResponse.json({ error: "Brand not found." }, { status: 404 });
}
