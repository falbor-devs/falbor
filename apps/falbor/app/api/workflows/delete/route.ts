import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workflows } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { workflowId } = await req.json();

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    await db.delete(workflows).where(eq(workflows.id, workflowId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete workflow error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
