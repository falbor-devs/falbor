import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '~/lib/auth';
import { db } from '~/lib/db';
import { skills } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSkills = await db.select().from(skills).where(eq(skills.userId, userId)).orderBy(skills.createdAt);

    return NextResponse.json({ skills: userSkills });
  } catch (error) {
    console.error('Error fetching skills:', error);
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
    const { id, name, description, content, isActive, createdAt } = body;

    if (!id || !name || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newSkill] = await db.insert(skills).values({
      id,
      userId,
      name,
      description,
      content,
      isActive: isActive || false,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({ skill: newSkill });
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, content, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const [updatedSkill] = await db.update(skills)
      .set({
        name,
        description,
        content,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(skills.id, id), eq(skills.userId, userId)))
      .returning();

    return NextResponse.json({ skill: updatedSkill });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await db.delete(skills).where(and(eq(skills.id, id), eq(skills.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
