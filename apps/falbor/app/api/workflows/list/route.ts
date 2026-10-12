import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { workflows } from '~/lib/db/schema';
import { desc, eq, isNull, or } from 'drizzle-orm';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  headers(); // Force dynamic execution
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    let query = db.select().from(workflows).$dynamic();
    
    if (chatId) {
      query = query.where(eq(workflows.chatId, chatId));
    }

    const list = await query.orderBy(desc(workflows.updatedAt));
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error('List workflows error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
