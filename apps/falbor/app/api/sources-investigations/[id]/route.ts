import { NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { sourcesInvestigations } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

// GET a specific investigation
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId(request as unknown as NextRequest);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [record] = await db
      .select()
      .from(sourcesInvestigations)
      .where(
        and(
          eq(sourcesInvestigations.id, params.id),
          eq(sourcesInvestigations.userId, userId)
        )
      );

    if (!record) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json(record);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH update state of an investigation
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId(request as unknown as NextRequest);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Ensure the record belongs to the user
    const [existing] = await db.select().from(sourcesInvestigations).where(
      and(
        eq(sourcesInvestigations.id, params.id),
        eq(sourcesInvestigations.userId, userId)
      )
    );

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const [updated] = await db.update(sourcesInvestigations)
      .set({
        state: body.state,
        updatedAt: new Date(),
      })
      .where(eq(sourcesInvestigations.id, params.id))
      .returning();

    return Response.json(updated);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
