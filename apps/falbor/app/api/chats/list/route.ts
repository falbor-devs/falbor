import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { chats, hackingChats } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withSecurity } from '~/lib/security';
import { getUserId } from '~/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const listGet = withSecurity(async ({ request }) => {
  try {
    const userId = await getUserId(request as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const list1 = await db.select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt
    })
    .from(chats)
    .where(eq(chats.userId, userId));

    const list2 = await db.select({
      id: hackingChats.id,
      title: hackingChats.title,
      createdAt: hackingChats.createdAt
    })
    .from(hackingChats)
    .where(eq(hackingChats.userId, userId));

    const combined = [...list1, ...list2].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ success: true, data: combined });
  } catch (error: any) {
    console.error('List chats error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

export async function GET(request: Request) {
  return listGet({ request, context: { env: process.env as any } });
}

