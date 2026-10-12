import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { generatedImages } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const images = await db.select()
      .from(generatedImages)
      .where(eq(generatedImages.userId, userId))
      .orderBy(desc(generatedImages.createdAt));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error fetching generated images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, imageUrl } = body;

    if (!prompt || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newImage] = await db.insert(generatedImages).values({
      userId,
      prompt,
      imageUrl,
    }).returning();

    return NextResponse.json({ image: newImage });
  } catch (error) {
    console.error('Error saving generated image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
