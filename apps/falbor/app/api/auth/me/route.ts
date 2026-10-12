import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { users, marketerProfiles } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    // Check if the user has a marketer profile
    const [marketerProfile] = await db
      .select({ id: marketerProfiles.id })
      .from(marketerProfiles)
      .where(eq(marketerProfiles.userId, userId))
      .limit(1);
      
    const effectiveRole = marketerProfile ? "marketer" : user?.role;

    if (!user || !user.isVerified) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: { 
        id: user.id, 
        email: user.email, 
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
        stats: user.stats,
        balance: user.balance,
        role: effectiveRole
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
