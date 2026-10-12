import { db } from "~/lib/db";
import { users } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email: string };

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "No account found with this email address." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!user.passwordHash) {
      return new Response(
        JSON.stringify({
          error: "This email is associated with a Google account. Please log in with Google.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db
      .update(users)
      .set({
        verificationCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: "Falbor <noreply@falbor.xyz>",
          to: normalizedEmail,
          subject: "Reset your Falbor password",
          html: `
            <div style="font-family:sans-serif;padding:20px;max-width:600px;margin:0 auto;border:1px solid #eaeaea;border-radius:8px;">
              <h2 style="color:#6b21a8;text-align:center;">
                Reset Password Code
              </h2>
              <p>
                We received a request to reset your Falbor account password.
                Please use the following 6-digit verification code:
              </p>
              <div style="font-size:32px;font-weight:bold;text-align:center;letter-spacing:4px;padding:15px 0;color:#111;">
                ${verificationCode}
              </div>
              <p style="color:#666;font-size:14px;">
                If you did not request a password reset, please ignore this email.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Failed to send password reset email via Resend:", err);
      }
    }

    console.log(`[PASSWORD RESET] Verification code for ${normalizedEmail}: ${verificationCode}`);

    return new Response(
      JSON.stringify({ success: true, email: normalizedEmail }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send reset code error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
