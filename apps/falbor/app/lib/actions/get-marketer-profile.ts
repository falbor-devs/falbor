"use server";

import { db } from "~/lib/db";
import { marketerProfiles } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "~/lib/auth";

export async function getMarketerProfileData(userId?: string) {
  try {
    let targetUserId = userId;

    if (!targetUserId) {
      const token = cookies().get("session")?.value;
      const payload = token ? await verifyToken(token) : null;
      if (!payload?.userId) return null;
      targetUserId = payload.userId;
    }

    const [profile] = await db
      .select()
      .from(marketerProfiles)
      .where(eq(marketerProfiles.userId, targetUserId))
      .limit(1);

    if (!profile) return null;

    return {
      fullName: profile.fullName || '',
      photoUrl: profile.photoUrl || '',
      bio: profile.bio || '',
      yearsOfExperience: profile.yearsOfExperience ? String(profile.yearsOfExperience) : '',
      age: profile.age ? String(profile.age) : '',
      phone: profile.phone || '',
      showEmail: Boolean(profile.showEmail),
      location: profile.location || '',
      specialties: (profile.specialties as string[]) || [],
      linkedinUrl: profile.linkedinUrl || '',
      twitterUrl: profile.twitterUrl || '',
      instagramUrl: profile.instagramUrl || '',
    };
  } catch (e) {
    console.error("Failed to fetch marketer profile data:", e);
    return null;
  }
}
