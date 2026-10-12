import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { stayupProjects, users } from "~/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserId } from "~/lib/auth";
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await db.query.stayupProjects.findMany({
      where: eq(stayupProjects.userId, userId),
      orderBy: [desc(stayupProjects.createdAt)],
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("[StayUp Projects GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate a secure API Key
    const apiKey = `su_${crypto.randomUUID().replace(/-/g, '')}`;

    const newProject = await db.insert(stayupProjects).values({
      userId: userId,
      name: body.name,
      apiKey: apiKey,
    }).returning();

    return NextResponse.json({ success: true, project: newProject[0] });
  } catch (error) {
    console.error("[StayUp Projects POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
