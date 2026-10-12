import { NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { sourcesInvestigations } from '~/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

// GET all past investigations for the current user
export async function GET(request: Request) {
  const userId = await getUserId(request as unknown as NextRequest);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const investigations = await db
      .select()
      .from(sourcesInvestigations)
      .where(eq(sourcesInvestigations.userId, userId))
      .orderBy(desc(sourcesInvestigations.createdAt))
      .limit(50); // Get latest 50

    return Response.json(investigations);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST create a new investigation record
export async function POST(request: Request) {
  const userId = await getUserId(request as unknown as NextRequest);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    const [record] = await db.insert(sourcesInvestigations).values({
      userId,
      query: body.query,
      state: body.state || {},
    }).returning();

    return Response.json(record);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
