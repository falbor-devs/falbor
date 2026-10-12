import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { users, follows } from "~/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "~/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  // Extract username from params, handle the optional '@' prefix
  let rawUsername = params.username;
  if (rawUsername.startsWith('@')) {
    rawUsername = rawUsername.substring(1);
  }
  // URL decode in case there are spaces or special characters
  const decodedUsername = decodeURIComponent(rawUsername);
  
  // Get logged in user to check follow status
  const currentUserId = await getUserId(request);

  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        coverUrl: users.coverUrl,
        timezone: users.timezone,
        displayEmail: users.displayEmail,
        instagramUrl: users.instagramUrl,
        linkedinUrl: users.linkedinUrl,
        twitterUrl: users.twitterUrl,
        customLinks: users.customLinks,
        location: users.location,
        statusMessage: users.statusMessage,
        skills: users.skills,
        badges: users.badges,
        stats: users.stats,
        subscriptionTier: users.subscriptionTier,
      })
      .from(users)
      .where(eq(users.username, decodedUsername))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const [followRecord] = await db
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, user.id)))
        .limit(1);
      
      if (followRecord) {
        isFollowing = true;
      }
    }

    return NextResponse.json({
      id: user.id,
      username: user.username || user.displayName || "", // fallback to displayName for legacy
      displayName: user.displayName || "",
      avatar: user.avatarUrl || "",
      bio: user.bio || "",
      cover: user.coverUrl || "",
      timezone: user.timezone || "",
      displayEmail: user.displayEmail || false,
      instagram: user.instagramUrl || "",
      linkedin: user.linkedinUrl || "",
      twitter: user.twitterUrl || "",
      customLinks: user.customLinks || [],
      location: user.location || "",
      statusMessage: user.statusMessage || "",
      skills: user.skills || [],
      badges: user.badges || [],
      stats: user.stats || { followers: 0, following: 0, views: 0 },
      subscriptionTier: user.subscriptionTier || "free",
      isFollowing,
    });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
