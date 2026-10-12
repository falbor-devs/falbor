"use server";

import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function getUserBusinessProfile() {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return null;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        displayEmail: users.displayEmail,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    return user || null;
  } catch (e) {
    console.error("Failed to fetch user business profile:", e);
    return null;
  }
}

export async function updateUserBusinessProfile(data: {
  displayName?: string;
  bio?: string;
  phone?: string;
  displayEmail?: boolean;
  displayPhone?: boolean;
}) {
  try {
    const token = cookies().get("session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.userId) return { error: "Unauthorized" };

    const updateData: any = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.displayEmail !== undefined) updateData.displayEmail = data.displayEmail;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, payload.userId));

    return { success: true };
  } catch (e) {
    console.error("Failed to update user business profile:", e);
    return { error: "Failed to update profile" };
  }
}
