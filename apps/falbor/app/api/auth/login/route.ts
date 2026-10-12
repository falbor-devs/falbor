import { db } from "~/lib/db";
import { users, marketerProfiles } from "~/lib/db/schema";
import { verifyPassword, createToken, SESSION_DURATION_DAYS } from "~/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email: string; password: string };

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.passwordHash) {
      return new Response(JSON.stringify({ error: "This account was created with Google. Please sign in with Google." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.isVerified) {
      return new Response(JSON.stringify({ error: "Verification required", requiresVerification: true }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}