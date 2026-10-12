import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { hashPassword } from "~/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email, code, password } = (await request.json()) as {
      email: string;
      code: string;
      password: string;
    };

    if (!email || !code || !password) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!user.verificationCode || user.verificationCode !== cleanCode) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const newPasswordHash = await hashPassword(password);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        verificationCode: null,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
