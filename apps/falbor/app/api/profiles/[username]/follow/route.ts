import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { users, follows } from "~/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "~/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const currentUserId = await getUserId(request);
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the target user ID
  let rawUsername = params.username;
  if (rawUsername.startsWith('@')) {
    rawUsername = rawUsername.substring(1);
  }
  const decodedUsername = decodeURIComponent(rawUsername);

  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, decodedUsername))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  if (targetUser.id === currentUserId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  try {
    // Check if already following
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUser.id)))
      .limit(1);

    if (existingFollow) {
      // Unfollow
      await db
        .delete(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUser.id)));
        
      return NextResponse.json({ success: true, isFollowing: false });
    } else {
      // Follow
      await db
        .insert(follows)
        .values({
          followerId: currentUserId,
          followingId: targetUser.id,
        });
        
      return NextResponse.json({ success: true, isFollowing: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
