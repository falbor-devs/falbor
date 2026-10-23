import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { adServices } from "~/lib/db/schema";
import { requireWorkspaceActor } from "~/lib/agents/authorization";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireWorkspaceActor(params.id);
  const services = await db.select().from(adServices)
    .where(eq(adServices.workspaceId, params.id)).orderBy(desc(adServices.updatedAt));
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : null;
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 1000) : null;
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.startsWith("data:image/") ? body.imageUrl : null;
  if (!name) return NextResponse.json({ error: "A service name is required." }, { status: 400 });
  const [service] = await db.insert(adServices).values({ workspaceId: params.id, userId: actor.user.id, name, description, sourceUrl, imageUrl }).returning();
  return NextResponse.json({ service }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await requireWorkspaceActor(params.id, "editor");
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string") return NextResponse.json({ error: "Service id is required." }, { status: 400 });
  const updates: Partial<typeof adServices.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") updates.name = body.name.trim().slice(0, 160);
  if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 2000);
  const [service] = await db.update(adServices).set(updates).where(and(eq(adServices.id, body.id), eq(adServices.workspaceId, params.id), eq(adServices.userId, actor.user.id))).returning();
  return service ? NextResponse.json({ service }) : NextResponse.json({ error: "Service not found." }, { status: 404 });
}
