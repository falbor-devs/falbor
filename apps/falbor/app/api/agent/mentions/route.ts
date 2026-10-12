import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { brandMentionPosts } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

export async function GET(req: NextRequest) {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });

    try {
        const posts = await db
            .select()
            .from(brandMentionPosts)
            .where(eq(brandMentionPosts.workspaceId, workspaceId))
            .orderBy(desc(brandMentionPosts.createdAt))
            .limit(100);

        return NextResponse.json({ posts });
    } catch (err) {
        console.error('Failed to fetch brand mention posts:', err);
        return NextResponse.json({ posts: [] });
    }
}

export async function DELETE(req: NextRequest) {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });

    try {
        const authUser = await getAuthUserDetails();
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await db.delete(brandMentionPosts).where(eq(brandMentionPosts.workspaceId, workspaceId));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to delete brand mention posts:', err);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
