'use server'

import { db } from '~/lib/db';
import { sourcePosts } from '~/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

export type SourcePost = {
  id: string;
  workspaceId: string;
  sourceId: string;
  platform: string;
  title: string;
  hook: string | null;
  body: string;
  callToAction: string | null;
  hashtags: string[];
  status: string;
  createdAt: string;
};

async function getUserId() {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user?.id || null;
}

const toSourcePost = (row: typeof sourcePosts.$inferSelect): SourcePost => ({
  id: row.id,
  workspaceId: row.workspaceId,
  sourceId: row.sourceId,
  platform: row.platform,
  title: row.title,
  hook: row.hook,
  body: row.body,
  callToAction: row.callToAction,
  hashtags: Array.isArray(row.hashtags) ? (row.hashtags as string[]) : [],
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

export async function getSourcePosts(workspaceId: string, sourceId: string): Promise<SourcePost[]> {
  const userId = await getUserId();
  if (!userId) return [];

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId)) {
    return [];
  }

  const rows = await db
    .select()
    .from(sourcePosts)
    .where(
      and(
        eq(sourcePosts.workspaceId, workspaceId),
        eq(sourcePosts.sourceId, sourceId),
        eq(sourcePosts.userId, userId),
      ),
    )
    .orderBy(desc(sourcePosts.createdAt));

  return rows.map(toSourcePost);
}

export async function updateSourcePostStatus(postId: string, status: 'draft' | 'published'): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
    return false;
  }

  await db
    .update(sourcePosts)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(sourcePosts.id, postId), eq(sourcePosts.userId, userId)));

  return true;
}
