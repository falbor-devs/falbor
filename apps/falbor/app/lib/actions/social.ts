'use server'

import { db } from '~/lib/db';
import { creatorConnectedAccounts } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';

async function getUserId() {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user?.id || null;
}

export type SocialAccountItem = {
  id: string;
  platform: 'Twitter' | 'Reddit' | 'LinkedIn';
  platformUsername: string;
  platformEmail?: string | null;
  autoPublish: boolean;
  postsPerDay: number;
  intervalMinutes: number;
  createdAt: Date;
};

export async function getConnectedSocialAccounts(): Promise<SocialAccountItem[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const rows = await db.query.creatorConnectedAccounts.findMany({
    where: (creatorConnectedAccounts, { eq }) => eq(creatorConnectedAccounts.userId, userId),
  });

  return rows as unknown as SocialAccountItem[];
}

export async function updateSocialAccountSettings(
  accountId: string,
  settings: { autoPublish?: boolean; postsPerDay?: number; intervalMinutes?: number }
) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  await db.update(creatorConnectedAccounts)
    .set({
      ...settings,
      updatedAt: new Date(),
    })
    .where(and(eq(creatorConnectedAccounts.id, accountId), eq(creatorConnectedAccounts.userId, userId)));
}

export async function disconnectSocialAccount(accountId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  await db.delete(creatorConnectedAccounts)
    .where(and(eq(creatorConnectedAccounts.id, accountId), eq(creatorConnectedAccounts.userId, userId)));
}
