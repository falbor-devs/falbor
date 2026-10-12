import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db
    .select({
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
      profileApps: users.profileApps,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    username: user.username || user.displayName || "",
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
    profileApps: user.profileApps || [],
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { 
    username, bio, avatar, cover, timezone, displayEmail, 
    instagram, linkedin, twitter, customLinks,
    location, statusMessage, skills, profileApps 
  } = body;

  const updateData: any = {};
  if (username !== undefined) {
    updateData.username = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  }
  if (bio !== undefined) updateData.bio = bio;
  if (avatar !== undefined) updateData.avatarUrl = avatar;
  if (cover !== undefined) updateData.coverUrl = cover;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (displayEmail !== undefined) updateData.displayEmail = displayEmail;
  if (instagram !== undefined) updateData.instagramUrl = instagram;
  if (linkedin !== undefined) updateData.linkedinUrl = linkedin;
  if (twitter !== undefined) updateData.twitterUrl = twitter;
  if (customLinks !== undefined) updateData.customLinks = customLinks;
  if (location !== undefined) updateData.location = location;
  if (statusMessage !== undefined) updateData.statusMessage = statusMessage;
  if (skills !== undefined) updateData.skills = skills;
  if (profileApps !== undefined) updateData.profileApps = profileApps;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true });
  }

  await db
    .update(users)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
