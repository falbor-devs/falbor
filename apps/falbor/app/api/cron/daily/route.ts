import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { cronRuns, browserSessions } from '~/lib/db/schema';
import { eq, lt } from 'drizzle-orm';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Idempotency check: enforce once-per-day
    const existingRun = await db.query.cronRuns.findFirst({
      where: eq(cronRuns.runDate, todayStr),
    });

    if (existingRun) {
      return NextResponse.json({ success: true, message: 'Cron already executed today' });
    }

    // Acquire lock
    await db.insert(cronRuns).values({
      cronName: 'daily',
      runDate: todayStr,
    });

    // 2. Perform daily cleanups
    // Cleanup expired browser sessions
    const now = new Date();
    // In postgres, lt check works perfectly
    const deletedSessions = await db.delete(browserSessions).where(lt(browserSessions.expiresAt, now)).returning();

    return NextResponse.json({
      success: true,
      message: 'Cron executed successfully',
      cleanups: {
        deletedSessions: deletedSessions.length,
      },
    });
  } catch (error: unknown) {
    console.error('Daily cron failed');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
