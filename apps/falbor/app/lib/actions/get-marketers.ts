"use server";

import { db } from "~/lib/db";
import { marketerProfiles, users } from "~/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getMarketersList() {
  try {
    const list = await db
      .select({
        id: marketerProfiles.id,
        userId: marketerProfiles.userId,
        fullName: marketerProfiles.fullName,
        photoUrl: marketerProfiles.photoUrl,
        bio: marketerProfiles.bio,
      })
      .from(marketerProfiles);

    if (list.length > 0) {
      return list;
    }

    // Fallback: search users with role 'marketer' if marketerProfiles table is not populated yet
    const marketerUsers = await db
      .select({
        id: users.id,
        userId: users.id,
        fullName: users.displayName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, 'marketer'));

    return marketerUsers.map(u => ({
      id: u.id,
      userId: u.userId,
      fullName: u.fullName || u.email?.split('@')[0] || 'Marketer',
      photoUrl: null,
      bio: 'Marketer Professional',
    }));
  } catch (e) {
    console.error("Failed to get marketers list:", e);
    return [];
  }
}
