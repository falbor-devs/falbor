"use server";

import { db } from "~/lib/db";
import { communityMessages, marketerProfiles, users } from "~/lib/db/schema";
import { eq, or, and, asc, desc, max } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function getRecentConversations() {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return [];

    const currentUserId = payload.userId;

    // Get all distinct user IDs where current user is sender or receiver
    const allUserMessages = await db
      .select({
        senderId: communityMessages.senderId,
        receiverId: communityMessages.receiverId,
        createdAt: communityMessages.createdAt,
      })
      .from(communityMessages)
      .where(
        or(
          eq(communityMessages.senderId, currentUserId),
          eq(communityMessages.receiverId, currentUserId)
        )
      )
      .orderBy(desc(communityMessages.createdAt));

    const partnerLastMessageTime = new Map<string, Date>();
    for (const msg of allUserMessages) {
      const partnerId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      if (!partnerLastMessageTime.has(partnerId)) {
        partnerLastMessageTime.set(partnerId, new Date(msg.createdAt));
      }
    }

    const partnerIds = Array.from(partnerLastMessageTime.keys());
    if (partnerIds.length === 0) return [];

    // Fetch details for these partners
    const profiles = await db
      .select({
        id: marketerProfiles.id,
        userId: marketerProfiles.userId,
        fullName: marketerProfiles.fullName,
        photoUrl: marketerProfiles.photoUrl,
        bio: marketerProfiles.bio,
      })
      .from(marketerProfiles);

    const userList = await db
      .select({
        id: users.id,
        fullName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        displayEmail: users.displayEmail,
      })
      .from(users);

    const conversations = partnerIds.map((partnerId) => {
      const profile = profiles.find((p) => p.userId === partnerId || p.id === partnerId);
      if (profile) return profile;

      const user = userList.find((u) => u.id === partnerId);
      return {
        id: partnerId,
        userId: partnerId,
        fullName: user?.fullName || user?.email?.split('@')[0] || 'Business Client',
        photoUrl: user?.avatarUrl || null,
        bio: user?.bio || 'Business Account',
        email: user?.displayEmail ? user?.email : null,
      };
    });

    // Sort by most recent message timestamp
    conversations.sort((a, b) => {
      const timeA = partnerLastMessageTime.get(a.userId || a.id)?.getTime() || 0;
      const timeB = partnerLastMessageTime.get(b.userId || b.id)?.getTime() || 0;
      return timeB - timeA;
    });

    return conversations;
  } catch (e) {
    console.error("Failed to fetch recent conversations:", e);
    return [];
  }
}

export async function getCommunityMessages(otherUserId: string) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return [];

    const messages = await db
      .select({
        id: communityMessages.id,
        senderId: communityMessages.senderId,
        receiverId: communityMessages.receiverId,
        content: communityMessages.content,
        createdAt: communityMessages.createdAt,
      })
      .from(communityMessages)
      .where(
        or(
          and(
            eq(communityMessages.senderId, payload.userId),
            eq(communityMessages.receiverId, otherUserId)
          ),
          and(
            eq(communityMessages.senderId, otherUserId),
            eq(communityMessages.receiverId, payload.userId)
          )
        )
      )
      .orderBy(asc(communityMessages.createdAt));

    return messages;
  } catch (e) {
    console.error("Failed to fetch community messages:", e);
    return [];
  }
}

export async function sendCommunityMessage(receiverUserId: string, content: string) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId || !content.trim()) return null;

    const [inserted] = await db
      .insert(communityMessages)
      .values({
        senderId: payload.userId,
        receiverId: receiverUserId,
        content: content.trim(),
      })
      .returning();

    return inserted;
  } catch (e) {
    console.error("Failed to send community message:", e);
    return null;
  }
}
