'use server'

import { db } from '~/lib/db'
import { v4 } from 'uuid'
import { chatFolders, chats } from '~/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getAuthUserDetails } from '~/lib/visual-editor/queries'

async function getUserId() {
  const authUser = await getAuthUserDetails()
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  })
  return user?.id || null;
}

export async function createFolder(name: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const id = v4();
  await db.insert(chatFolders).values({
    id,
    userId,
    name,
  });
  return id;
}

export async function moveChatToFolder(chatId: string, folderId: string | null) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  await db.update(chats)
    .set({ folderId })
    .where(eq(chats.id, chatId));

  return true;
}

export async function getChatsAndFolders() {
  const userId = await getUserId();
  if (!userId) return { folders: [], chats: [], publishedStatus: {} };

  const userFolders = await db.query.chatFolders.findMany({
    where: (folders, { eq }) => eq(folders.userId, userId),
    orderBy: [desc(chatFolders.createdAt)],
  });

  const userChats = await db.query.chats.findMany({
    where: (chatRecords, { eq }) => eq(chatRecords.userId, userId),
    orderBy: [desc(chats.createdAt)],
  });

  return { folders: userFolders, chats: userChats, publishedStatus: {} };
}