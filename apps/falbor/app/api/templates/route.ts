import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { templates, users } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser, requireChatAccess } from '~/lib/auth/auth-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = db
      .select({
        template: templates,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(templates)
      .leftJoin(users, eq(templates.userId, users.id));

    if (userId) {
      query = query.where(eq(templates.userId, userId)) as any;
    }

    const rawData = await query;
    const data = rawData.map((row: any) => ({
      ...row.template,
      user: row.user
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('List templates error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    const body = await request.json();
    const { name, shortDescription, description, categories, mainImage, images, chatId } = body;

    if (!name || !shortDescription || !chatId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await requireChatAccess(chatId);

    const existingTemplate = await db.select().from(templates).where(
      and(
        eq(templates.chatId, chatId),
        eq(templates.userId, userId)
      )
    ).limit(1);

    let newTemplate;

    if (existingTemplate.length > 0) {
      newTemplate = await db.update(templates).set({
        name,
        shortDescription,
        description,
        categories: JSON.stringify(categories || []),
        mainImage,
        images: JSON.stringify(images || []),
      }).where(eq(templates.id, existingTemplate[0].id)).returning();
    } else {
      newTemplate = await db.insert(templates).values({
        userId,
        name,
        shortDescription,
        description,
        categories: JSON.stringify(categories || []),
        mainImage,
        images: JSON.stringify(images || []),
        chatId,
      }).returning();
    }

    return NextResponse.json({ success: true, data: newTemplate[0] });
  } catch (error: any) {
    console.error('Create template error:', error);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}
