import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { templates, users, templateReviews } from '~/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [template] = await db
      .select({
        id: templates.id,
        name: templates.name,
        shortDescription: templates.shortDescription,
        description: templates.description,
        mainImage: templates.mainImage,
        images: templates.images,
        url: templates.url,
        createdAt: templates.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(templates)
      .leftJoin(users, eq(templates.userId, users.id))
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    console.error('Get template error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
