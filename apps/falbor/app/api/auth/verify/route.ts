import { db } from "~/lib/db";
import { users, marketerProfiles } from "~/lib/db/schema";
import { createToken, SESSION_DURATION_DAYS } from "~/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email, code } = (await request.json()) as { email: string; code: string };

    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and verification code are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (user.isVerified) {
      return new Response(JSON.stringify({ error: "This email is already verified" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (user.verificationCode !== code.trim()) {
      return new Response(JSON.stringify({ error: "Invalid verification code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mark as verified and clear code
    await db.update(users)
      .set({
        isVerified: true,
        verificationCode: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    const [marketerProfile] = await db
      .select({ id: marketerProfiles.id })
      .from(marketerProfiles)
      .where(eq(marketerProfiles.userId, user.id))
      .limit(1);
      
    const effectiveRole = marketerProfile ? "marketer" : user.role;

    const token = await createToken(user.id, effectiveRole || undefined);
    const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60;
    const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    const cookieFlags = isProduction
      ? `HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}`
      : `HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}`;

    const body = JSON.stringify({
      user: { id: user.id, email: user.email, displayName: user.displayName, role: effectiveRole },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `session=${token}; ${cookieFlags}`,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
