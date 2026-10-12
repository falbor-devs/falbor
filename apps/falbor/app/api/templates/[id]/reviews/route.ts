import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { templateReviews, users, templates } from '~/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireUser } from '~/lib/auth/auth-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const reviews = await db
      .select({
        id: templateReviews.id,
        rating: templateReviews.rating,
        content: templateReviews.content,
        likes: templateReviews.likes,
        dislikes: templateReviews.dislikes,
        createdAt: templateReviews.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(templateReviews)
      .leftJoin(users, eq(templateReviews.userId, users.id))
      .where(eq(templateReviews.templateId, id))
      .orderBy(desc(templateReviews.createdAt));

    return NextResponse.json({ success: true, data: reviews });
  } catch (error: any) {
    console.error('List template reviews error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { rating, content } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid rating (1-5) is required' }, { status: 400 });
    }

    const userId = await requireUser();

    // Check if template exists
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create review
    const [newReview] = await db
      .insert(templateReviews)
      .values({
        templateId: id,
        userId,
        rating,
        content,
      })
      .returning();

    return NextResponse.json({ success: true, data: newReview });
  } catch (error: any) {
    console.error('Create template review error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
